import { dirname } from "https://deno.land/std/path/mod.ts";

import dbFile from "../data/db.json" assert { type: "json" };
import htmlFile from "../data/html.json" assert { type: "json" };

import { format, relativeTimeFromDates } from "../src/date.ts";
import { derivePluginData } from "../src/plugin-data.ts";
import type {
  Plugin,
  PluginData,
  PluginMap,
  Tag,
  TagMap,
} from "../src/types.ts";

async function createFile(fname: string, data: string) {
  await Deno.mkdir(dirname(fname), { recursive: true });
  await Deno.writeTextFile(fname, data);
}

const sortNum = (a: number, b: number) => b - a;
const sortDateStr = (a: string, b: string) => {
  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();
  return dateB - dateA;
};

function onSort(by: keyof Plugin) {
  if (by === "createdAt") {
    return (a: Plugin, b: Plugin) => sortDateStr(a.createdAt, b.createdAt);
  }
  if (by === "updatedAt") {
    return (a: Plugin, b: Plugin) => sortDateStr(a.updatedAt, b.updatedAt);
  }
  return (a: Plugin, b: Plugin) => sortNum(a.stars, b.stars);
}

const createHtmlFile = ({ head, body }: { head: string; body: string }) => {
  return `
<!DOCTYPE html>
<html lang="en" data-theme="theme-dark">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" type="text/css" href="/reset.css" />
    <link rel="stylesheet" type="text/css" href="/main.css" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="600" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta property="og:url" content="https://neovimcraft.com" />
    <meta property="og:image" content="https://neovimcraft.com/neovimcraft.png" />
    <meta
      name="description"
      content="Search through our curated neovim plugin directory."
    />
    <meta property="og:title" content="neovimcraft" />
    <meta
      property="og:description"
      content="Search through our curated neovim plugin directory."
    />
    <meta name="twitter:image:src" content="https://neovimcraft.com/neovimcraft.png" />

    ${head}
  </head>
  <body>
    <div id="app">${body}</div>
  </body>
</html>`;
};

const createNav = () => {
  const links = [
    ["/", "plugins"],
    ["/about", "about"],
  ];

  const linksStr = links.reduce((acc, link) => {
    acc += `<a href="${link[0]}" class="link">${link[1]}</a>\n`;
    return acc;
  }, "");

  return `
<div class="nav">
  <h1 id="logo">
    <a href="/" class="logo-header">neovimcraft</a>
    <a href="https://github.com/neurosnap/neovimcraft" class="gh">
      ${createIcon("github")}
    </a>
  </h1>
  <div class="links">
    ${linksStr}
  </div>
  <div class="menu-btn" id="menu-btn"><img src="/menu.svg" alt="menu" /></div>

  <div class="menu-container hidden" id="menu">
    <div class="menu-overlay menu-close"></div>
    <div class="menu">
      <div class="menu-header">
        <h1><a href="/" class="logo-header">neovimcraft</a></h1>
        <div class="menu-btn menu-close"><img src="/menu.svg" alt="menu" /></div>
      </div>
      <div class="menu-body">
        ${linksStr}
      </div>
    </div>
  </div>
</div>`;
};

const createIcon = (icon: string) => {
  return `<img class="icon" src="/${icon}.svg" alt=${icon} />`;
};

function findColor(tag: Tag) {
  if (tag.count === 1) return "pink";
  if (tag.count > 1 && tag.count <= 3) return "yellow";
  if (tag.count > 3 && tag.count <= 10) return "orange";
  if (tag.count > 10 && tag.count <= 15) return "green";
  return "purple";
}

const createTag = (tag: Tag, showCount = true) => {
  const countStr = showCount ? `&nbsp;x&nbsp;${tag.count}` : "";
  const color = findColor(tag);
  return `<span class="tag ${color}" data-id="${tag.id}">${tag.id}${countStr}</span>`;
};

