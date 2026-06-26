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

async function run() {
  try {
    await client.connect();

    const db = client.db("lessonVault");
    const subscriptionsCollection = db.collection("subscriptions");
    const userCollection = db.collection("user");
    const addLesson = db.collection("addLesson");
    const commentsCollection = db.collection("comments");

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


app.post("/subscription", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await userCollection.updateOne(
      { email },
      {
        $set: {
          plan: "premium",
        },
      }
    );

    res.send({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});







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


    app.patch('/admin/profile/update/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { name, image } = req.body; // Extract data from request body

        // Create filter using MongoDB ObjectId
        const filter = { _id: new ObjectId(id) };

        // Define the update operation
        const updateDoc = {
          $set: {
            name: name,
            image: image, // Updates both image and photoURL fields if needed
            photoURL: image,
          },
        };

        // Execute the update in the 'user' collection
        const result = await usersCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount > 0) {
          res.status(200).send({
            success: true,
            message: 'Admin profile updated in the archive successfully',
            result,
          });
        } else {
          res.status(404).send({
            success: false,
            message: 'No changes made or user not found',
          });
        }
      } catch (error) {
        // Handle potential server or database errors
        res.status(500).send({
          success: false,
          message: 'Failed to update admin profile registry',
          error: error.message,
        });
      }
    });

    // ✅ Get lessons
    app.get("/addLesson", async (req, res) => {
      const result = await addLesson.find().toArray();
      res.json(result);
    });

    // comment er jonno
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

  const result = await addLesson
    .find({
      userEmail: email,
    })
    .toArray();

  res.send(result);
});

app.get("/comments/:lessonId", async (req, res) => {
  const { lessonId } = req.params;

  console.log("Param lessonId:", lessonId);

  const result = await commentsCollection
    .find({ lessonId })
    .toArray();

  console.log("Found comments:", result);

  res.send(result);
});

app.get("/addLesson/:id", async (req, res) => {
  const { id } = req.params;

  const result = await addLesson.findOne({
    _id: id,
  });

  res.json(result);
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

    // await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});