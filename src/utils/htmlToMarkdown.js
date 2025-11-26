const { JSDOM } = require("jsdom");

function htmlToMarkdown(html) {
  // Create a DOM environment
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();

  // Node type constants
  const TEXT_NODE = 3;
  const ELEMENT_NODE = 1;

  // Decode HTML entities
  function decodeEntities(text) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Process table
  function processTable(node) {
    let md = "\n";
    const rows = Array.from(node.querySelectorAll("tr"));

    if (rows.length === 0) return "";

    rows.forEach((row, i) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      md +=
        "| " +
        cells.map((cell) => processNode(cell).trim()).join(" | ") +
        " |\n";

      // Add separator after header row
      if (i === 0 && row.querySelector("th")) {
        md += "| " + cells.map(() => "---").join(" | ") + " |\n";
      }
    });

    return md + "\n";
  }

  // Check if node is inside specific parent types
  function isInsideTag(node, tagNames) {
    let current = node.parentNode;
    while (current) {
      if (current.tagName && tagNames.includes(current.tagName.toLowerCase())) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  // Strip markdown formatting from text
  function stripMarkdown(text) {
    return text
      .replace(/\*\*/g, "") // Remove bold
      .replace(/\*/g, "") // Remove italic
      .replace(/~~/g, "") // Remove strikethrough
      .replace(/`/g, "") // Remove code
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1"); // Remove links, keep text
  }

  function processNode(node, listDepth = 0) {
    let result = "";

    // Handle text nodes
    if (node.nodeType === TEXT_NODE) {
      return decodeEntities(node.textContent);
    }

    // Handle element nodes
    if (node.nodeType === ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      let children = "";

      // Check if inside heading or list item
      const insideHeading = isInsideTag(node, [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
      ]);
      const insideLi = isInsideTag(node, ["li"]);

      for (const child of node.childNodes) {
        children += processNode(child, listDepth);
      }

      const indent = "  ".repeat(listDepth);

      switch (tag) {
        case "h1":
          return `# ${stripMarkdown(children)}\n\n`;
        case "h2":
          return `## ${stripMarkdown(children)}\n\n`;
        case "h3":
          return `### ${stripMarkdown(children)}\n\n`;
        case "h4":
          return `#### ${stripMarkdown(children)}\n\n`;
        case "h5":
          return `##### ${stripMarkdown(children)}\n\n`;
        case "h6":
          return `###### ${stripMarkdown(children)}\n\n`;
        case "p":
          return `${children}\n\n`;
        case "strong":
        case "b":
          // Don't add bold markers if inside heading
          if (insideHeading) return children;
          return `**${children}**`;
        case "em":
        case "i":
          // Don't add italic markers if inside heading
          if (insideHeading) return children;
          return `*${children}*`;
        case "del":
        case "s":
        case "strike":
          if (insideHeading) return children;
          return `~~${children}~~`;
        case "sup":
          return `<sup>${children}</sup>`;
        case "sub":
          return `<sub>${children}</sub>`;
        case "code":
          // Check if inside pre tag
          if (
            node.parentNode &&
            node.parentNode.tagName.toLowerCase() === "pre"
          ) {
            return children;
          }
          if (insideHeading) return children;
          return `\`${children}\``;
        case "pre":
          // Check for language class
          const codeEl = node.querySelector("code");
          let lang = "";
          if (codeEl) {
            const classMatch = codeEl.className.match(/language-(\w+)/);
            lang = classMatch ? classMatch[1] : "";
          }
          const code = codeEl ? processNode(codeEl) : children;
          return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        case "a":
          const href = node.getAttribute("href") || "";
          // Don't add link markers if inside heading, just use text
          if (insideHeading) return children;
          return `[${children}](${href})`;
        case "img":
          const src = node.getAttribute("src") || "";
          const alt = node.getAttribute("alt") || "";
          const newSrc = src
            ? `/media/${src.split("/")?.slice(-3)?.join("/")}`
            : "";

          return `![${alt}](${newSrc})`;
        case "ul":
          let ulResult = "";
          for (const child of node.children) {
            if (child.tagName.toLowerCase() === "li") {
              ulResult += `${indent}- ${processNode(
                child,
                listDepth + 1
              ).trim()}\n`;
            }
          }
          return ulResult + (listDepth === 0 ? "\n" : "");
        case "ol":
          let olResult = "";
          let idx = 1;
          for (const child of node.children) {
            if (child.tagName.toLowerCase() === "li") {
              olResult += `${indent}${idx}. ${processNode(
                child,
                listDepth + 1
              ).trim()}\n`;
              idx++;
            }
          }
          return olResult + (listDepth === 0 ? "\n" : "");
        case "li":
          return children;
        case "blockquote":
          const lines = children.split("\n").filter((l) => l.trim());
          return lines.map((line) => `> ${line}`).join("\n") + "\n\n";
        case "hr":
          return "---\n\n";
        case "br":
          return "  \n";
        case "table":
          return processTable(node);
        case "thead":
        case "tbody":
        case "tr":
        case "th":
        case "td":
          return children;
        case "dl":
          return `${children}\n`;
        case "dt":
          return `**${children}**\n`;
        case "dd":
          return `: ${children}\n\n`;
        case "div":
        case "span":
        case "article":
        case "section":
        case "header":
        case "footer":
        case "main":
        case "nav":
        case "aside":
          return children;
        default:
          return children;
      }
    }

    return result;
  }

  let markdown = "";
  for (const node of temp.childNodes) {
    markdown += processNode(node);
  }

  // Clean up extra newlines
  return markdown.trim().replace(/\n{3,}/g, "\n\n");
}

// Export for CommonJS
module.exports = { htmlToMarkdown };
