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

module.exports = {
  splitArray,
  isObject,
  spliceObject,
  convertCompatibleContent,
};
