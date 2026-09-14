/* FlavorDraft — the few behaviours CSS cannot express. Every page renders
   completely without this file; it only adds the header state, the small-screen
   menu, gentle reveals, and the reading marker on the legal pages. */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  /* Small-screen menu. */
  const toggle = document.querySelector("[data-nav-toggle]");
  if (masthead && toggle) {
    const nav = document.getElementById(toggle.getAttribute("aria-controls"));
    const setOpen = (open) => {
      masthead.toggleAttribute("data-open", open);
      toggle.setAttribute("aria-expanded", String(open));
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
    document.addEventListener("click", (event) => {
      if (masthead.hasAttribute("data-open") && !masthead.contains(event.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 48em)").addEventListener("change", (mq) => {
      if (mq.matches) setOpen(false);
    });
  }

  /* Reveals: elements marked data-reveal fade in as they arrive. Without an
     observer, or when motion is reduced, everything is simply shown. */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length) {
    const show = (el) => el.setAttribute("data-reveal", "in");
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      reveals.forEach(show);
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            show(entry.target);
            observer.unobserve(entry.target);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      reveals.forEach((el) => observer.observe(el));
      /* Anything already on screen at load shows at once. */
      setTimeout(() => {
        reveals.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) show(el);
        });
      }, 60);
    }
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
