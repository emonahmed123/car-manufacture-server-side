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



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nd7qh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  // console.log(authHeader)
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    //  console.log(decoded)
    console.log(err)

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
    const partCollection = client.db('car_parts').collection('Parts')
    const bookingCollection = client.db('car_parts').collection('bookings')
    const userCollection = client.db('car_parts').collection('users')
    const payementCollection = client.db('car_parts').collection('payments')





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
    app.delete('/part/:name', verifyJWT, async (req, res) => {
      const name = req.params.name
      const filter = { name: name }
      const data = await partCollection.deleteOne(filter)
      res.send(data)
    });

    app.post('/part', async (req, res) => {
      const part = req.body;
      const result = await partCollection.insertOne(part)
      res.send(result)

    });

  

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






    
    app.get('/booking', verifyJWT, async (req, res) => {
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
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    });
      //  patch for payement store database
    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id;
     
      const filter = {_id:ObjectId(id) };
      const payment = req.body;
      const updateDoc = {
        $set: {
          paid: true,
          
          transactionId: payment.transactionId
          
        }
      }
      const result = await payementCollection.insertOne(payment)
      const updateBooking = await bookingCollection.updateOne(filter, updateDoc)

      res.send(updateDoc)
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