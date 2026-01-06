const { prefix, isJadwalPelatihan } = require("../config.json");
const { mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");

const getJadwalPelatihan = async (page) => {
  try {
    const SQL = `
        SELECT jadwal_pelatihan.*
        FROM jadwal_pelatihan
        INNER JOIN
            (
                SELECT ID
                FROM ${prefix}posts
                WHERE ${prefix}posts.post_status = "publish" AND ${prefix}posts.post_type = "post"
            ) r_post ON r_post.ID = jadwal_pelatihan.postId
    `;
    const result = await query(SQL);

    return result.map((item) => {
      delete item.id;
      return item;
    });
  } catch (error) {
    throw error;
  }
};

const migrateJadwalPelatihan = async () => {
  try {
    if (!isJadwalPelatihan) return { jadwalPelatihan: 0 };

    const mongoinstance = (await mongo()).collection("jadwalPelatihan");
    const result = await getJadwalPelatihan();

    // Insert to mongo
    console.clear();
    await mongoinstance.insertMany(result);

    return { jadwalPelatihan: result.length };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to migrate jadwal pelatihan");
  }
};

module.exports = { migrateJadwalPelatihan };
