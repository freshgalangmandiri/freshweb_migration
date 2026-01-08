const { mongo } = require("../db/mongo_connection");
const { connection } = require("../db/mysql_connnection");

const testMongo = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        reject(new Error("Failed to connect to MongoDB"));
      }, 5000);

      const users = await (await mongo())
        .collection("users")
        .find({})
        .toArray();
      resolve(users);

      clearTimeout(timeout);
    } catch (error) {
      reject(new Error("Failed to connect to MongoDB"));
    }
  });
};

const testMySQL = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        reject(new Error("Failed to connect to MySQL"));
      }, 5000);

      const conn = await connection().getConnection();
      resolve(conn);

      clearTimeout(timeout);
    } catch (error) {
      reject(new Error("Failed to connect to MySQL"));
    }
  });
};

const testDB = async () => {
  try {
    console.clear();
    console.log("(Database) Establishing Connection ...");
    await testMongo();
    await testMySQL();
  } catch (error) {
    throw error;
  }
};

module.exports = { testDB };
