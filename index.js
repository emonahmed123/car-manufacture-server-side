const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@application.i3zwrks.mongodb.net/?retryWrites=true&w=majority&appName=application`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  // console.log(authHeader)
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    //  console.log(decoded)


    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    // console.log(decoded)
    req.decoded = decoded;
    next();
  });
}


async function run() {
  try {
    await client.connect();
    console.log('runign database')
    const partCollection = client.db('car_parts').collection('Parts')
    const bookingCollection = client.db('car_parts').collection('bookings')
    const userCollection = client.db('car_parts').collection('users')
    const payementCollection = client.db('car_parts').collection('payments')
    const reviewCollection = client.db('car_parts').collection('reviews')




    //  handel  parts action

    app.get('/part', async (req, res) => {
      const query = {};
      const cursor = partCollection.find(query)
      const parts = await cursor.toArray()
      res.send(parts)
    });
    app.get('/part/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const part = await partCollection.findOne(query)
      res.send(part)
    });

    app.delete('/part/:id', verifyJWT, async (req, res) => {
      const name = req.params.id
      const filter = { _id: new ObjectId(name) }
      const data = await partCollection.deleteOne(filter)
      res.send(data)
    });
    app.patch('/part/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const fillter = { _id: new ObjectId(id) }
      const updateQuantity = req.body
      const value = parseInt(updateQuantity.availablequantity)
      const updateDoc = {
        $inc: { availablequantity: value }

      }
      const reslut = await partCollection.updateOne(fillter, updateDoc);
      if (reslut.modifiedCount === 1) {
        res.send({ success: true, message: 'Quantity updated successfully' });
      } else {
        res.send({ success: false, message: 'Quantity update failed' });
      }


    });

    app.post('/part', async (req, res) => {
      const part = req.body;
      const result = await partCollection.insertOne(part)
      res.send(result)

    });

    //  stripe payemnt method

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const part = req.body;
      const price = part.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({ clientSecret: paymentIntent.client_secret })
    });





    //  get booking using email

    app.get('/booking', verifyJWT, viewCount, async (req, res) => {
      const user = req.query.user;
      const decodeEmail = req.decoded.email

      if (decodeEmail === user) {
        const query = { user: user }
        const booking = await bookingCollection.find(query).toArray()
        res.send(booking);
      }
      else {
        return res.status(403).send({ message: 'Forbidden access' })
      }



    });

    // sure to booking
    app.get('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollection.findOne(query)
      res.send(booking)

    })


    //  user booking
    app.post('/booking', verifyJWT, async (req, res) => {
      const booking = req.body;
      console.log(booking)
      const fillter = { _id: new ObjectId(booking.partId) }

      console.log(fillter)
      const currentPart = await partCollection.findOne(fillter);


      console.log(currentPart)

      const updateDoc = {
        $inc: { availablequantity: -parseInt(booking.orderQuentey) }
      }

      const newdata = await partCollection.updateOne(fillter, updateDoc)
      const result = await bookingCollection.insertOne(booking)
      res.send(result)


    });
    //  patch for payement store database
    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      const payment = req.body;
      const updateDoc = {
        $set: {

          transactionId: payment.transactionId

        }
      }
      const result = await payementCollection.insertOne(payment)
      const updateBooking = await bookingCollection.updateOne(filter, updateDoc)

      res.send(updateDoc)
    });

    app.get('/bookingall', verifyJWT, async (req, res) => {
      const query = {}
      const cursor = (query);
      const result = await bookingCollection.find({}).toArray()
      res.send(result)
    })
    app.delete('/booking/:id', verifyJWT, async (req, res) => {
      const name = req.params.id
      const filter = { _id: new ObjectId(name) }
      const data = await bookingCollection.deleteOne(filter)
      res.send(data)
    });
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options)
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN,)
      res.send({ result, token });
    });

    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });




    app.put('/user/admin/:email', verifyJWT, async (req, res) => {

      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });

      }
    });

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email
      const user = await userCollection.findOne({ email: email })
      const isAdmin = user.role === 'admin'
      res.send({ admin: isAdmin })

    })


    //review

    app.post("/review", async (req, res) => {

      const review = req.body;

      const reslut = await reviewCollection.insertOne(review)

      res.send(reslut)

    })

    app.get('/review', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query)
      const parts = await cursor.toArray()
      res.send(parts)
    });


  }

  finally {

  }
}
run().catch(console.dir);
























app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})