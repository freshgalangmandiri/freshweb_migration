const { initial } = require("./initial");
const { testDB } = require("./models/db_testconnection");
const { resetDb } = require("./models/db_reset");
const { finalizing } = require("./models/db_finalizing");
const { migrateMedia } = require("./models/media");
const { migratePost } = require("./models/posts");
const { migrateTerm } = require("./models/term");
const { migrateUser } = require("./models/users");
const { migrateJadwalPelatihan } = require("./models/jadwal.pelatihan");

const { isMultilanguage, migratePaketWisata } = require("./config.json");

const option = {
  isMultilanguage: isMultilanguage,
  migratePaketWisata: migratePaketWisata,
};

(async () => {
  try {
    await initial();
    await testDB();
    await resetDb();

    const term = await migrateTerm({ ...option });
    const user = await migrateUser();
    const media = await migrateMedia();
    const jadwalPelatihan = await migrateJadwalPelatihan();
    const post = await migratePost({ ...option });

    await finalizing({ ...option });
    console.clear();
    console.log({
      status: "success",
      details: {
        ...term,
        ...user,
        ...media,
        ...jadwalPelatihan,
        ...post,
        ...option,
      },
    });
    process.exit();
  } catch (error) {
    console.clear();
    console.log("Failed to migrate");
    console.error(error);
    process.exit(1);
  }
})();
