const { parentPort, workerData } = require("worker_threads");
const { mongo, ObjectId } = require("../../db/mongo_connection");
const { formatPw, isIntersection } = require("../../utils/formatPw");

(async () => {
  const { allCat, allTag, idWisata, allUser, allMedia, result } = workerData;

  // initial Helper
  const getCategories = (ids) =>
    allCat.filter((item) => ids.includes(item.oldId));
  const isPaketWisata = (ids) => {
    ids = ids.map((item) => item.toString());
    const parents = allCat
      .filter((item) => ids.includes(item._id.toString()))
      .flatMap((item) => item.parents.map((item) => item.toString()));

    return isIntersection(ids, idWisata) || isIntersection(parents, idWisata); //paketWisata;
  };
  const getTags = (ids) =>
    allTag
      .filter((item) => ids.includes(item.oldId))
      .map((item) => new ObjectId(item._id));
  const getUser = (ids) =>
    allUser
      .filter((item) => item.ID == ids)
      .map((item) => new ObjectId(item._id))[0];
  const getMedia = (ids) =>
    allMedia
      .filter((item) => ids.includes(item.oldId))
      .map((item) => new ObjectId(item._id));

  const data = result.reduce(
    (acc, current, index) => {
      current._id = new ObjectId();
      current.author = getUser(current.author);

      // helper for status grouping
      // const role = {
      //   draft: ["auto-draft", "inherit", "private"],
      //   published: ["publish"],
      //   trash: ["trash"],
      // };

      // current.status = Object.entries(role).find(([key, value]) => {
      //   return value.includes(current.status);
      // })?.[0];

      const term = JSON.parse(current.term);
      delete current.term;
      const media = JSON.parse(current.media || "[]");
      current.media =
        getMedia(media.map((item) => parseInt(item.id)))?.[0] || null;
      current.status = "published";
      current.metadata = {
        ...(JSON.parse(current.metadata) || "{}"),
        image: current.media,
      };

      const oldCat = term
        .filter((item) => item.term == "category")
        .map((item) => item.id);
      const cat = getCategories(oldCat);
      current.categories = cat.map((item) => new ObjectId(item._id));

      const oldTag = term
        .filter((item) => item.term == "post_tag")
        .map((item) => item.id);
      current.tags = getTags(oldTag);

      const _isPaketWisata = isPaketWisata(current.categories);
      if (_isPaketWisata) {
        current.categories = cat
          .filter((item) => item.parents.length > 1)
          .map((item) => new ObjectId(item._id));
        current.content = formatPw(
          current.content
            .replace(/\<strong*/g, "<h3")
            .replace(/\<\/strong*/g, "</h3")
        );
      }

      if (_isPaketWisata) {
        acc.paketWisata.push(current);
      } else {
        acc.posts_maintain.push(current);
        acc.posts.push({
          ...current,
          _id: new ObjectId(),
          parentId: current._id,
        });
      }
      const progress = {
        type: "progress",
        precentage: (((index + 1) / result.length) * 100).toFixed(2),
        total: result.length,
        finished: index + 1,
      };

      parentPort.postMessage(progress);
      return acc;
    },
    {
      posts: [],
      paketWisata: [],
      posts_maintain: [],
    }
  );

  // console.clear();
  const resultData = await Promise.all(
    Object.keys(data).map(async (key) => {
      if (data[key].length)
        return await (await mongo()).collection(key).insertMany(data[key]);
    })
  );

  parentPort.postMessage({ type: "done", resultData });
})();
