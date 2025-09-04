const { finalizing } = require("./models/db_finalizing");
const { resetDb } = require("./models/db_reset");
const { migrateMedia } = require("./models/media");
const { migratePost } = require("./models/posts");
const { migrateTerm } = require("./models/term");
const { migrateUser } = require("./models/users");

(async () => {
  try {
    await resetDb();
    await migrateTerm();
    await migrateUser();
    await migrateMedia();
    await migratePost();

    await finalizing();
    console.clear();
    console.log({ status: "success" });
    process.exit();
  } catch (error) {
    console.log("Failed to migrate");
    console.error(error);
    process.exit(1);
  }
})();
