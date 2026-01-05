const { finalizing } = require("./models/db_finalizing");
const { resetDb } = require("./models/db_reset");
const { migrateMedia } = require("./models/media");
const { migratePost } = require("./models/posts");
const { migrateTerm } = require("./models/term");
const { migrateUser } = require("./models/users");

const option = {
  isMultilanguage: true,
  migratePaketWisata: false,
};

(async () => {
  try {
    await resetDb();

    const term = await migrateTerm({ ...option });
    const user = await migrateUser();
    const media = await migrateMedia();
    const post = await migratePost({ ...option });

    return;

    await finalizing({ ...option });
    console.clear();
    console.log({
      status: "success",
      details: { ...term, ...user, ...media, ...post, ...option },
    });
    process.exit();
  } catch (error) {
    console.log("Failed to migrate");
    console.error(error);
    process.exit(1);
  }
})();
