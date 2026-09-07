/* FlavorDraft — the only two behaviours on the site that CSS cannot express.
   Everything else, including every visual state, is styles. */

(() => {
  "use strict";

  /* The header keeps its hairline hidden until the page has actually moved,
     so the top of the page reads as one uninterrupted sheet of paper. */
  const masthead = document.getElementById("masthead");
  if (masthead && "IntersectionObserver" in window) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px";
    document.body.prepend(sentinel);

    new IntersectionObserver(
      ([entry]) => masthead.toggleAttribute("data-stuck", !entry.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);
  }

  /* Legal pages: mark the section currently being read in the contents list.
     The current section is the last one whose heading has crossed the reading
     line — picking the topmost *visible* heading instead makes the marker jump
     back and forth between neighbours across a short section. */
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;

  const links = new Map(
    [...toc.querySelectorAll("a[href^='#']")].map((a) => [
      decodeURIComponent(a.hash.slice(1)),
      a
    ])
  );
  const headings = [...document.querySelectorAll(".legal-prose h2[id]")].filter(
    (heading) => links.has(heading.id)
  );
  if (!headings.length) return;

  let queued = false;

  const update = () => {
    queued = false;
    const line = window.innerHeight * 0.3;
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= line) current = heading;
    }
    for (const [id, link] of links) {
      link.toggleAttribute("data-current", id === current.id);
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  update();
})();
