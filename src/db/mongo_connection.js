const { MongoClient, ObjectId } = require("mongodb");
const { destination_database } = require("../config.json");

const client = new MongoClient(destination_database.url);

async function connectToMongo() {
  try {
    await client.connect();
    console.log("Terhubung ke MongoDB");
  } catch (error) {
    console.error("Koneksi ke MongoDB gagal:", error);
  }
}

connectToMongo();

module.exports = { mongo: client.db(destination_database.database), ObjectId };
