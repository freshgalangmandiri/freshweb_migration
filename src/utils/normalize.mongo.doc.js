const { ObjectId } = require("../db/mongo_connection");
const { isObject } = require("./library");

const normalizeMongoDoc = (data) => {
  const checkIsClassObject = (data) =>
    typeof data === "object" &&
    !Array.isArray(data) &&
    data?.constructor !== Object;
  const normalize = (value) => {
    if (value instanceof ObjectId) return value.toString();
    if (value instanceof Date) return value.toISOString();

    return value;
  };

  if (checkIsClassObject(data)) return normalize(data);

  if (isObject(data))
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        (() => {
          if (checkIsClassObject(value)) return normalize(value);
          if (Array.isArray(value))
            return value.map((item) => normalizeMongoDoc(item));
          if (isObject(value)) return normalizeMongoDoc(value);
          return value;
        })(),
      ])
    );

  if (Array.isArray(data)) return data.map((item) => normalizeMongoDoc(item));
};

module.exports = { normalizeMongoDoc };
