const { mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");
const { normalizeMongoDoc } = require("../utils/normalize.mongo.doc");
const { splitArray } = require("../utils/library");
const { workerSize } = require("../config.json");
const { Worker } = require("worker_threads");
const { prefix } = require("../config.json");

// const migratePostBack = async ({ isMultilanguage, migratePaketWisata }) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       console.clear();
//       process.stdout.write(`\r(Posts) Getting post dependencies...\r`);
//       // Initial dependency
//       const allTag = await (await mongo()).collection("tags").find().toArray();
//       const allCat = await (await mongo())
//         .collection("categories")
//         .find()
//         .toArray(); //(await mongo()).collection('categories').find().toArray()
//       const idWisata = allCat
//         .filter((item) =>
//           ["paket-wisata", "paket-wisata-overseas"].includes(item.slug)
//         )
//         .map((item) => item._id.toString());
//       const allUser = await (await mongo())
//         .collection("users")
//         .find()
//         .toArray();
//       const allMedia = await (await mongo())
//         .collection("media")
//         .find()
//         .toArray();
//       console.clear();
//       console.log("Tags", allTag.length);
//       console.log("Categories", allCat.length);
//       console.log("Paket Wisata (if available)", idWisata.length);

//       // Main
//       console.log("Getting Posts Data ...");
//       const result = await getPostData();
//       const dataWorker = splitArray(
//         result,
//         Math.round(result.length / workerSize)
//       );
//       const progress = Object.fromEntries(
//         Object.entries(Array(dataWorker.length).fill(0))
//       );
//       const itemDone = progress;
//       console.log(`Total post ${result.length}`);

//       const resultData = [];
//       let workerDone = 0;

//       console.log(`Preparing ${dataWorker.length} workers ...`);
//       dataWorker.forEach((item, index) => {
//         const worker = new Worker("./src/models/worker/post.worker.js", {
//           workerData: {
//             allCat: normalizeMongoDoc(allCat),
//             idWisata,
//             allTag: normalizeMongoDoc(allTag),
//             allUser: normalizeMongoDoc(allUser),
//             allMedia: normalizeMongoDoc(allMedia),
//             result: item,
//             isMultilanguage,
//             migratePaketWisata,
//           },
//         });

//         worker.on("message", async (data) => {
//           if (data.type === "progress") {
//             console.clear();
//             progress[index] = data.precentage;
//             itemDone[index] = data.finished;
//             const current = Object.values(itemDone).reduce((a, b) => a + b, 0);
//             process.stdout.write(
//               `\r(Posts) Adjustment data with ${
//                 dataWorker.length
//               } workers ${current}/${result.length} (${(
//                 (current / result.length) *
//                 100
//               ).toFixed(2)} %) ...\r`
//             );
//             // process.stdout.write(
//             //   `\r${JSON.stringify(
//             //     Object.fromEntries(
//             //       Object.entries(progress).map(([key, value]) => [
//             //         `Worker ${key}`,
//             //         `${value} %`,
//             //       ])
//             //     )
//             //   )}...\r`
//             // );

//             return;
//           }

//           resultData.push(data.resultData);
//           workerDone++;

//           if (workerDone === dataWorker.length) {
//             console.clear();
//             console.log(`Worker done ${workerDone}/${dataWorker.length}`);

//             const accumulation = resultData.reduce((acc, current) => {
//               if (!acc) return current;
//               Object.keys(current).forEach((key) => {
//                 if (!acc[key]) {
//                   acc[key] = [];
//                 }
//                 acc[key] = acc[key].concat(current[key]);
//               });
//               return acc;
//             }, {});

//             resolve(
//               Object.fromEntries(
//                 Object.entries(accumulation).map(([key, value]) => [
//                   key,
//                   value.reduce((a, b) => a + b, 0),
//                 ])
//               )
//             );
//           }
//         });

//         worker.on("error", (error) => {
//           console.log(error);
//           throw error;
//         });

//         worker.on("exit", (code) => {
//           if (code !== 0) {
//             throw new Error(`Worker stopped with exit code ${code}`);
//           }

//           // Free memory
//           if (global.gc) {
//             global.gc();
//           }

//           console.clear();
//           console.log(`Worker done ${workerDone}/${dataWorker.length}`);
//         });
//       });
//     } catch (error) {
//       reject(error);
//     }
//   });
// };

class MigratePostData {
  constructor({ isMultilanguage, migratePaketWisata }) {
    this.postProccess = 100;

    this.allTag = [];
    this.allCat = [];
    this.idWisata = [];
    this.allUser = [];
    this.allMedia = [];
    this.postData = [];
    this.isMultilanguage = isMultilanguage;
    this.migratePaketWisata = migratePaketWisata;

    // worker
    this.workerDone = 0;
    this.resultData = [];
    this.itemDone = [];
    this.progress = [];
  }

  async init() {
    console.clear();
    process.stdout.write(`\r(Posts) Getting post dependencies...\r`);

    this.allTag = await (await mongo()).collection("tags").find().toArray();
    this.allCat = await (await mongo())
      .collection("categories")
      .find()
      .toArray(); //(await mongo()).collection('categories').find().toArray()
    this.idWisata = this.allCat
      .filter((item) =>
        ["paket-wisata", "paket-wisata-overseas"].includes(item.slug)
      )
      .map((item) => item._id.toString());
    this.allUser = await (await mongo()).collection("users").find().toArray();
    this.allMedia = await (await mongo()).collection("media").find().toArray();

    console.clear();
    console.log("Tags", this.allTag.length);
    console.log("Categories", this.allCat.length);
    console.log("Paket Wisata (if available)", this.idWisata.length);

    await this.getPostData();
  }

  async getPostData() {
    console.log("Getting Posts Data ...");
    this.postData = await this.getPosts();

    this.dataWorker = splitArray(this.postData, this.postProccess);
    this.queue = splitArray(this.dataWorker, workerSize);
    this.progress = Object.fromEntries(
      Object.entries(Array(this.dataWorker.length).fill(0))
    );
    this.itemDone = this.progress;
    console.log(`Total post ${this.postData.length}`);
  }

  async getPosts() {
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
  }

  async callWorker(sequence) {
    return new Promise((resolve, reject) => {
      const data = this.queue[sequence];
      let sequenceDone = 0;

      data.forEach((item, index) => {
        const worker = new Worker("./src/models/worker/post.worker.js", {
          workerData: {
            allCat: normalizeMongoDoc(this.allCat),
            idWisata: this.idWisata,
            allTag: normalizeMongoDoc(this.allTag),
            allUser: normalizeMongoDoc(this.allUser),
            allMedia: normalizeMongoDoc(this.allMedia),
            result: item,
            isMultilanguage: this.isMultilanguage,
            migratePaketWisata: this.migratePaketWisata,
          },
        });

        worker.on("message", async (data) => {
          if (data.type === "progress") {
            console.clear();
            this.progress[sequence * workerSize + index] = data.precentage;
            this.itemDone[sequence * workerSize + index] = data.finished;
            const current = Object.values(this.itemDone).reduce(
              (a, b) => a + b,
              0
            );
            process.stdout.write(
              `\r(Posts) Adjustment data with ${
                this.dataWorker.length
              } workers ${current}/${this.postData.length} (${(
                (current / this.postData.length) *
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

          this.resultData.push(data.resultData);
          this.workerDone++;
          sequenceDone++;

          if (sequenceDone === this.queue[sequence].length) {
            console.clear();

            if (this.queue[sequence + 1]) {
              this.callWorker(sequence + 1);
              return;
            }

            console.log(
              `Worker done ${this.workerDone}/${this.dataWorker.length}`
            );

            const accumulation = this.resultData.reduce((acc, current) => {
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
          reject(error);
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }

          // Free memory
          if (global.gc) {
            global.gc();
          }

          console.clear();
          console.log(
            `Worker done ${this.workerDone}/${this.dataWorker.length}`
          );
        });
      });
    });
  }
}

module.exports = {
  migratePost: async ({ isMultilanguage, migratePaketWisata }) => {
    const migratepost = new MigratePostData({
      isMultilanguage,
      migratePaketWisata,
    });
    await migratepost.init();
    await migratepost.callWorker(0);
  },
};
