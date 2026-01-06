const { finalizing } = require("./models/db_finalizing");
const { resetDb } = require("./models/db_reset");
const { migrateMedia } = require("./models/media");
const { migratePost } = require("./models/posts");
const { migrateTerm } = require("./models/term");
const { migrateUser } = require("./models/users");

const { isMultilanguage, migratePaketWisata } = require("./config.json");
const { migrateJadwalPelatihan } = require("./models/jadwal.pelatihan");

const option = {
  isMultilanguage: isMultilanguage,
  migratePaketWisata: migratePaketWisata,
};

(async () => {
  try {
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
    console.log("Failed to migrate");
    console.error(error);
    process.exit(1);
  }
})();
