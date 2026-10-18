/* FlavorDraft homepage: the iPhone Duo film, the Cook View page turn, and the one
   mark of the pen that waits until it is seen. The page reads completely without
   this file — the film and the page turn show their stills, and every mark of the
   pen is already drawn — so all it does is decide when moving pictures may move.

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

  /* 3 · The Cook View page turn: two seconds of the real turn, played once when the
     page is in view and held on the step it lands on. "Turn the page again" replays
     it. Under reduced motion, or if the clip cannot load, the button changes the
     page with the app's own short fade instead (home.css). Whichever still is
     showing is the one assistive tech is given, and a press says where it landed. */
  const turn = document.querySelector("[data-turn]");
  if (turn) {
    const video = turn.querySelector("[data-turn-video]");
    const again = turn.querySelector("[data-turn-again]");
    const status = turn.querySelector("[data-turn-status]");
    const [start, end] = turn.querySelectorAll(".cook__still");
    let seen = false;
    let pressed = false;
    let clip = true;
    const stillsOnly = () => reduce.matches || !clip;

    const announce = (message) => {
      if (!status || !pressed) return;
      status.textContent = "";
      requestAnimationFrame(() => {
        status.textContent = message;
      });
    };

    const hide = (still, hidden) => {
      if (hidden) still.setAttribute("aria-hidden", "true");
      else still.removeAttribute("aria-hidden");
    };

    const state = (value) => {
      turn.setAttribute("data-state", value);
      const landed = value === "turned" || value === "landed";
      hide(start, landed);
      hide(end, !landed);
      if (value === "turning") return;
      again.textContent = !landed ? "Turn the page" : stillsOnly() ? "Back to step 16" : "Turn the page again";
      announce(landed ? "Step 17 of 20: Sprinkle mozzarella and any remaining parmesan on top." : "Step 16 of 20: Repeat layering.");
    };

    const turnPage = () => {
      if (stillsOnly()) {
        state(turn.getAttribute("data-state") === "landed" ? "rest" : "landed");
        return;
      }
      video.currentTime = 0;
      video.preload = "auto";
      play(video);
    };

    /* A clip that cannot load never rejects play(): the last <source> failing is
       the sign, as for the film. The page then turns without it. */
    video.querySelector("source:last-of-type").addEventListener("error", () => {
      clip = false;
      turnPage();
    });

    video.addEventListener("playing", () => state("turning"));
    video.addEventListener("ended", () => state("turned"));

    again.hidden = false;
    again.addEventListener("click", () => {
      pressed = true;
      turnPage();
    });

    if (mayMove()) {
      whenSeen(turn, 0.6, () => {
        if (seen) return;
        seen = true;
        turnPage();
      });
    }
  }
})();
