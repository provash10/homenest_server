const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("homenest_user_db");
    const propertiesCollection = db.collection("properties");
    const ratingsCollection = db.collection("ratings");

    //properties api
    app.get("/properties", async (req, res) => {

      const email = req.query.email;
      const query = {}
      if(email){
        query.email = email;
      }
      const result = await propertiesCollection.find(query).toArray();

      res.send(result);
    });

    //featured data sorting -Home
    app.get("/featured-properties", async (req, res) => {
      const result = await propertiesCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      console.log(result);

      res.send(result);
    });

    // for my properties
    app.get("/my-properties/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      const result = await propertiesCollection.find({ userEmail: email }).toArray();

      res.send(result);
    });

    app.get("/properties/:id", async (req, res) => {
      const { id } = req.params;
      console.log(id); //checked

      const objectId = new ObjectId(id);
      const result = await propertiesCollection.findOne({ _id: objectId });

      res.send({
        success: true,
        result,
      });
    });

    app.post("/properties", async (req, res) => {
      const properties = req.body;

      console.log(properties);
      if (!properties || Object.keys(properties).length === 0) {
        return res
          .status(400)
          .send({ success: false, message: "No data received" });
      }
      const result = await propertiesCollection.insertOne(properties);
      res.send({
        success: true,
        result,
      });
    });

    app.put("/properties/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      // console.log(id)
      // console.log(data)
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await propertiesCollection.updateOne(filter, update);

      res.send({
        success: true,
        result,
      });
    });

    app.delete("/properties/:id", async (req, res) => {
      const { id } = req.params;

      const objectId = new ObjectId(id);
      // const filter = {_id: objectId}

      const result = await propertiesCollection.deleteOne({ _id: objectId });
      res.send({
        success: true,
      });
    });

    //ratings
    app.get('/ratings', async(req, res)=>{
      
       const result = await ratingsCollection.find().toArray();

      res.send(result);
    })

    //my-ratings
    app.get( "/my-ratings/:email", async (req, res) => {
 
    const email = req.params.email;
    const result = await ratingsCollection.find({ userEmail: email }).toArray();
    res.send(result);
  })

   app.post("/ratings", async (req, res) => {
      const ratings = req.body;

      console.log(ratings);
      
      if (!ratings || Object.keys(ratings).length === 0) {
        return res
          .status(400)
          .send({ success: false, message: "No data received" });
      }

       if (!ratings.userEmail || !ratings.propertyId || !ratings.rating) {
      return res.status(400).send({ success: false, message: "Missing required fields" });
    }

      const result = await ratingsCollection.insertOne(ratings);
      res.send({
        success: true,
        result,
      });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Home Nest Server is running !!!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
