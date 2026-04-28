const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

async function connectDB() {
  let uri = process.env.MONGODB_URI;
  
  if (!uri || uri.includes("cluster.mongodb.net")) {
    console.log("Starting in-memory MongoDB for local development...");
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = connectDB;
