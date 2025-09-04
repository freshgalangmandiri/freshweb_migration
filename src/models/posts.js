const { mongo, ObjectId } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");
const { isIntersection, formatPw } = require("../utils/formatPw");

const getPostData = async (page) => {
  try {
    const SQL = `SELECT 
      a.ID idOld,
      a.post_author author,
      a.post_date date,
      a.post_title title,
      a.post_content content,
      a.post_status status,
      a.post_name slug,
      JSON_OBJECT(
        'title', a.post_title,
        'description', a.post_excerpt
      ) metadata,
      a.post_modified modified,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', d.term_id,
            'term', c.taxonomy
          )
        )
        FROM wp_term_relationships b 
        LEFT JOIN wp_term_taxonomy c ON b.term_taxonomy_id = c.term_taxonomy_id
        LEFT JOIN wp_terms d ON c.term_id = d.term_id
        WHERE b.object_id = a.id
      ) AS term,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', e.meta_value
          )
        )
        FROM wp_postmeta e
        WHERE e.post_id = a.id AND meta_key = "_thumbnail_id"
      ) AS media
      FROM wp_posts a
  
      WHERE a.post_status = "publish" AND a.post_type = "post" ORDER BY ID ASC LIMIT 100`;
    const result = await query(SQL);
    return result;
  } catch (error) {
    throw error;
  }
};

const migratePost = async () => {
  try {
    console.clear();
    process.stdout.write(`\r(Posts) Getting post dependencies...\r`);
    console.clear();
    // Initial dependency
    const allTag = await mongo.collection("tags").find().toArray();
    console.log("Tags", allTag.length);
    const allCat = await mongo.collection("categories").find().toArray(); //mongo.collection('categories').find().toArray()
    console.log("Categories", allCat.length);
    const idWisata = allCat
      .filter((item) =>
        ["paket-wisata", "paket-wisata-overseas"].includes(item.slug)
      )
      .map((item) => item._id.toString());
    console.log("Paket Wisata (if available)", idWisata.length);

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
      allTag.filter((item) => ids.includes(item.oldId)).map((item) => item._id);
    const allUser = await mongo.collection("users").find().toArray();
    const getUser = (ids) =>
      allUser.filter((item) => item.ID == ids).map((item) => item._id)[0];
    const allMedia = await mongo.collection("media").find().toArray();
    const getMedia = (ids) =>
      allMedia
        .filter((item) => ids.includes(item.oldId))
        .map((item) => item._id);

    // Main
    const result = await getPostData();
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
        current.categories = cat.map((item) => item._id);

        const oldTag = term
          .filter((item) => item.term == "post_tag")
          .map((item) => item.id);
        current.tags = getTags(oldTag);

        const _isPaketWisata = isPaketWisata(current.categories);
        if (_isPaketWisata) {
          current.categories = cat
            .filter((item) => item.parents.length > 1)
            .map((item) => item._id);
          current.content = formatPw(
            current.content
              .replace(/\<strong*/g, "<h3")
              .replace(/\<\/strong*/g, "</h3")
          );
        }
        ["paketWisata", "posts", "posts_maintain"].forEach((collection) => {
          if (_isPaketWisata && collection === "paketWisata") {
            acc[collection].push(current);
            return;
          }

          acc[collection].push(current);
        });
        process.stdout.write(
          `\r(Posts) Adjustment data ${index + 1}/${result.length}...\r`
        );

        return acc;
      },
      {
        posts: [],
        paketWisata: [],
        posts_maintain: [],
      }
    );

    console.clear();
    return await Promise.all(
      Object.keys(data).map(async (key) => {
        if (data[key].length)
          return await mongo.collection(key).insertMany(data[key]);
      })
    );
  } catch (error) {
    console.log(error);
    throw new Error("Failed to migrate posts");
  }
};

module.exports = { migratePost };
