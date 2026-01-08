const config = require("./config.json");

const initial = async () => {
  return new Promise((resolve) => {
    console.log({
      ...config,
      version: "1.0.9",
    });

    setTimeout(() => resolve(), 5000);
  });
};

module.exports = { initial };
