/* Static links and decorative circuits. No dependencies or network requests. */
(() => {
  "use strict";

  const config = window.CDSC_CONFIG || {};
  const teamName = typeof config.teamName === "string" && config.teamName.trim()
    ? config.teamName.trim() : "COMMIT Datascience Cell";
  const words = teamName.split(/\s+/);
  document.querySelector("[data-name-first]").textContent = words.shift();
  document.querySelector("[data-name-rest]").textContent = words.join(" ");
  document.getElementById("logo-title").textContent = teamName + " logo";
  document.title = teamName;
  document.querySelector('meta[property="og:title"]').content = teamName;

  const safeUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value.trim());
      return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  const destinations = Array.from(document.querySelectorAll(".destinations [data-destination]"), (placeholder) => {
    const key = placeholder.dataset.destination;
    const destination = config.destinations?.[key] || {};
    const label = placeholder.querySelector("[data-label]");
    if (typeof destination.label === "string" && destination.label.trim()) label.textContent = destination.label;
    const url = safeUrl(destination.url);
    if (!url) return placeholder;
    const link = document.createElement("a");
    link.className = placeholder.className;
    link.dataset.destination = key;
    link.href = url;
    while (placeholder.firstChild) link.append(placeholder.firstChild);
    link.querySelector("[data-status]").hidden = true;
    placeholder.replaceWith(link);
    return link;
  });

  const learningLink = document.getElementById("learning-link");
  const learning = config.destinations?.learning || {};
  const learningLabel = typeof learning.label === "string" && learning.label.trim() ? learning.label : "AI Learning Track";
  const learningUrl = safeUrl(learning.url);
  const learningName = learningLabel + (learningUrl ? "" : " — Coming soon");
  learningLink.setAttribute("aria-label", learningName);
  document.getElementById("learning-link-title").textContent = learningName;
  learningLink.querySelector(".star-hint").textContent = learningLabel;
  if (learningUrl) {
    learningLink.setAttribute("href", learningUrl);
    learningLink.removeAttribute("aria-disabled");
  }
  const highlightTargets = [...destinations, learningLink];

  const stage = document.getElementById("connection-stage");
  const logo = document.getElementById("logo-mark");
  const overlay = document.getElementById("connection-tracks");
  const paths = Array.from(document.querySelectorAll("[data-branch]"));
  const terminals = Array.from(document.querySelectorAll("[data-terminal]"));
  const routes = Array.from(document.querySelectorAll("[data-route]"));
  const sourceFor = [0, 1, 2];
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.getElementById("motion-toggle");
  let metrics;
  let hoveredKey = null;
  let focusedKey = null;
  let automaticIndex = preference.matches ? -1 : 0;
  let userPaused = false;
  let frame = null;
  let lastTime = null;
  let elapsed = 0;
  let branchEnds = [{ x: 1063, y: 468 }, { x: 1063, y: 626 }, { x: 1063, y: 785 }];

  const highlight = () => {
    const selected = focusedKey ?? hoveredKey ?? highlightTargets[automaticIndex]?.dataset.destination;
    highlightTargets.forEach((element) => element.classList.toggle("is-highlighted", element.dataset.destination === selected));
    routes.forEach((route) => route.classList.toggle("is-highlighted", route.dataset.route === selected));
  };

  const drawConnections = () => {
    if (!metrics) return;
    const { width, logoLeft, logoTop, scale, targets, mobile } = metrics;
    routes.forEach((route, index) => {
      const endpoint = branchEnds[sourceFor[index]];
      const x = logoLeft + (endpoint.x - 140) * scale;
      const y = logoTop + (endpoint.y - 140) * scale;
      const target = targets[index];
      // On phones, run beside the logo to the right edge of each link.
      const rail = mobile ? width - 3 - index * 3 : x + (target.x - x) * (0.44 + index * 0.09);
      const shape = mobile
        ? "M" + x + " " + y + "H" + rail + "V" + target.y + "H" + target.x
        : "M" + x + " " + y + "H" + rail + "L" + (target.x - 22) + " " + target.y + "H" + target.x;
      route.querySelectorAll("path").forEach((path) => path.setAttribute("d", shape));
      const end = route.querySelector("circle");
      end.setAttribute("cx", target.x);
      end.setAttribute("cy", target.y);
    });
  };

  const measure = () => {
    const rect = stage.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    if (!rect.width || !logoRect.width) return;
    const mobile = window.matchMedia("(max-width: 680px)").matches;
    metrics = {
      width: rect.width,
      logoLeft: logoRect.left - rect.left,
      logoTop: logoRect.top - rect.top,
      scale: logoRect.width / 1020,
      mobile,
      targets: destinations.map((element) => {
        const target = element.getBoundingClientRect();
        return { x: (mobile ? target.right : target.left) - rect.left, y: target.top - rect.top + target.height / 2 };
      }),
    };
    overlay.setAttribute("viewBox", "0 0 " + rect.width + " " + rect.height);
    drawConnections();
  };

  const drawBranches = (seconds, still = false) => {
    branchEnds = paths.map((path, index) => {
      const phase = seconds * 0.7 + index * 1.6;
      const extension = still ? 0 : (Math.sin(phase) + 1) * 12;
      const bend = still ? 0 : Math.sin(phase * 0.8) * 9;
      const x = 1063 + extension;
      const y = [468, 626, 785][index] + bend;
      const shape = index === 1
        ? "M773 626H" + (900 + extension * 0.3) + "L" + (985 + extension * 0.6) + " " + y + "H" + x
        : "M682 " + (index === 0 ? 555 : 695) + "H" + (865 + extension * 0.3) + "L" + (955 + extension * 0.6) + " " + y + "H" + x;
      path.setAttribute("d", shape);
      terminals[index].setAttribute("cx", x);
      terminals[index].setAttribute("cy", y);
      return { x, y };
    });
    drawConnections();
  };

  const tick = (time) => {
    if (lastTime !== null) elapsed += Math.min(time - lastTime, 64);
    lastTime = time;
    drawBranches(elapsed / 1000);
    const nextIndex = Math.floor(elapsed / 2200) % highlightTargets.length;
    if (nextIndex !== automaticIndex) { automaticIndex = nextIndex; highlight(); }
    frame = window.requestAnimationFrame(tick);
  };

  const updateMotion = () => {
    const paused = userPaused || preference.matches;
    const stopped = paused || document.hidden;
    document.documentElement.classList.toggle("motion-paused", stopped);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.disabled = preference.matches;
    const motionLabel = preference.matches ? "Reduced motion" : userPaused ? "Resume motion" : "Pause motion";
    toggle.setAttribute("aria-label", motionLabel);
    toggle.title = motionLabel;
    if (stopped) {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      if (preference.matches) { drawBranches(0, true); automaticIndex = -1; }
    } else if (frame === null) {
      automaticIndex = Math.floor(elapsed / 2200) % highlightTargets.length;
      frame = window.requestAnimationFrame(tick);
    }
    highlight();
  };

  highlightTargets.forEach((element) => {
    element.addEventListener("pointerenter", () => { hoveredKey = element.dataset.destination; highlight(); });
    element.addEventListener("pointerleave", () => { hoveredKey = null; highlight(); });
    element.addEventListener("focus", () => { focusedKey = element.dataset.destination; highlight(); });
    element.addEventListener("blur", () => { focusedKey = null; highlight(); });
  });
  toggle.addEventListener("click", () => { userPaused = !userPaused; updateMotion(); });
  preference.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  window.addEventListener("resize", measure);
  if (window.ResizeObserver) new window.ResizeObserver(measure).observe(stage);
  document.fonts?.ready.then(measure);
  measure();
  toggle.hidden = false;
  updateMotion();
})();
