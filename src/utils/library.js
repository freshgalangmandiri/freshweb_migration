const { htmlToMarkdown } = require("./htmlToMarkdown");
const { convertMarkdownToJSON } = require("./markdown.to.json");

const splitArray = (arr, size) =>
  arr.reduce((acc, curr, i) => {
    size = size || 1;
    if (i % size === 0) acc.push([curr]);
    else acc[acc.length - 1].push(curr);
    return acc;
  }, []);

const isObject = (obj) =>
  obj !== null && typeof obj === "object" && !Array.isArray(obj);

const spliceObject = (obj, keys = [], removeEmpty = true) => {
  if (!obj) return;
  return {
    selected: Object.entries(obj)
      .filter(
        ([key, value]) =>
          keys.includes(key) &&
          (!removeEmpty || value || typeof value === "boolean")
      )
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
    spliced: Object.entries(obj)
      .filter(
        ([key, value]) =>
          !keys.includes(key) &&
          (!removeEmpty || value || typeof value === "boolean")
      )
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
  };
};

const convertCompatibleContent = (content) => {
  if (!content) return content;

  const markdown = htmlToMarkdown(content);
  const jsonData = convertMarkdownToJSON(markdown);

  return jsonData;
};

const encodeBase62 = (number) => {
  const CHARSET =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let num = BigInt("0x" + number);
  let result = "";

  while (num > 0n) {
    result = CHARSET[Number(num % 62n)] + result;
    num = num / 62n;
  }

  return result;
};

const decodeBase62 = (shortId) => {
  const CHARSET =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let num = 0n;
  for (const char of shortId) {
    num = num * 62n + BigInt(CHARSET.indexOf(char));
  }

  return num.toString(16);
};

module.exports = {
  splitArray,
  isObject,
  spliceObject,
  convertCompatibleContent,
  encodeBase62,
  decodeBase62,
};