const createPluginItem = (plugin: Plugin, tags: Tag[]) => {
  const tagsStr = tags.reduce((acc, tag) => {
    acc += createTag(tag, false);
    return acc;
  }, "");
  const dataRepo = plugin.repo.toLocaleLowerCase();
  const dataDesc = (plugin.description || "").toLocaleLowerCase();
  const dataTags = tags
    .map((t) => t.id)
    .join(",")
    .toLocaleLowerCase();

  return `
<div class="container plugin" data-repo="${dataRepo}" data-desc="${dataDesc}" data-tags="${dataTags}">
  <div class="header">
    <h2 class="item_header">
      <a href="/plugin/${plugin.username}/${plugin.repo}">${plugin.repo}</a>
    </h2>
    <div class="metrics">
      <Tooltip tip="github repo" bottom>
        <a href=${plugin.link}>${createIcon("github")}</a>
      </Tooltip>
      <Tooltip tip="stars" bottom>
        <div class="metric-item">${
    createIcon("star")
  } <span>${plugin.stars}</span></div>
      </Tooltip>
      <Tooltip tip="open issues" bottom>
        <div class="metric-item">
          ${createIcon("alert-circle")} <span>${plugin.openIssues}</span>
        </div>
      </Tooltip>
    </div>
  </div>
  <div class="date">
    updated ${relativeTimeFromDates(new Date(plugin.updatedAt))}
  </div>
  <div class="desc">
    ${plugin.description}
  </div>
  <div class="tags">
    ${tagsStr}
  </div>
</div>`;
};

function getTags(tagDb: TagMap, tags: string[]): Tag[] {
  return tags.map((t) => tagDb[t]).filter(Boolean);
}

const createAboutPage = () => {
  const head = `
<title>neovimcraft - about</title>
<meta name="description" content="About neovimcraft" />
<meta property="og:description" content="About neovimcraft" />
<meta property="og:title" content="neovimcraft - about" />`;
  const nav = createNav();
  const body = `${nav}
<div class="about_container">
  <div class="about_view">
    <div class="intro">
      <div class="blurb">
        <h1>Hey all!</h1>
        <p>
          My name is <strong>Eric Bower</strong> and I built this site because neovim is awesome and
          I want to provide resources for searching an building neovim plugins.
        </p>
      </div>
      <img class="profile" src="/me.jpg" alt="Eric Bower" />
    </div>
    <div>
      <p>
        I&apos;m a professional software engineer who has been programming since I was 13 years old.
        I love building software as much as I love building something that people find useful. Most
        of my time is devoted to growing my ability to build products.
      </p>
      <p>
        I also care deeply about open-source code and have an active
        <a href="https://github.com/neurosnap">Github</a>
        , check it out if you&apos;re interested. I also write
        <a href="https://erock.io">blog articles about software</a>.
      </p>
      <p>
        I&apos;m happy to read feedback about neovimcraft so please feel free to
        <a href="mailto:neovimcraft@erock.io">email me</a>.
      </p>
    </div>
    <div>
      <h2>FAQ</h2>
      <p>Do you have questions not answered here? Email me!</p>
      <h3>Where do we get our content from?</h3>
      <p>
        As of right now, most of our data is scraped from github. You can find our scrape script
        <a
          href="https://github.com/neurosnap/neovimcraft/blob/main/scripts/scrape.ts"
         >here</a
        >.
      </p>
      <h3>How can I submit a plugin or resource to this project?</h3>
      <p>
        Please read the <a href="https://github.com/neurosnap/neovimcraft#want-to-submit-a-plugin">neovimcraft README</a>.
      </p>
    </div>
  </div>
</div>`;

  return createHtmlFile({ head, body });
};

const createSearchPage = (data: PluginData, by: keyof Plugin) => {
  const pluginsStr = data.plugins.sort(onSort(by)).reduce((acc, plugin) => {
    const plug = createPluginItem(plugin, getTags(data.tagDb, plugin.tags));
    return `${acc}\n${plug}`;
  }, "");
  const tagListStr = data.tags.reduce(
    (acc, tag) => `${acc}\n${createTag(tag)}`,
    "",
  );
  const sortStr = () => {
    let str = "";
    if (by === "stars") {
      str += "stars\n";
    } else {
      str += '<a href="/">stars</a>\n';
    }

    if (by === "createdAt") {
      str += "created\n";
    } else {
      str += '<a href="/created">created</a>\n';
    }

    if (by === "updatedAt") {
      str += "updated\n";
    } else {
      str += '<a href="/updated">updated</a>\n';
    }

    return str;
  };

  const head = `
<title>neovimcraft</title>
  <meta property="og:title" content="neovimcraft" />
  <meta
    name="description"
    content="Search through our curated neovim plugin directory."
  />
  <meta
    property="og:description"
    content="Search through our curated neovim plugin directory."
  />
  <script src="/client.js" type="text/javascript"></script>
`;
  const nav = createNav();
  const body = `${nav}
<div class="search_container">
  <div class="search_view">
    <span class="search_icon">${createIcon("search")}</span>
    <input
      id="search"
      value=""
      placeholder="search to find a plugin"
      autocapitalize="off"
    />
    <span class="search_clear_icon" id="search_clear">
      ${createIcon("x-circle")}
    </span>
  </div>
  <div class="desc">
    Search through our curated list of neovim plugins
  </div>

  <div class="sidebar">
    ${tagListStr}
  </div>
  <div class="rightbar">
    <div>Want to search for plugins in the terminal? <a href="https://nvim.sh">https://nvim.sh</a></div>
  </div>
  <div class="plugins">
    <div class="plugins_container">
      <div class="search_results">${data.plugins.length} results</div>
      <div>
        ${sortStr()}
      </div>
      <div id="plugins_list">
        ${pluginsStr}
      </div>
    </div>
  </div>
</div>`;

  return createHtmlFile({ head, body });
};

