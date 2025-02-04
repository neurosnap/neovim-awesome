import { marked } from "../deps.ts";
import type { Plugin } from "../types.ts";

await init().catch(console.error);

async function init() {
  const db = {};
  await clean({
    htmlDb: db,
    dbFile: "./data/db.json",
    mdFile: "./data/markdown.json",
  });
  await clean({
    htmlDb: db,
    dbFile: "./data/db-config.json",
    mdFile: "./data/markdown-config.json",
  });
  await save(db);
}

async function clean(
  { htmlDb, dbFile, mdFile }: {
    htmlDb: { [key: string]: string };
    dbFile: string;
    mdFile: string;
  },
) {
  const file = await Deno.readTextFile(dbFile);
  const db = JSON.parse(file.toString());
  const markdownFile = await Deno.readTextFile(mdFile);
  const markdownDb = JSON.parse(markdownFile.toString());
  const domain = "https://github.com";
  const domainRaw = "https://raw.githubusercontent.com";

  const plugins = Object.values(db.plugins) as Plugin[];
  plugins.forEach((plugin) => {
    console.log(`processing ${plugin.id}`);
    marked.use({
      walkTokens: (token: any) => {
        if (
          token.href &&
          !token.href.startsWith("http") &&
          !token.href.startsWith("#")
        ) {
          if (token.type === "link") {
            const pre = `${domain}/${plugin.username}/${plugin.repo}/blob/${plugin.branch}`;
            token.href = `${pre}/${token.href.replace("./", ``)}`;
          } else if (token.type === "image") {
            const pre = `${domainRaw}/${plugin.username}/${plugin.repo}/${plugin.branch}`;
            token.href = `${pre}/${token.href.replace("./", ``)}`;
          }
        } else if (token.type === "html") {
          token.text = "";
        }
      },
    });

    const markdown = markdownDb.markdown[plugin.id];
    if (!markdown) return;
    const html = marked(markdown);
    htmlDb[plugin.id] = html;
  });
}

async function save(nextDb: { [key: string]: string }) {
  try {
    const json = JSON.stringify({ html: nextDb }, null, 2);
    await Deno.writeTextFile("./data/html.json", json);
  } catch (err) {
    console.error(err);
  }
}
