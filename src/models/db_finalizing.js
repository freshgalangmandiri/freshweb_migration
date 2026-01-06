const { mongo } = require("../db/mongo_connection");
const { isJadwalPelatihan } = require("../config.json");

const finalizing = async ({ migratePaketWisata, ...term }) => {
  console.clear();
  process.stdout.write(`\r(Database) Finalizing...\r`);
  const listCollections = {
    analytics: null,
    tokens: null,
    posts_lock: null,
    settings: null,
    posts: "idOld",
    posts_maintain: "idOld",
    media: "oldId",
    users: "ID",
    tags: "oldId",
    categories: "oldId",
    ...(term.migratePaketWisata && { paketWisata: "idOld" }),
    ...(isJadwalPelatihan && { jadwalPelatihan: "postId" }),
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
