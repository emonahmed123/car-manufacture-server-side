const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port =process.env.PORT ||5000

app.use(cors());
app.use(express.json());



const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nd7qh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
 console.log(uri)
 async function run(){
     
  try{
        await client.connect();
        const partCollection =client.db('car_parts').collection('Parts')
        const bookingCollection =client.db('car_parts').collection('bookings')
        const userCollection =client.db('car_parts').collection('users')
       
       
       app.get('/part',async(req,res)=>{
        const query={};
        const cursor=partCollection.find(query)
        const parts = await cursor.toArray()
        res.send(parts)
       });
       app.get('/part/:id',async(req,res)=>{
        const id =req.params.id;
        const query ={_id:ObjectId(id)}
        const part = await partCollection.findOne(query) 
        res.send(part) 
      });
         
              app.get('/booking',async(req,res)=>{
                 const user =req.query.user;
                 const query={user:user}
                 const bookings= await bookingCollection.find(query).toArray()
                 res.send(bookings);

              });


        app.post ('/booking',async(req,res)=>{
              const booking=req.body;
              const result=await bookingCollection.insertOne(booking)
              res.send(result)
        })
      
      
        app.put('/user/:email',async(req,res)=>{
          const email = req.params.email;
          const user = req.body
          const filter = {email: email};
          const options ={upsert: true};
           const updateDoc ={
             $set : user,
           };
           const result =await userCollection.updateOne(filter, updateDoc , options)
          const token =jwt.sign({email:email}, process.env.ACCESS_TOKEN,)
           res.send({result,token});
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