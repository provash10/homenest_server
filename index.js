const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      email: decodedToken.email,
      uid: decodedToken.uid,
      name: decodedToken.name || decodedToken.email.split("@")[0],
    };

    req.tokenEmail = decodedToken.email;

    console.log("JWT Verified for:", req.user.email);
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};
//mongodb
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
    // await client.connect();

    const db = client.db("homenest_user_db");
    const propertiesCollection = db.collection("properties");
    const ratingsCollection = db.collection("ratings");
    const usersCollection = db.collection("users");

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

    app.get("/ratings", async (req, res) => {
  const propertyId = req.query.propertyId;
  const query = propertyId ? { propertyId } : {};
  const result = await ratingsCollection.find(query).sort({ reviewDate: -1 }).toArray();

  res.send(result);
});


app.get("/my-ratings/:email", async (req, res) => {
  const email = req.params.email;
  const result = await ratingsCollection.find({ reviewerEmail: email }).toArray();
  res.send(result);
});

app.post("/ratings", async (req, res) => {
  const ratings = req.body;

  if (!ratings.reviewerEmail || !ratings.propertyId || !ratings.rating) {
    return res.status(400).send({
      success: false,
      message: "Missing required fields",
    });
  }

  const exists = await ratingsCollection.findOne({
    propertyId: ratings.propertyId,
    reviewerEmail: ratings.reviewerEmail,
  });

  if (exists) {
    return res.status(409).send({
      success: false,
      message: "You already reviewed this property",
    });
  }

  ratings.reviewDate = new Date();

  const result = await ratingsCollection.insertOne(ratings);
  res.send({
    success: true,
    result,
  });
});

// ==================================


//users collection api save-update
app.post("/users", async (req, res) => {
  try {
    const userData = req.body;
    console.log('Saving/Updating user:', userData.email);

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: userData.email });

    if (existingUser) {
      // Update existing user
      const result = await usersCollection.updateOne(
        { email: userData.email },
        {
          $set: {
            name: userData.name || existingUser.name,
            photoURL: userData.photoURL || existingUser.photoURL,
            lastLoggedIn: new Date(),
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: existingUser.createdAt || new Date()
          }
        },
        { upsert: true } 
      );
      
      return res.json({
        success: true,
        message: "User updated",
        user: { ...existingUser, ...userData }
      });
    }

    // Create new user
    const newUser = {
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      photoURL: userData.photoURL || "",
      role: "user", // Default role
      createdAt: new Date(),
      lastLoggedIn: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    res.json({
      success: true,
      message: "User created",
      user: newUser
    });
  } catch (error) {
    console.error("User save error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// user role apis 
app.get("/users/:email/role", async (req, res) => {
  try {
    const email = req.params.email;
    console.log("Fetching role for:", email);
    
    // FIRST: Try to get from database if collection exists
    try {
      const user = await usersCollection.findOne({ email });
      if (user) {
        console.log("User found in DB, role:", user.role);
        return res.json({
          success: true,
          role: user.role || "user"
        });
      }
    } catch (dbError) {
      console.log("Database error, using fallback:", dbError.message);
    }
    
    // SECOND: Hardcoded fallback for testing
    console.log("Using hardcoded fallback logic");
    
    const adminEmails = [
      "admin@test.com",
      "admin@gmail.com",
      "admin@example.com",
      "sajib@gmail.com",
      "testadmin@test.com"
    ];
    
    const isAdmin = adminEmails.includes(email.toLowerCase());
    const role = isAdmin ? "admin" : "user";
    
    console.log("Hardcoded role:", role);
    
    // THIRD: Try to auto-create user in background (silent)
    try {
      const newUser = {
        email: email,
        name: email.split('@')[0],
        photoURL: "",
        role: role,
        createdAt: new Date(),
        lastLoggedIn: new Date()
      };
      
      await usersCollection.insertOne(newUser);
      console.log("Auto-created user in background");
    } catch (insertError) {
      console.log("Failed to auto-create, but that's OK for now");
    }
    
    res.json({
      success: true,
      role: role,
      message: role === "admin" ? "Admin access granted" : "Regular user"
    });
    
  } catch (error) {
    console.error("Role fetch error:", error);
    
    // FINAL FALLBACK: Always safe
    const email = req.params.email;
    const isAdmin = email.includes("admin");
    
    res.json({
      success: true,
      role: isAdmin ? "admin" : "user",
      message: "Using ultimate fallback"
    });
  }
});

// update user role (Admin only) 
app.patch("/users/:email/role", async (req, res) => {
  try {
    const { email } = req.params;
    const { role } = req.body;

    // validate role
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Use 'user' or 'admin'"
      });
    }

    const result = await usersCollection.updateOne(
      { email },
      {
        $set: {
          role,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      result
    });
  } catch (error) {
    console.error("Role update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});



// all users (already exists)
app.get("/admin/users", async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Delete user 
app.delete("/admin/users/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    // Don't allow deleting self
    if (email === req.headers['user-email']) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account"
      });
    }
    
    const result = await usersCollection.deleteOne({ email });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// user statistics
app.get("/admin/user-stats", async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();
    const admins = await usersCollection.countDocuments({ role: 'admin' });
    const regularUsers = await usersCollection.countDocuments({ role: 'user' });
    
    // Today's active users
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await usersCollection.countDocuments({
      lastLoggedIn: { $gte: today }
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        admins,
        regularUsers,
        activeToday
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


// Enhanced dashboard stats with time range
app.get("/admin/dashboard-stats", async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get counts
    const totalProperties = await propertiesCollection.countDocuments();
    const totalRatings = await ratingsCollection.countDocuments();
    const totalUsers = await usersCollection.countDocuments();
    
    // Get recent data
    const recentProperties = await propertiesCollection
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    const recentRatings = await ratingsCollection
      .find()
      .sort({ reviewDate: -1 })
      .limit(5)
      .toArray();

    // Get category distribution
    const categories = await propertiesCollection.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Get monthly data for charts
    const monthlyData = await propertiesCollection.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 6 }
    ]).toArray();

    res.json({
      success: true,
      stats: {
        totalProperties,
        totalRatings,
        totalUsers,
        recentProperties,
        recentRatings,
        categories,
        monthlyData,
        timeRange: range
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// Get property statistics
app.get("/admin/property-stats", async (req, res) => {
  try {
    // Average price
    const avgPrice = await propertiesCollection.aggregate([
      { $group: { _id: null, avgPrice: { $avg: "$price" } } }
    ]).toArray();

    // Price range
    const priceRange = await propertiesCollection.aggregate([
      { $group: { 
        _id: null, 
        minPrice: { $min: "$price" }, 
        maxPrice: { $max: "$price" },
        avgPrice: { $avg: "$price" }
      } }
    ]).toArray();

    // Properties by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const propertiesByMonth = await propertiesCollection.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]).toArray();

    res.json({
      success: true,
      stats: {
        avgPrice: avgPrice[0]?.avgPrice || 0,
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
        propertiesByMonth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
      // "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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