const createPluginView = (plugin: Plugin, tags: Tag[]) => {
  const tagsStr = tags.reduce((acc, tag) => {
    acc += createTag(tag, false);
    return acc;
  }, "");

  return `
<div class="meta">
  <div class="tags_view">
    ${tagsStr}
  </div>
  <div class="metrics_view">
    <Tooltip tip="stars" bottom>
      <div class="metric">${
    createIcon("star")
  } <span>${plugin.stars}</span></div>
    </Tooltip>
    <Tooltip tip="open issues" bottom>
      <div class="metric">${
    createIcon("alert-circle")
  } <span>${plugin.openIssues}</span></div>
    </Tooltip>
    <Tooltip tip="subscribers" bottom>
      <div class="metric">${
    createIcon("users")
  } <span>${plugin.subscribers}</span></div>
    </Tooltip>
    <Tooltip tip="forks" bottom>
      <div class="metric">${
    createIcon("git-branch")
  } <span>${plugin.forks}</span></div>
    </Tooltip>
  </div>
  <div class="timestamps">
    <div>
      <h5 class="ts_header">CREATED</h5>
      <h2>${format(new Date(plugin.createdAt))}</h2>
    </div>
    <div>
      <h5 class="ts_header">UPDATED</h5>
      <h2>${relativeTimeFromDates(new Date(plugin.updatedAt))}</h2>
    </div>
  </div>
  <hr />
</div>
`;
};

const createPluginPage = (plugin: Plugin, tags: Tag[], html: string) => {
  const head = `
<title>
  ${plugin.id}: ${plugin.description}
</title>
<meta property="og:title" content=${plugin.id} />
<meta name="twitter:title" content=${plugin.id} />
<meta itemprop="name" content=${plugin.id} />

<meta name="description" content="${plugin.id}: ${plugin.description}" />
<meta itemprop="description" content="${plugin.id}: ${plugin.description}" />
<meta property="og:description" content="${plugin.id}: ${plugin.description}" />
<meta name="twitter:description" content="${plugin.id}: ${plugin.description}" />`;
  const nav = createNav();
  const body = `${nav}
<div class="plugin_container">
  <div class="view">
    <div class="header">
      <h1>${plugin.id}</h1>
      ${plugin.homepage ? `<a href=${plugin.homepage}>website</a>` : ""}
      <a href=${plugin.link}>${createIcon("github")} <span>github</span></a>
    </div>
    ${createPluginView(plugin, tags)}
    ${html}
  </div>
</div>
`;
  return createHtmlFile({ head, body });
};

async function render(data: PluginData, htmlData: { [key: string]: string }) {
  const files = [
    createFile("./static/index.html", createSearchPage(data, "stars")),
    createFile(
      "./static/created/index.html",
      createSearchPage(data, "createdAt"),
    ),
    createFile(
      "./static/updated/index.html",
      createSearchPage(data, "updatedAt"),
    ),
    createFile("./static/about/index.html", createAboutPage()),
  ];

  data.plugins.forEach((plugin) => {
    const tags = getTags(data.tagDb, plugin.tags);
    const id = `${plugin.username}/${plugin.repo}`;
    const html = htmlData[id] || "";
    const fname =
      `./static/plugin/${plugin.username}/${plugin.repo}/index.html`;
    const page = createPluginPage(plugin, tags, html);
    files.push(createFile(fname, page));
  });

  await Promise.all(files);
}

interface HTMLFile {
  html: { [key: string]: string };
}

const htmlData = (htmlFile as HTMLFile).html;
const pluginMap = (dbFile as any).plugins as PluginMap;
const pluginData = derivePluginData(pluginMap);
render(pluginData, htmlData).then(console.log).catch(console.error);
