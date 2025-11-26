const bcrypt = require("bcrypt");
const { ObjectId, mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");
const { prefix } = require("../config.json");

const getUserData = async (page) => {
  try {
    const SQL = `SELECT 
		ID,user_login username,display_name name,meta_value role
		FROM ${prefix}users
		LEFT JOIN ${prefix}usermeta ON ${prefix}users.ID = ${prefix}usermeta.user_id
		WHERE meta_key="${prefix}capabilities"`;
    const result = await query(SQL);
    return result;
  } catch (error) {
    throw error;
  }
};

const migrateUser = async () => {
  console.clear();
  process.stdout.write(`\r(Posts) Getting user data...\r`);
  try {
    const result = await getUserData();
    const data = result.map((user) => {
      // delete user.ID;
      user._id = new ObjectId();

      user.role =
        user.role.split('"')[1] == "administrator" ? "admin" : "editor";
      user.password = "";
      return user;
    });

    const generatePassword = async (password) => {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    };

    // add user admin if not exist
    const admin = {
      _id: new ObjectId(),
      username: "admin",
      name: "Administrator",
      role: "admin",
      password: await generatePassword("bismillah"),
    };

    data.push(admin);

    await (await mongo()).collection("users").insertMany(data);
    return { users: data.length };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to migrate users");
  }
};

module.exports = { migrateUser };
