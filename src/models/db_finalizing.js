const { mongo } = require("../db/mongo_connection");

const finalizing = async () => {
  console.clear();
  process.stdout.write(`\r(Database) Finalizing...\r`);
  const listCollections = {
    analytics: null,
    tokens: null,
    posts: "idOld",
    posts_maintain: "idOld",
    paketWisata: "idOld",
    media: "oldId",
    users: "ID",
    tags: "oldId",
    categories: "oldId",
  };
  const currentCollections = (
    await (await mongo()).listCollections().toArray()
  ).map((item) => item.name);

  const sliceCollections = Object.keys(listCollections).filter(
    (item) => !currentCollections.includes(item)
  );

  // unset old id from collections
  await Promise.all(
    Object.keys(listCollections).map(async (collection) => {
      if (listCollections[collection]) {
        await (await mongo())
          .collection(collection)
          .updateMany({}, { $unset: { [listCollections[collection]]: "" } });
      }
    })
  );

  // create collection from sliceCollections
  await Promise.all(
    sliceCollections.map(async (collection) => {
      await (await mongo()).createCollection(collection);
    })
  );
};

module.exports = { finalizing };
