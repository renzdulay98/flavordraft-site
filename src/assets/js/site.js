/* FlavorDraft — the few behaviours CSS cannot express, on every page. Each page
   renders completely without this file; it only adds the header state, the
   small-screen menu and the reading marker on the legal pages. The homepage's
   film and page turn are in home.js. */

(() => {
  "use strict";

  /* Header: a hairline appears once the page has moved. */
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

  /* Small-screen menu. Its button says what a press will do. */
  const toggle = document.querySelector("[data-nav-toggle]");
  if (masthead && toggle) {
    const nav = document.getElementById(toggle.getAttribute("aria-controls"));
    const label = toggle.querySelector(".masthead__toggle-label");
    const setOpen = (open) => {
      masthead.toggleAttribute("data-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (label) label.textContent = open ? "Close" : "Menu";
    };
    toggle.addEventListener("click", () => setOpen(!masthead.hasAttribute("data-open")));
    nav?.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && masthead.hasAttribute("data-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    /* A tap outside the open menu only closes it: caught on the way down, it never
       reaches the link or badge under the finger. */
    document.addEventListener(
      "click",
      (event) => {
        if (!masthead.hasAttribute("data-open") || masthead.contains(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      },
      true
    );
    /* Tabbing on past the last link closes it too, so it never covers the page.
       (Only the keyboard's focus moves count: a tap is the handler above's.) */
    let pointing = false;
    document.addEventListener("pointerdown", () => (pointing = true), true);
    document.addEventListener("keydown", () => (pointing = false), true);
    nav?.addEventListener("focusout", (event) => {
      if (pointing || !masthead.hasAttribute("data-open") || masthead.contains(event.relatedTarget)) return;
      setOpen(false);
    });
    window.matchMedia("(min-width: 48em)").addEventListener("change", (mq) => {
      if (mq.matches) setOpen(false);
    });
  }

  /* Legal pages: mark the section currently being read in the contents list. */
  const toc = document.querySelector("[data-toc]");
  if (!toc) return;

  const links = new Map(
    [...toc.querySelectorAll("a[href^='#']")].map((a) => [decodeURIComponent(a.hash.slice(1)), a])
  );
  const headings = [...document.querySelectorAll(".legal-prose h2[id]")].filter((heading) =>
    links.has(heading.id)
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
