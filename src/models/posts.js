const { mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");
const { normalizeMongoDoc } = require("../utils/normalize.mongo.doc");
const { splitArray } = require("../utils/library");
const { workerSize } = require("../config.json");
const { Worker } = require("worker_threads");
const { prefix } = require("../config.json");

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
        FROM ${prefix}term_relationships b
        LEFT JOIN ${prefix}term_taxonomy c ON b.term_taxonomy_id = c.term_taxonomy_id
        LEFT JOIN ${prefix}terms d ON c.term_id = d.term_id
        WHERE b.object_id = a.id
      ) AS term,
      (
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', e.meta_value
          )
        )
        FROM ${prefix}postmeta e
        WHERE e.post_id = a.id AND meta_key = "_thumbnail_id"
      ) AS media
      FROM ${prefix}posts a
  
      WHERE a.post_status = "publish" AND a.post_type = "post" ORDER BY ID ASC`;
    const result = await query(SQL);
    return result;
  } catch (error) {
    throw error;
  }
};

const migratePost = async ({ isMultilanguage, migratePaketWisata }) => {
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
            isMultilanguage,
            migratePaketWisata,
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

          resultData.push(data.resultData);
          workerDone++;

          if (workerDone === dataWorker.length) {
            console.clear();
            console.log(`Worker done ${workerDone}/${dataWorker.length}`);

            const accumulation = resultData.reduce((acc, current) => {
              if (!acc) return current;
              Object.keys(current).forEach((key) => {
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key] = acc[key].concat(current[key]);
              });
              return acc;
            }, {});

            resolve(
              Object.fromEntries(
                Object.entries(accumulation).map(([key, value]) => [
                  key,
                  value.reduce((a, b) => a + b, 0),
                ])
              )
            );
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
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { migratePost };
