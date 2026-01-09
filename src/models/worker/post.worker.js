const { parentPort, workerData } = require("worker_threads");
const { mongo, ObjectId } = require("../../db/mongo_connection");
const { formatPw, isIntersection } = require("../../utils/formatPw");
const {
  isObject,
  spliceObject,
  convertCompatibleContent,
  splitArray,
} = require("../../utils/library");
const { v7: uuid } = require("uuid");
const { processingData, isJadwalPelatihan } = require("../../config.json");

class PostWorker {
  constructor() {
    this.processingData = processingData;

    // Data Worker
    this.allCat = workerData.allCat;
    this.allTag = workerData.allTag;
    this.idWisata = workerData.idWisata;
    this.allUser = workerData.allUser;
    this.allMedia = workerData.allMedia;
    this.result = workerData.result;
    this.allJadwalPelatihan = workerData.allJadwalPelatihan;
    this.isMultilanguage = workerData.isMultilanguage;
    this.migratePaketWisata = workerData.migratePaketWisata;
    this.count = 0;

    // Data Process
    this.data = splitArray(this.result, this.processingData);

    // result
    this.resultData = {
      posts: 0,
      paketWisata: 0,
      posts_maintain: 0,
    };
  }

  getCategories(ids) {
    return this.allCat.filter((item) => ids.includes(item.oldId));
  }

  getTags(ids) {
    return this.allTag
      .filter((item) => ids.includes(item.oldId))
      .map((item) => new ObjectId(item._id));
  }

  getMedia(ids) {
    return this.allMedia
      .filter((item) => ids.includes(item.oldId))
      .map((item) => new ObjectId(item._id));
  }

  getUser(ids) {
    return this.allUser
      .filter((item) => item.ID == ids)
      .map((item) => new ObjectId(item._id))[0];
  }

  isPaketWisata(ids) {
    ids = ids.map((item) => item.toString());
    const parents = this.allCat
      .filter((item) => ids.includes(item._id.toString()))
      .flatMap((item) => item.parents.map((item) => item.toString()));

    return (
      isIntersection(ids, this.idWisata) ||
      isIntersection(parents, this.idWisata)
    ); //paketWisata;
  }

  async migratePost(sequence) {
    const dataPreProcess = this.data[sequence];

    const data = dataPreProcess.reduce(
      (acc, current, index) => {
        current._id = new ObjectId();
        current.author = this.getUser(current.author);

        const term =
          isObject(current.term) || Array.isArray(current.term)
            ? current.term
            : JSON.parse(current.term);
        delete current.term;
        const media =
          isObject(current.media) || Array.isArray(current.media)
            ? current.media
            : JSON.parse(current.media || "[]");

        current.media =
          this.getMedia(media.map((item) => parseInt(item.id)))?.[0] || null;
        current.status = "published";
        current.metadata = {
          ...(isObject(current.metadata) || Array.isArray(current.metadata)
            ? current.metadata
            : JSON.parse(current.metadata) || "{}"),
          image: current.media,
        };

        if (isJadwalPelatihan)
          current.jadwalPelatihan = this.allJadwalPelatihan[current.idOld]?.map(
            (item) => new ObjectId(item)
          );

        if (this.isMultilanguage) {
          current = {
            ...current,
            title: current.title,
            content: current.content,
            subtitle: current.subtitle,
            slug: current.slug,
            metadata: current.metadata,
            lang: "id",
            uid: uuid(),
          };
        }

        const oldCat = term
          .filter((item) => item.term == "category")
          .map((item) => item.id);
        const cat = this.getCategories(oldCat);
        current.categories = cat.map((item) => new ObjectId(item._id));

        const oldTag = term
          .filter((item) => item.term == "post_tag")
          .map((item) => item.id);
        current.tags = this.getTags(oldTag);

        const _isPaketWisata = this.isPaketWisata(current.categories);
        if (_isPaketWisata && this.migratePaketWisata) {
          current.categories = cat
            .filter((item) => item.parents.length > 1)
            .map((item) => new ObjectId(item._id));
          current.content = formatPw(
            current.content
              .replace(/\<strong*/g, "<h3")
              .replace(/\<\/strong*/g, "</h3")
          );
        } else {
          if (this.isMultilanguage) {
            current.language.id.content = convertCompatibleContent(
              current.language.id.content
            );
          } else current.content = convertCompatibleContent(current.content);
        }

        if (_isPaketWisata && this.migratePaketWisata) {
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
          precentage: ((this.count++ / this.result.length) * 100).toFixed(2),
          total: this.result.length,
          finished: this.count,
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
    // const resultData = Object.fromEntries(
    //   await Promise.all(
    //     Object.entries(data).map(async ([key, value]) => {
    //       if (value.length) {
    //         await (await mongo()).collection(key).insertMany(value);
    //         return [key, value.length];
    //       }
    //       return [key, 0];
    //     })
    //   )
    // );
    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        if (value.length) {
          await (await mongo()).collection(key).insertMany(value);
          this.resultData[key] = this.resultData[key] + value.length;
        }
      })
    );

    if (this.data[sequence + 1]) return await this.migratePost(sequence + 1);

    return 1;
  }

  async start() {
    await this.migratePost(0);
  }
}

(async () => {
  const worker = new PostWorker();
  await worker.start();

  const result = worker.resultData;
  parentPort.postMessage({ type: "done", resultData: result });
})();
