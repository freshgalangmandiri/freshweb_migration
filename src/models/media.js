const { mongo, ObjectId } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");

const getMediaData = async (page) => {
  try {
    const SQL = `SELECT 
		ID oldId, post_date createdAt, post_title title, SUBSTRING_INDEX(guid, '/', -1) filename, CONCAT('/media/', SUBSTRING_INDEX(guid, 'uploads/', -1)) url FROM wp_posts 
		WHERE post_type = "attachment" AND post_mime_type LIKE "image/%"`;
    const result = await query(SQL);
    return result;
  } catch (error) {
    throw error;
  }
};

const migrateMedia = async () => {
  console.clear();
  process.stdout.write(`\r(Media) Getting media data...\r`);
  try {
    const result = await getMediaData();

    return await mongo.collection("media").insertMany(
      result.map((item) => ({
        ...item,
        _id: new ObjectId(),
      }))
    );
  } catch (error) {
    console.log(error);
    throw new Error("Failed to migrate media");
  }
};

module.exports = { migrateMedia };
