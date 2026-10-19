/* FlavorDraft homepage: the iPhone Duo film, the Cook View page turn on the
   device, paper settling onto the page, and the one mark of the pen that waits
   until it is seen. The page reads completely without this file — the film and
   the device show their stills, the paper is simply there, and every mark of the
   pen is already drawn — so all it does is decide when things may move.

   Nothing plays for a reader who prefers reduced motion or has asked to save data;
   the film and the page turn stay one press away for them. */

(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  const saveData = Boolean(connection && (connection.saveData || /2g$/.test(connection.effectiveType || "")));
  const mayMove = () => !reduce.matches && !saveData;

  const whenSeen = (element, threshold, enter, leave) => {
    if (!("IntersectionObserver" in window)) return enter();
    new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? enter() : leave && leave()),
      { threshold }
    ).observe(element);
  };

  const play = (video) => {
    const started = video.play();
    return started ? started.catch(() => {}) : Promise.resolve();
  };

  /* 1 · The pen's arrow between the saved video and its recipe: drawn once, when
     most of it is on screen. Until then it waits undrawn (home.css). */
  if (mayMove() && "IntersectionObserver" in window) {
    for (const mark of document.querySelectorAll(".ink--on-view")) {
      mark.classList.add("is-waiting");
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          mark.classList.replace("is-waiting", "is-drawing");
          observer.disconnect();
        },
        { threshold: 0.6 }
      );
      observer.observe(mark);
    }
  }

  /* 2 · The iPhone Duo film (Track B; markup and behaviour after its web/EMBED.md).
     It plays while a quarter of it is on screen and pauses when it leaves. The
     button always says what a press will do, so it stays true when autoplay is
     refused or the film scrolls away; a reader's pause is kept. The chapter that
     is playing is marked in the caption beside it. */
  const film = document.querySelector("[data-film]");
  if (film) {
    const video = film.querySelector("[data-film-video]");
    const toggle = film.querySelector("[data-film-toggle]");
    const list = film.querySelector("[data-film-chapters]");
    const marks = list ? list.dataset.filmChapters.split(" ").map(Number) : [];
    const chapters = list ? [...list.querySelectorAll("[data-chapter]")] : [];
    let wanted = mayMove();

    const label = () => {
      toggle.textContent = video.paused ? "Play the film" : "Pause the film";
    };

    video.addEventListener("play", label);
    video.addEventListener("pause", label);
    video.addEventListener("playing", () => film.setAttribute("data-state", "playing"));
    video.querySelector("source:last-of-type").addEventListener("error", () => {
      toggle.hidden = true;
      film.setAttribute("data-state", "still");
    });

    video.addEventListener("timeupdate", () => {
      let at = 0;
      marks.forEach((start, index) => {
        if (video.currentTime >= start) at = index;
      });
      chapters.forEach((chapter, index) => chapter.toggleAttribute("data-current", index === at % chapters.length));
    });

    /* A film that is not playing when the screen crosses the narrow breakpoint
       is reloaded only when it next plays, so nothing downloads early. */
    let stale = false;
    const start = () => {
      if (stale) {
        stale = false;
        film.removeAttribute("data-state");
        video.load();
      }
      video.preload = "auto";
      return play(video);
    };

    toggle.hidden = false;
    label();
    toggle.addEventListener("click", () => {
      wanted = video.paused;
      if (wanted) start();
      else video.pause();
    });

    whenSeen(film, 0.25, () => wanted && start(), () => video.pause());
    reduce.addEventListener("change", (event) => {
      if (!event.matches) return;
      wanted = false;
      video.pause();
    });

    /* A <source media> is chosen when the film loads, so a phone turned on its
       side would keep the narrow 4:3 file in a 16:9 frame. Crossing the narrow
       breakpoint marks the film to load again: at once if it is playing (the
       right still covers it meanwhile), otherwise when it next plays. */
    window.matchMedia("(max-width: 39.99em)").addEventListener("change", () => {
      stale = true;
      if (video.paused) film.removeAttribute("data-state");
      else start();
    });
  }

  /* 3 · The Cook View page turn, on the iPhone Duo: two seconds of the real turn
     (step 16 at rest, Next pressed, the recorded turn, step 17), drawn onto the two
     halves of the device's display, each at the plane the render recorded for it.
     It runs on its own while the section is in view: a hold on the still, the
     turn, a hold on step 17, a dissolve back to the still (the clip's own first
     frame) and round again. Nothing needs pressing, and nothing moves but the
     page; a text control under the device pauses it, as the film's does. Under
     reduced motion or Save-Data the device simply holds step 16. */
  const turn = document.querySelector("[data-turn]");
  if (turn && mayMove()) {
    const video = turn.querySelector("[data-turn-video]");
    const still = turn.querySelector(".cook__still");
    const halves = ["top", "bottom"].map((name) => {
      const canvas = turn.querySelector(`[data-turn-half="${name}"]`);
      return { name, canvas, context: canvas.getContext("2d"), quad: JSON.parse(turn.dataset.turnQuads)[name] };
    });
    const toggle = turn.querySelector("[data-turn-toggle]");
    const HOLD_STILL = 1000, HOLD_LANDED = 1000, DISSOLVE = 600;
    let able = true, inView = false, wanted = true, timer = 0, frame = 0;

    /* The 3x3 projection that takes a w x h rectangle to four points (top-left
       clockwise), as a CSS matrix3d. */
    const adjugate = (m) => [
      m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
      m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
      m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]
    ];
    const multiply = (a, b) => {
      const out = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]);
      return out;
    };
    const basis = ([p1, p2, p3, p4]) => {
      const m = [p1[0], p2[0], p3[0], p1[1], p2[1], p3[1], 1, 1, 1];
      const a = adjugate(m);
      const v = [a[0] * p4[0] + a[1] * p4[1] + a[2], a[3] * p4[0] + a[4] * p4[1] + a[5], a[6] * p4[0] + a[7] * p4[1] + a[8]];
      return multiply(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
    };
    const projection = (w, h, quad) => {
      const t = multiply(basis(quad), adjugate(basis([[0, 0], [w, 0], [w, h], [0, h]])));
      const n = t.map((v) => v / t[8]);
      return `matrix3d(${n[0]}, ${n[3]}, 0, ${n[6]}, ${n[1]}, ${n[4]}, 0, ${n[7]}, 0, 0, 1, 0, ${n[2]}, ${n[5]}, 0, 1)`;
    };
    const fit = () => {
      const { width, height } = still.getBoundingClientRect();
      if (!width) return;
      for (const half of halves) {
        half.canvas.style.transform = projection(half.canvas.width, half.canvas.height, half.quad.map(([x, y]) => [x * width, y * height]));
      }
    };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(still);

    const draw = () => {
      halves[0].context.drawImage(video, 0, 0, 660, 469, 0, 0, 660, 469);
      halves[1].context.drawImage(video, 0, 469, 660, 469, 0, 0, 660, 469);
    };
    /* One chain of frame callbacks at a time: a chain left pending at the end of a
       play would wake with the next one and double the drawing. */
    const stopFrames = () => {
      if ("cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
    };
    const frames = () => {
      if (video.paused || video.ended) return;
      draw();
      frame = "requestVideoFrameCallback" in video ? video.requestVideoFrameCallback(frames) : requestAnimationFrame(frames);
    };
    const state = (value) => turn.setAttribute("data-state", value);
    const later = (ms, then) => {
      clearTimeout(timer);
      timer = setTimeout(then, ms);
    };

    const rest = () => {
      clearTimeout(timer);
      stopFrames();
      video.pause();
      state("rest");
    };
    const begin = () => {
      if (!able || !inView || !wanted || reduce.matches) return;
      later(HOLD_STILL, () => {
        if (!inView || !wanted) return;
        video.currentTime = 0;
        video.preload = "auto";
        play(video);
      });
    };
    video.addEventListener("playing", () => {
      stopFrames();
      draw();
      state("turning");
      frames();
    });
    video.addEventListener("ended", () => {
      stopFrames();
      draw();
      state("landed");
      later(HOLD_LANDED, () => {
        state("resetting");
        later(DISSOLVE, begin);
      });
    });
    video.querySelector("source:last-of-type").addEventListener("error", () => {
      able = false;
      rest();
      if (toggle) toggle.hidden = true;
    });

    /* The control says what a press will do. A pause is kept until the reader
       plays again, even if the section scrolls away and back. */
    if (toggle) {
      const label = () => {
        toggle.textContent = wanted ? "Pause the page turn" : "Play the page turn";
      };
      toggle.hidden = false;
      label();
      toggle.addEventListener("click", () => {
        wanted = !wanted;
        label();
        if (wanted) begin();
        else rest();
      });
    }

    whenSeen(turn, 0.5, () => {
      inView = true;
      begin();
    }, () => {
      inView = false;
      rest();
    });
    reduce.addEventListener("change", (event) => {
      if (!event.matches) return;
      able = false;
      rest();
      if (toggle) toggle.hidden = true;
    });
  }

  /* 4 · Paper settles onto the page as it comes into view (the cards, the slips,
     the sheet): home.css starts each a little low and off its angle, and this
     lets it down once a quarter of it is on screen. Without motion it is simply
     there. */
  if ("IntersectionObserver" in window) {
    const settling = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-set");
        settling.unobserve(entry.target);
      }
    }, { threshold: 0.25, rootMargin: "0px 0px -6% 0px" });
    for (const paper of document.querySelectorAll(".settle")) {
      if (mayMove()) settling.observe(paper);
      else paper.classList.add("is-set");
    }
  } else {
    for (const paper of document.querySelectorAll(".settle")) paper.classList.add("is-set");
  }
})();
