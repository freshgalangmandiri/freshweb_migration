const { mongo } = require("../db/mongo_connection");

const resetDb = async () => {
  try {
    console.clear();
    process.stdout.write(`\r(Database) Preparing ...\r`);
    const collections = [
      "tags",
      "categories",
      "users",
      "posts",
      "posts_maintain",
      "paketWisata",
      "media",
    ];
    const result = await Promise.all(
      collections.map(async (collection) => {
        return await (await mongo()).collection(collection).deleteMany({});
      })
    );

    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = { resetDb };
