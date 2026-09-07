import { existsSync } from "node:fs";

import site from "./src/_data/site.json" with { type: "json" };

export default function (eleventyConfig) {
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
      headings.push({
        id: match[1],
        label: match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
      });
    }
    return headings;
  });

  // Values that are still unresolved must never ship silently. Anything the
  // templates render as a visible placeholder is announced here as well.
  eleventyConfig.on("eleventy.after", () => {
    const unresolved = [];
    if (!site.contactEmail) unresolved.push("site.contactEmail  → renders as [CONTACT_EMAIL] on /privacy, /terms and in the footer");
    if (!site.appStoreUrl) unresolved.push("site.appStoreUrl   → renders the 'Coming to the App Store' status instead of a link");
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
