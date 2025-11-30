const express = require ('express')
const cors = require('cors');
const app = express()
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.znmkoxj.mongodb.net/?appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('homenest_user_db');
    const propertiesCollection = db.collection('properties');

    //properties api
    app.get('/properties', async(req, res)=>{
        const result = await propertiesCollection.find().toArray()

        res.send(result)
    })

    app.get('/properties/:id', async(req, res)=>{
      const {id} = req.params;
      console.log(id); //checked

      const objectId = new ObjectId(id)
      const result =await propertiesCollection.findOne({_id: objectId})

      res.send({
        success: true,
        result
        
      })
    })

    app.post('/properties', async(req, res)=>{
        const properties = req.body;

        console.log(properties);
        if(!properties || Object.keys(properties).length === 0){
        return res.status(400).send({ success: false, message: "No data received" });
    }
        const result = await propertiesCollection.insertOne(properties);
        res.send({
          success: true,
          result
        });
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Home Nest Server is running !!!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
