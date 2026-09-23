import { existsSync } from "node:fs";

import { RenderPlugin } from "@11ty/eleventy";

import site from "./src/_data/site.json" with { type: "json" };

export default function (eleventyConfig) {
  // /privacy and /terms render docs/privacy.md and docs/terms.md through
  // Eleventy's own Markdown engine (see src/_data/legal.js).
  eleventyConfig.addPlugin(RenderPlugin);
  eleventyConfig.addWatchTarget("docs/");

  // The documents' headings get ids so the contents list and deep links can
  // point at them, and a leading section number ("1.") is set apart so it can
  // sit above its heading as a label. Email addresses become mailto links;
  // bare domains are left as text.
  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ linkify: true });
    md.linkify.set({ fuzzyLink: false });
    md.linkify.tlds("app", true);

    md.core.ruler.push("legal_headings", (state) => {
      const used = new Set();
      state.tokens.forEach((token, index) => {
        if (token.type !== "heading_open" || !["h2", "h3"].includes(token.tag)) return;
        const inline = state.tokens[index + 1];
        const number = token.tag === "h2" ? inline.content.match(/^(\d+\.)\s+/) : null;
        const text = number ? inline.content.slice(number[0].length) : inline.content;

        const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
        let id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        token.attrSet("id", id);

        const first = inline.children[0];
        if (number && first?.type === "text" && first.content.startsWith(number[0])) {
          first.content = first.content.slice(number[0].length);
          const label = new state.Token("html_inline", "", 0);
          label.content = `<span class="legal-prose__num">${number[1]}</span> `;
          inline.children.unshift(label);
        }
      });
    });
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/root": "." });
  // Files whose names start with a dot are not copied by a directory
  // passthrough, so .nojekyll is named explicitly.
  eleventyConfig.addPassthroughCopy({ "src/root/.nojekyll": ".nojekyll" });

  // GitHub writes CNAME into the default branch when a custom domain is set in
  // the repo settings, and that file has to reach the published output for the
  // domain to stick. Settings remain the source of truth; this only forwards it.
  if (existsSync("CNAME")) {
    eleventyConfig.addPassthroughCopy({ CNAME: "CNAME" });
  }

  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // A legal page's contents list is read back out of its own rendered markup,
  // so the list and the sections it points at cannot drift apart.
  eleventyConfig.addFilter("headings", (content) => {
    const html = String(content);
    const headings = [];
    const pattern = /<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const label = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const number = label.match(/^(\d+\.)\s+/);
      headings.push({
        id: match[1],
        number: number ? number[1] : "",
        label: number ? label.slice(number[0].length) : label
      });
    }
    return headings;
  });

  // Values that are still unresolved must never ship silently. Anything the
  // templates render as a visible placeholder is announced here as well.
  eleventyConfig.on("eleventy.after", () => {
    const unresolved = [];
    if (!site.contactEmail) unresolved.push("site.contactEmail  → the footer's Contact link is hidden");
    if (!site.appStoreUrl) unresolved.push("site.appStoreUrl   → the App Store badges and /download lead nowhere");
    if (!unresolved.length) return;
    const rule = "─".repeat(74);
    console.warn(
      `\n${rule}\n  Unresolved values in src/_data/site.json — do not ship to production:\n` +
        unresolved.map((line) => `    • ${line}`).join("\n") +
        `\n${rule}\n`
    );
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
