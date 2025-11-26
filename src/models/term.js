const { ObjectId, mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");
const { prefix } = require("../config.json");
const { spliceObject } = require("../utils/library");

const getTermData = async (page) => {
  try {
    const SQL = `SELECT
       a.term_id oldId,
       a.name,
       a.slug,
       b.taxonomy,
       b.parent,
       b.description
       FROM ${prefix}terms a
       LEFT JOIN ${prefix}term_taxonomy b ON a.term_id = b.term_id
       WHERE b.taxonomy IN ("category","post_tag")`;
    const result = await query(SQL);
    return result;
  } catch (error) {
    throw error;
  }
};

const getParents = (id, data, parents = []) => {
  const parent = data.find((item) => item.oldId == id);
  if (!parent) return parents;

  parents.push(parent._id);

  if (parent.parent) return getParents(parent.parent, data, parents);
  else return parents;
};

const migrateTerm = async ({ migratePaketWisata }) => {
  try {
    console.clear();
    process.stdout.write("\rMigrating Tags and Categories...\r");
    const result = await getTermData();
    const paketwisataID = [];

    const data = result.reduce(
      (acc, current, index) => {
        // const exceptProp = ["parent", "taxonomy"];
        const exceptProp = ["taxonomy"];
        const isCat = current.taxonomy == "category";

        current._id = new ObjectId();
        current = Object.fromEntries(
          Object.entries(current).filter(([key]) => !exceptProp.includes(key))
        );

        if (["paket-wisata", "paket-wisata-overseas"].includes(current.slug))
          paketwisataID.push(current._id.toString());

        acc[isCat ? "categories" : "tags"].push(current);
        process.stdout.write(
          `\r(Tags and Categories) Adjustment data ${index + 1}/${
            result.length
          } (${(((index + 1) / result.length) * 100).toFixed(2)} %)...\r`
        );
        return acc;
      },
      { categories: [], tags: [] }
    );

    // console.log({ paketwisataID });
    // throw new Error("stop");

    const tempCategories = Array.from(data.categories);
    // parent assign
    data.categories = Array.from(data.categories).map(
      (category) =>
        spliceObject(
          {
            ...category,
            parents: getParents(category.parent, tempCategories),
            isPaketWisata:
              getParents(category.parent, tempCategories).some((item) =>
                paketwisataID.some((id) => id == item.toString())
              ) || paketwisataID.some((id) => id == category._id.toString()),
          },
          ["parent"]
        ).spliced
    );

    if (!migratePaketWisata) {
      data.categories = data.categories.filter(
        (category) => !category.isPaketWisata
      );
    }

    data.categories = data.categories.map(
      (item) => spliceObject(item, ["isPaketWisata"]).spliced
    );

    // write to mongo
    // console.log(Object.keys(data));
    console.clear();
    process.stdout.write(
      "\r(Tags and Categories) Writing to (await mongo())...\r"
    );
    return Object.fromEntries(
      await Promise.all(
        Object.entries(data).map(async ([key, value]) => {
          if (value.length) {
            await (await mongo()).collection(key).insertMany(value);
            return [key, value.length];
          }

          return [key, 0];
        })
      )
    );
  } catch (error) {
    throw new Error("Failed to migrate tags and categories");
  }
};

module.exports = { migrateTerm };
