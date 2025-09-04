const { mongo } = require("../db/mongo_connection");

const finalizing = async () => {
  console.clear();
  process.stdout.write(`\r(Database) Finalizing...\r`);
  const listCollections = [
    "analytics",
    "tokens",
    "posts",
    "posts_maintain",
    "media",
    "users",
    "tags",
    "categories",
  ];
  const currentCollections = (await mongo.listCollections().toArray()).map(
    (item) => item.name
  );

  const sliceCollections = listCollections.filter(
    (item) => !currentCollections.includes(item)
  );

  // create collection from sliceCollections
  await Promise.all(
    sliceCollections.map(async (collection) => {
      await mongo.createCollection(collection);
    })
  );
};

module.exports = { finalizing };
