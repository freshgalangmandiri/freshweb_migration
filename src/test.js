const { mongo } = require("./db/mongo_connection");
const { migrateJadwalPelatihan } = require("./models/jadwal.pelatihan");

(async () => {
  (await mongo()).collection("jadwalPelatihan").deleteMany({});
  await migrateJadwalPelatihan();
})();
