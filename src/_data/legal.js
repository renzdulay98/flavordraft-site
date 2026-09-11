import { readFileSync } from "node:fs";

// The Privacy Policy and Terms of Service are written and approved as Markdown
// in docs/, and /privacy and /terms render those files — there is no second
// copy of the legal text anywhere in src/. The only thing lifted out is the
// document's own "# Title" line, which becomes the page heading, and the
// "**Effective date: …**" line under it, which becomes the header's date.
// Everything else is the document body, rendered as written.
function load(file) {
  const source = readFileSync(`docs/${file}`, "utf8").replace(/\r\n?/g, "\n");

  const title = source.match(/^# (.+)\n+/);
  if (!title) throw new Error(`docs/${file} must start with a "# Title" line.`);
  let body = source.slice(title[0].length);

  // Optional: if the line is missing or reworded it stays in the body instead.
  const effective = body.match(/^\*\*Effective date: (.+?)\*\*\n+/);
  if (effective) body = body.slice(effective[0].length);

  return {
    title: title[1].trim(),
    effectiveDate: effective ? effective[1].trim() : null,
    body
  };
}

// A function, so the files are read again on every rebuild under --serve.
export default function () {
  return {
    privacy: load("privacy.md"),
    terms: load("terms.md")
  };
}
