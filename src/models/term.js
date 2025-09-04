const { ObjectId, mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");

const getTermData = async (page) => {
  try {
    const SQL = `SELECT
       a.term_id oldId,
       a.name,
       a.slug,
       b.taxonomy,
       b.parent,
       b.description
       FROM wp_terms a
       LEFT JOIN wp_term_taxonomy b ON a.term_id = b.term_id
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

const migrateTerm = async () => {
  try {
    process.stdout.write("\rMigrating Tags and Categories...\r");
    console.clear();
    const result = await getTermData();
    const data = result.reduce(
      (acc, current, index) => {
        const exceptProp = ["parent", "taxonomy"];
        const isCat = current.taxonomy == "category";

        current._id = new ObjectId();
        current = Object.fromEntries(
          Object.entries(current).filter(([key]) => !exceptProp.includes(key))
        );

        acc[isCat ? "categories" : "tags"].push(current);
        process.stdout.write(
          `\r(Tags and Categories) Adjustment data ${index + 1}/${
            result.length
          }...\r`
        );
        return acc;
      },
      { categories: [], tags: [] }
    );

    const tempCategories = Array.from(data.categories);
    // parent assign
    data.categories = Array.from(data.categories).map((category) => ({
      ...category,
      parents: getParents(category.parent, tempCategories),
    }));

    // write to mongo
    // console.log(Object.keys(data));
    console.clear();
    process.stdout.write("\r(Tags and Categories) Writing to mongo...\r");
    return await Promise.all(
      Object.keys(data).map(async (key) => {
        return await mongo.collection(key).insertMany(data[key]);
      })
    );
  } catch (error) {
    throw new Error("Failed to migrate tags and categories");
  }
};

module.exports = { migrateTerm };
