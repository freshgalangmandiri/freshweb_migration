const { mongo } = require("./db/mongo_connection");

(async () => {
  const posts = await (await mongo())
    .collection("posts_maintain")
    .find({})
    .toArray();

  const result = [...new Set(posts.map((item) => item.time))];
  const uuid = [...new Set(posts.map((item) => item.uid))];
  const base62 = [...new Set(posts.map((item) => item.base62))];

  console.log({
    posts: posts.length,
    unique: result.length,
    uuid: uuid.length,
    base62: base62.length,
  });
})();
