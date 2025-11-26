const { JSDOM } = require("jsdom");

const executeFilter = (role, content) => {
  if (!content) return "";

  const { document } = new JSDOM(content).window;
  const roles = {
    Media: () => {
      return Array.from(document.querySelectorAll("img")).map((item) =>
        item.src.replace(
          "https://arenawisata.co.id/wp-content/uploads/",
          "/media/"
        )
      );
    },
    StartFrom: () => content,
    Destinasi: () => {
      const days = Array.from(document.querySelectorAll("ul"));
      return days.reduce(
        (acc, item, index) => ({
          ...acc,
          [`Day ${index + 1}`]: Array.from(item.querySelectorAll("li")).map(
            (item) => item.textContent
          ),
        }),
        {}
      );
    },
    Fasilitas: () => {
      const H3 = Array.from(document.querySelectorAll(" h3")).map(
        (item) => item.textContent
      );
      const UL = Array.from(document.querySelectorAll("ul"));
      return UL.reduce(
        (acc, item, index) => ({
          ...acc,
          [H3[index]]: Array.from(item.querySelectorAll("li")).map(
            (item) => item.textContent
          ),
        }),
        {}
      );
    },
    Itinerary: () => {
      const days = Array.from(document.querySelectorAll("ul"));
      return days.reduce(
        (acc, item, index) => ({
          ...acc,
          [`Day ${index + 1}`]: Array.from(item.querySelectorAll("li")).map(
            (item) => item.textContent
          ),
        }),
        {}
      );
    },
    Harga: () => content,
    sk: () => {
      return Array.from(document.querySelectorAll("li")).map(
        (item) => item.textContent
      );
    },
  };

  return (roles[role] || (() => ""))();
};

const formatPw = (pw) => {
  const tags = [...pw.matchAll(/<!--(\w+)-->/g)]
    .map((match) => match[1])
    .filter((item) => item !== "End");

  return tags
    .map((tag) => {
      const regex = new RegExp(`<!--${tag}-->(.*?)<!--End-->`, `s`);
      const contentByTag = pw.match(regex)[1].trim().replace(1);

      return {
        tag,
        content: executeFilter(tag, contentByTag),
      };
    })
    .reduce((acc, item) => ({ ...acc, [item.tag]: item.content }), {});
};

const isIntersection = (arr1, arr2) => arr1.some((item) => arr2.includes(item));

module.exports = { formatPw, isIntersection };
