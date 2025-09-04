const { mongo, ObjectId } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");
const { normalizeMongoDoc } = require("../utils/normalize.mongo.doc");
const { splitArray, mergeArrayOfObjects } = require("../utils/library");
const { workerSize } = require("../config.json");
const { Worker } = require("worker_threads");

const getPostData = async (page) => {
  try {
    const SQL = `SELECT 
      a.ID idOld,
      a.post_author author,
      a.post_date createdAt,
      a.post_title title,
      a.post_content content,
      a.post_status status,
      a.post_name slug,
      JSON_OBJECT(
        'title', a.post_title,
        'description', a.post_excerpt
      ) metadata,
      a.post_modified modifiedAt,
      a.post_excerpt subtitle,
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
  
      WHERE a.post_status = "publish" AND a.post_type = "post" ORDER BY ID ASC`;
    const result = await query(SQL);
    return result;
  } catch (error) {
    throw error;
  }
};

const migratePost = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      console.clear();
      process.stdout.write(`\r(Posts) Getting post dependencies...\r`);
      // Initial dependency
      const allTag = await (await mongo()).collection("tags").find().toArray();
      const allCat = await (await mongo())
        .collection("categories")
        .find()
        .toArray(); //(await mongo()).collection('categories').find().toArray()
      const idWisata = allCat
        .filter((item) =>
          ["paket-wisata", "paket-wisata-overseas"].includes(item.slug)
        )
        .map((item) => item._id.toString());
      const allUser = await (await mongo())
        .collection("users")
        .find()
        .toArray();
      const allMedia = await (await mongo())
        .collection("media")
        .find()
        .toArray();
      console.clear();
      console.log("Tags", allTag.length);
      console.log("Categories", allCat.length);
      console.log("Paket Wisata (if available)", idWisata.length);

      // Main
      console.log("Getting Posts Data ...");
      const result = await getPostData();
      const dataWorker = splitArray(
        result,
        Math.round(result.length / workerSize)
      );
      const progress = Object.fromEntries(
        Object.entries(Array(dataWorker.length).fill(0))
      );
      const itemDone = progress;
      console.log(`Total post ${result.length}`);

      const resultData = [];
      let workerDone = 0;

      console.log(`Preparing ${dataWorker.length} workers ...`);
      dataWorker.forEach((item, index) => {
        const worker = new Worker("./src/models/worker/post.worker.js", {
          workerData: {
            allCat: normalizeMongoDoc(allCat),
            idWisata,
            allTag: normalizeMongoDoc(allTag),
            allUser: normalizeMongoDoc(allUser),
            allMedia: normalizeMongoDoc(allMedia),
            result: item,
          },
        });

        worker.on("message", async (data) => {
          if (data.type === "progress") {
            console.clear();
            progress[index] = data.precentage;
            itemDone[index] = data.finished;
            const current = Object.values(itemDone).reduce((a, b) => a + b, 0);
            process.stdout.write(
              `\r(Posts) Adjustment data with ${
                dataWorker.length
              } workers ${current}/${result.length} (${(
                (current / result.length) *
                100
              ).toFixed(2)} %) ...\r`
            );
            // process.stdout.write(
            //   `\r${JSON.stringify(
            //     Object.fromEntries(
            //       Object.entries(progress).map(([key, value]) => [
            //         `Worker ${key}`,
            //         `${value} %`,
            //       ])
            //     )
            //   )}...\r`
            // );

            return;
          }

          resultData.push(data.data);
          workerDone++;

          if (workerDone === dataWorker.length) {
            console.clear();
            console.log(`Worker done ${workerDone}/${dataWorker.length}`);
            resolve(resultData);
          }
        });

        worker.on("error", (error) => {
          console.log(error);
          throw error;
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            throw new Error(`Worker stopped with exit code ${code}`);
          }

          // Free memory
          if (global.gc) {
            global.gc();
          }

          console.clear();
          console.log(`Worker done ${workerDone}/${dataWorker.length}`);
        });
      });
      //   (acc, current, index) => {
      //     current._id = new ObjectId();
      //     current.author = getUser(current.author);

      //     // helper for status grouping
      //     // const role = {
      //     //   draft: ["auto-draft", "inherit", "private"],
      //     //   published: ["publish"],
      //     //   trash: ["trash"],
      //     // };

      //     // current.status = Object.entries(role).find(([key, value]) => {
      //     //   return value.includes(current.status);
      //     // })?.[0];

      //     const term = JSON.parse(current.term);
      //     delete current.term;
      //     const media = JSON.parse(current.media || "[]");
      //     current.media =
      //       getMedia(media.map((item) => parseInt(item.id)))?.[0] || null;
      //     current.status = "published";
      //     current.metadata = {
      //       ...(JSON.parse(current.metadata) || "{}"),
      //       image: current.media,
      //     };

      //     const oldCat = term
      //       .filter((item) => item.term == "category")
      //       .map((item) => item.id);
      //     const cat = getCategories(oldCat);
      //     current.categories = cat.map((item) => item._id);

      //     const oldTag = term
      //       .filter((item) => item.term == "post_tag")
      //       .map((item) => item.id);
      //     current.tags = getTags(oldTag);

      //     const _isPaketWisata = isPaketWisata(current.categories);
      //     if (_isPaketWisata) {
      //       current.categories = cat
      //         .filter((item) => item.parents.length > 1)
      //         .map((item) => item._id);
      //       current.content = formatPw(
      //         current.content
      //           .replace(/\<strong*/g, "<h3")
      //           .replace(/\<\/strong*/g, "</h3")
      //       );
      //     }

      //     if (_isPaketWisata) {
      //       acc.paketWisata.push(current);
      //     } else {
      //       acc.posts_maintain.push(current);
      //       acc.posts.push({
      //         ...current,
      //         _id: new ObjectId(),
      //         parentId: current._id,
      //       });
      //     }
      //     process.stdout.write(
      //       `\r(Posts) Adjustment data ${index + 1}/${result.length} (${(
      //         ((index + 1) / result.length) *
      //         100
      //       ).toFixed(2)} %)...\r`
      //     );

      //     return acc;
      //   },
      //   {
      //     posts: [],
      //     paketWisata: [],
      //     posts_maintain: [],
      //   }
      // );

      // console.clear();
      // return await Promise.all(
      //   Object.keys(data).map(async (key) => {
      //     if (data[key].length)
      //       return await (await mongo()).collection(key).insertMany(data[key]);
      //   })
      // );
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { migratePost };
