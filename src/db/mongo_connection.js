const { MongoClient, ObjectId } = require("mongodb");
const { destination_database } = require("../config.json");

const options = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 100_000,
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 30000,
  monitorCommands: true,
};

const client = new MongoClient(destination_database.url, options);

module.exports = {
  mongo: async () => {
    await client.connect();
    return client.db(destination_database.database);
  },
  ObjectId,
};
