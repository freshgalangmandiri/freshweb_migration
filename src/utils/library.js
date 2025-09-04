const splitArray = (arr, size) =>
  arr.reduce((acc, curr, i) => {
    size = size || 1;
    if (i % size === 0) acc.push([curr]);
    else acc[acc.length - 1].push(curr);
    return acc;
  }, []);

const isObject = (obj) =>
  obj !== null && typeof obj === "object" && !Array.isArray(obj);

module.exports = { splitArray, isObject };
