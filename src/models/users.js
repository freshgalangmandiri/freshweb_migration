const { ObjectId, mongo } = require("../db/mongo_connection");
const { query } = require("../db/mysql_connnection");

const getUserData = async (page) => {
  try {
    const SQL = `SELECT 
		ID,user_login username,display_name name,meta_value role
		FROM wp_users
		LEFT JOIN wp_usermeta ON wp_users.ID = wp_usermeta.user_id
		WHERE meta_key="wp_capabilities"`;
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

    return await mongo.collection("users").insertMany(data);
  } catch (error) {
    console.log(error);
    throw new Error("Failed to migrate users");
  }
};

module.exports = { migrateUser };
