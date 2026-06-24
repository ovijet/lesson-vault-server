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

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("lessonVault");
    const subscriptionsCollection = db.collection("subscriptions");
    const userCollection = db.collection("user");
    const addLesson = db.collection("addLesson");

    // ✅ Subscription route
    // app.post("/subscription", async (req, res) => {
    //   try {
    //     const { sessionId, userId, priceId } = req.body;

    //     await subscriptionsCollection.insertOne({
    //       sessionId,
    //       userId,
    //       priceId,
    //     });

    //     await userCollection.updateOne(
    //       { _id: new ObjectId(userId) },
    //       { $set: { role: "pro" } }
    //     );

    //     res.json({ msg: "payment successful" });
    //   } catch (error) {
    //     res.status(500).json({ success: false, message: error.message });
    //   }
    // });

    // ✅ Add lesson route
    app.post("/addLesson", async (req, res) => {
      try {
        const lesson = req.body;
        const result = await addLesson.insertOne(lesson);

        res.json({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // ✅ Get lessons
    app.get("/addLesson", async (req, res) => {
      const result = await addLesson.find().toArray();
      res.json(result);
    });

app.get("/addLesson/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Received ID:", id); 
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await addLesson.findOne({ _id: new ObjectId(id) });
    console.log("DB Result:", result);

    if (!result) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error:", error); 
    res.status(500).json({ success: false, message: error.message });
  }
});




    app.get("/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});







  app.delete("/addLesson/:id", async (req, res) => {
  const id = req.params.id;

  const result = await addLesson.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});