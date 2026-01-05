const parseInlineFormatting = (text) => {
  // Parse bold (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  text = text.replace(/__(.+?)__/g, "<b>$1</b>");

  // Parse italic (*text* or _text_) - but not after ** or __
  text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<i>$1</i>");
  text = text.replace(/(?<!_)_([^_]+?)_(?!_)/g, "<i>$1</i>");

  // Parse strikethrough (~~text~~)
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // Parse code (`code`)
  text = text.replace(/`(.+?)`/g, "<code class='inline-code'>$1</code>");

  // Parse links [text](url)
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Parse images ![alt](url)
  text = text.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');

  return text;
};

const parseTableRow = (row) => {
  // Remove leading/trailing pipes and split
  const cells = row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  return cells;
};

const isTableSeparator = (line) => {
  // Check if line is a table separator (e.g., |---|---|)
  return /^\|?[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)+\|?$/.test(line);
};

export const convertMarkdownToJSON = (markdownText) => {
  const lines = markdownText.split("\n");
  const blocks = [];
  let currentList = null;
  let currentListStyle = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      // If we were building a list, save it
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }
      i++;
      continue;
    }

    // Tables - Check if current line and next line form a table
    if (line.startsWith("|") && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();

      if (isTableSeparator(nextLine)) {
        if (currentList) {
          blocks.push({
            type: "list",
            data: {
              style: currentListStyle,
              meta: {},
              items: currentList.map((item) => ({
                content: parseInlineFormatting(item),
                meta: {},
                items: [],
              })),
            },
          });
          currentList = null;
          currentListStyle = null;
        }

        // Parse table header
        const headers = parseTableRow(line);

        // Skip separator line
        i += 2;

        // Parse table rows
        const content = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          const rowData = parseTableRow(lines[i]);
          content.push(rowData.map((cell) => parseInlineFormatting(cell)));
          i++;
        }

        blocks.push({
          type: "table",
          data: {
            withHeadings: true,
            content: [headers.map((h) => parseInlineFormatting(h)), ...content],
          },
        });
        continue;
      }
    }

    // Headers
    if (line.startsWith("#")) {
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }

      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s*/, "");
      blocks.push({
        type: "header",
        data: {
          text: parseInlineFormatting(text),
          level: Math.min(level, 6),
        },
      });
      i++;
      continue;
    }

    // Unordered lists (-, *, +)
    if (line.match(/^[-*+]\s+/)) {
      const content = line.replace(/^[-*+]\s+/, "");

      if (!currentList || currentListStyle !== "unordered") {
        if (currentList) {
          blocks.push({
            type: "list",
            data: {
              style: currentListStyle,
              meta: {},
              items: currentList.map((item) => ({
                content: parseInlineFormatting(item),
                meta: {},
                items: [],
              })),
            },
          });
        }
        currentList = [];
        currentListStyle = "unordered";
      }

      currentList.push(content);
      i++;
      continue;
    }

    // Ordered lists (1. 2. 3.)
    if (line.match(/^\d+\.\s+/)) {
      const content = line.replace(/^\d+\.\s+/, "");

      if (!currentList || currentListStyle !== "ordered") {
        if (currentList) {
          blocks.push({
            type: "list",
            data: {
              style: currentListStyle,
              meta: {},
              items: currentList.map((item) => ({
                content: parseInlineFormatting(item),
                meta: {},
                items: [],
              })),
            },
          });
        }
        currentList = [];
        currentListStyle = "ordered";
      }

      currentList.push(content);
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }

      let codeContent = "";
      const language = line.replace("```", "").trim() || "plaintext";
      i++;

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeContent += lines[i] + "\n";
        i++;
      }

      blocks.push({
        type: "code",
        data: {
          code: codeContent.trim(),
        },
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }

      const text = line.replace(/^>\s*/, "");
      blocks.push({
        type: "quote",
        data: {
          text: parseInlineFormatting(text),
          caption: "",
          alignment: "left",
        },
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }

      blocks.push({
        type: "delimiter",
        data: {},
      });
      i++;
      continue;
    }

    // Image standalone (![alt](url))
    const imageMatch = line.match(/^!\[(.+?)\]\((.+?)\)$/);
    if (imageMatch) {
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }

      blocks.push({
        type: "image",
        data: {
          file: {
            url: imageMatch[2],
          },
          caption: imageMatch[1],
          withBorder: false,
          withBackground: false,
          stretched: false,
        },
      });
      i++;
      continue;
    }

    // Link standalone ([text](url))
    const linkMatch = line.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkMatch) {
      if (currentList) {
        blocks.push({
          type: "list",
          data: {
            style: currentListStyle,
            meta: {},
            items: currentList.map((item) => ({
              content: parseInlineFormatting(item),
              meta: {},
              items: [],
            })),
          },
        });
        currentList = null;
        currentListStyle = null;
      }

      blocks.push({
        type: "paragraph",
        data: {
          text: `<a href="${linkMatch[2]}">${linkMatch[1]}</a>`,
        },
      });
      i++;
      continue;
    }

    // Regular paragraph
    if (currentList) {
      blocks.push({
        type: "list",
        data: {
          style: currentListStyle,
          meta: {},
          items: currentList.map((item) => ({
            content: parseInlineFormatting(item),
            meta: {},
            items: [],
          })),
        },
      });
      currentList = null;
      currentListStyle = null;
    }

    blocks.push({
      type: "paragraph",
      data: {
        text: parseInlineFormatting(line),
      },
    });
    i++;
  }

  // Handle remaining list
  if (currentList) {
    blocks.push({
      type: "list",
      data: {
        style: currentListStyle,
        meta: {},
        items: currentList.map((item) => ({
          content: parseInlineFormatting(item),
          meta: {},
          items: [],
        })),
      },
    });
  }

  return {
    time: Date.now(),
    blocks: blocks,
    version: "2.28.0",
  };
};
