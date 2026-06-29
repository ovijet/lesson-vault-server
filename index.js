const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("server in running");
});

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


// const verifyToken= async(req,res,next)=>{
//     const auth=req.headers.authorization
  
//     const token=auth.split(' ')[1]
    
//     console.log(token,'xxxx');
         
// }


client
  .connect(() => {
    console.log("mongo dbbbbbbbbb");
  })
  .catch(console.dir);





const db = client.db("lessonVault");
const subscriptionsCollection = db.collection("subscriptions");
const userCollection = db.collection("user");
const addLesson = db.collection("addLesson");
const commentsCollection = db.collection("comments");
const favoriteCollection = db.collection("favorites");
const reportsCollection = db.collection("reports");


app.get("/top-contributors", async (req, res) => {
  try {
    const topContributors = await addLesson.aggregate([
  
      {
        $group: {
          _id: "$userEmail", 
          totalLessons: { $sum: 1 },
          allLessons: { $push: { title: "$title" } },
          
          backupName: { $first: "$userName" } 
        }
      },
     
      { $sort: { totalLessons: -1 } },
      { $limit: 3 },
     
      {
        $lookup: {
          from: "user", 
          localField: "_id",
          foreignField: "email", 
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      
      {
        $project: {
          _id: { $ifNull: ["$userDetails._id", "$_id"] },
          
          name: { 
            $ifNull: [
              "$userDetails.name", 
              "$backupName",
              { $arrayElemAt: [{ $split: ["$_id", "@"] }, 0] } 
            ] 
          },
          email: "$_id",
          
          image: { 
            $ifNull: [
              "$userDetails.image", 
              "$userDetails.photoURL", 
              "$userDetails.avatar",
              "https://api.dicebear.com/7.x/adventurer/svg?seed=Ovi" 
            ] 
          },
          totalLessons: 1,
          topLessonTitle: { $arrayElemAt: ["$allLessons.title", 0] }
        }
      }
    ]).toArray();

    res.status(200).send(topContributors);
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
});

app.post('/reports', async (req, res) => {
  try {
    const { lessonId, title, email } = req.body;

    if (!lessonId || !email) {
      return res.status(400).json({ message: "Lesson ID and Email are required!" });
    }

    // অলরেডি রিপোর্ট করেছে কিনা চেক করা (MongoDB Driver syntax)
    const alreadyReported = await reportsCollection.findOne({ lessonId, email });
    if (alreadyReported) {
      return res.status(400).json({ message: "You have already reported this lesson!" });
    }

    // নতুন রিপোর্টের অবজেক্ট তৈরি
    const newReport = {
      lessonId,
      lessonTitle: title, // আপনার এডমিন পেজের "lessonTitle" প্রপার্টির সাথে মিল রাখার জন্য
      email,
      createdAt: new Date()
    };

    // ডেটাবেজে ইনসার্ট করা
    const result = await reportsCollection.insertOne(newReport);

    return res.status(201).json({ 
      success: true, 
      message: "Reported successfully!", 
      insertedId: result.insertedId 
    });

  } catch (error) {
    console.error("Report Server Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

app.patch('/users/toggle-role/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid User ID format" });
    }

    const filter = { _id: new ObjectId(id) };
    
    
    const user = await userCollection.findOne(filter);
    
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

  
    const currentRole = user.role?.trim().toLowerCase();
    const newRole = currentRole === 'admin' ? 'User' : 'Admin';

    const updateDoc = {
      $set: { role: newRole },
    };

    const result = await userCollection.updateOne(filter, updateDoc);
    
    if (result.modifiedCount > 0) {
      res.send({ success: true, newRole: newRole });
    } else {
      res.status(400).send({ message: "Failed to update role" });
    }
    
  } catch (error) {
    console.error("Error toggling user role:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});


app.get("/admin/reported-lessons", async (req, res) => {
  try {
    // সব রিপোর্ট নিয়ে এসে নতুন থেকে পুরাতন ক্রমানুসারে (Descending order) সাজানো হবে
    const result = await reportsCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    console.error("GET Reports Error:", error);
    res.status(500).send({ message: "Failed to fetch reported lessons" });
  }
});


app.post("/favorites", async (req, res) => {
  try {
    const favoriteData = req.body;
    if (!favoriteData.email || !favoriteData.lessonId) {
      return res
        .status(400)
        .send({ message: "Missing required fields (email or lessonId)" });
    }

    const alreadyExists = await favoriteCollection.findOne({
      email: favoriteData.email,
      lessonId: favoriteData.lessonId,
    });

    if (alreadyExists) {
      return res.status(400).send({ message: "Already added to favorites!" });
    }

    const result = await favoriteCollection.insertOne(favoriteData);
    res.status(201).send({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Database Error:", error);
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});


app.get("/my-favorites/:email", async (req, res) => {
  try {
    const userEmail = req.params.email;
    const query = { email: userEmail };
    const result = await favoriteCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.error("GET Favorites Error:", error);
    res.status(500).send({ message: "Failed to fetch favorites" });
  }
});


app.delete("/my-favorites/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await favoriteCollection.deleteOne(query);

    if (result.deletedCount === 1) {
      res.send({ success: true, message: "Removed successfully" });
    } else {
      res.status(404).send({ success: false, message: "Item not found" });
    }
  } catch (error) {
    console.error("DELETE Favorite Error:", error);
    res.status(500).send({ message: "Server error during deletion" });
  }
});

app.patch("/addLesson/:id", async (req, res) => {
  
  try {
    const id = req.params.id;
    const body = req.body;
    console.log("ID:", id);
    console.log("BODY:", body);

    const result = await addLesson.updateOne(
      { _id: new ObjectId(id) },
      { $set: body },
    );

    console.log(result);
    res.send(result);
  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).send({ error: err.message });
  }
});

app.get("/featuredLessons", async (req, res) => {
  const result = await addLesson.find().limit(3).toArray();
  res.json(result);
});

app.post("/subscription", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await userCollection.updateOne(
      { email },
      { $set: { plan: "premium" } },
    );
    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/addLesson", async (req, res) => {
  try {
    const lesson = req.body;
    const result = await addLesson.insertOne(lesson);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/admin/profile/update/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, image } = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: { name: name, image: image, photoURL: image },
    };

    const result = await userCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount > 0) {
      res
        .status(200)
        .send({
          success: true,
          message: "Admin profile updated successfully",
          result,
        });
    } else {
      res
        .status(404)
        .send({ success: false, message: "No changes made or user not found" });
    }
  } catch (error) {
    res
      .status(500)
      .send({
        success: false,
        message: "Failed to update admin profile",
        error: error.message,
      });
  }
});

app.get("/addLesson", async (req, res) => {
  const result = await addLesson.find().toArray();
  res.json(result);
});

app.post("/comments", async (req, res) => {
  try {
    const commentData = req.body;
    const result = await commentsCollection.insertOne({
      ...commentData,
      createdAt: new Date(),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/my-lessons/:email", async (req, res) => {
  const email = req.params.email;
  const result = await addLesson.find({ userEmail: email }).toArray();
  res.send(result);
});

app.get("/comments/:lessonId", async (req, res) => {
  const { lessonId } = req.params;
  const result = await commentsCollection.find({ lessonId }).toArray();
  res.send(result);
});

app.get("/addLesson/:id",async (req, res) => {
  try {
    const { id } = req.params;
    const result = await addLesson.findOne({ _id: new ObjectId(id) });
    if (!result) {
      return res.status(404).send({ message: "Lesson not found" });
    }
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

app.get("/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.delete("/addLesson/:id", async (req, res) => {
  const id = req.params.id;
  const result = await addLesson.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;