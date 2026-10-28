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
  const learningLabel = typeof learning.label === "string" && learning.label.trim() ? learning.label : "AI-leerpad";
  const learningUrl = safeUrl(learning.url);
  const embedded = learning.mode !== "external";
  const learningName = learningLabel + (embedded || learningUrl ? "" : " — Binnenkort beschikbaar");
  learningLink.setAttribute("aria-label", learningName);
  document.getElementById("learning-link-title").textContent = learningName;
  learningLink.querySelector(".star-hint").textContent = learningLabel;
  if (embedded) {
    learningLink.removeAttribute("href");
    learningLink.removeAttribute("aria-disabled");
    learningLink.setAttribute("role", "button");
    learningLink.setAttribute("aria-haspopup", "dialog");
    learningLink.setAttribute("aria-controls", "ai-learning-dialog");
  } else if (learningUrl) {
    learningLink.setAttribute("href", learningUrl);
    learningLink.removeAttribute("aria-disabled");
    learningLink.setAttribute("role", "link");
    learningLink.removeAttribute("aria-haspopup");
    learningLink.removeAttribute("aria-controls");
  } else {
    learningLink.setAttribute("role", "link");
    learningLink.setAttribute("aria-disabled", "true");
    learningLink.removeAttribute("aria-haspopup");
    learningLink.removeAttribute("aria-controls");
  }
  const highlightTargets = [...destinations, learningLink];

  const stage = document.getElementById("connection-stage");
  const logo = document.getElementById("logo-mark");
  const overlay = document.getElementById("connection-tracks");
  const paths = Array.from(document.querySelectorAll("[data-branch]"));
  const terminals = Array.from(document.querySelectorAll("[data-terminal]"));
  const routes = Array.from(document.querySelectorAll("[data-route]"));
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.getElementById("motion-toggle");
  const restShapes = ["M682 555H865L955 468H1063", "M773 626H1063", "M682 695H865L955 785H1063"];
  const restY = [468, 626, 785];
  const cycleDuration = 3000;
  const switchDuration = 450;
  let metrics;
  let hoveredKey = null;
  let focusedKey = null;
  let automaticIndex = preference.matches ? -1 : 0;
  let activeKey = preference.matches ? null : highlightTargets[0].dataset.destination;
  let selectionAge = 0;
  let extensionAmount = 0;
  let switching = null;
  let userPaused = false;
  let frame = null;
  let lastTime = null;
  let motionTime = 0;
  let learningOpen = false;

  const wantedKey = () => focusedKey ?? hoveredKey ??
    (preference.matches ? null : highlightTargets[automaticIndex]?.dataset.destination) ?? null;
  const ease = (value) => value * value * (3 - 2 * value);
  const extensionAt = (age) => {
    if (age < 800) return ease(age / 800);
    if (age < 1300) return 1;
    if (age < 2400) return 1 - ease((age - 1300) / 1100);
    return 0; // Return to gentle motion for 600 ms before the next chapter.
  };
  const highlight = () => {
    highlightTargets.forEach((element) => element.classList.toggle("is-highlighted", element.dataset.destination === activeKey));
    routes.forEach((route) => route.classList.toggle("is-highlighted", route.dataset.route === activeKey));
  };
  const activate = (key) => {
    activeKey = key;
    selectionAge = 0;
    extensionAmount = 0;
    switching = null;
    if (!preference.matches && key) automaticIndex = highlightTargets.findIndex((element) => element.dataset.destination === key);
    highlight();
  };
  const pathData = (points) => points.map((point, index) =>
    (index === 0 ? "M" : "L") + point.x + " " + point.y
  ).join("");

  // Split the measured connector at a distance, so the grey branch and its
  // orange terminal follow the existing line, including its turns on mobile.
  const splitAt = (points, distance) => {
    const head = [points[0]];
    let remaining = distance;
    for (let index = 1; index < points.length; index++) {
      const from = points[index - 1];
      const to = points[index];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (remaining >= length) {
        head.push(to);
        remaining -= length;
        continue;
      }
      const fraction = remaining / length;
      const point = { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
      if (remaining > 0) head.push(point);
      return { head, tail: [point, ...points.slice(index)] };
    }
    return { head, tail: [points[points.length - 1]] };
  };

  const render = () => {
    paths.forEach((path, index) => {
      // A wider drift and bend make the independent motion more visible.
      const phase = motionTime * 0.0007 + index * 1.6;
      const drift = preference.matches ? 0 : (Math.sin(phase) + 1) * 27;
      const bend = preference.matches ? 0 : Math.sin(phase * 0.8) * 20.25;
      const baseX = 1063 + drift;
      const baseY = restY[index] + bend;
      let shape = preference.matches ? restShapes[index] : index === 1
        ? "M773 626H" + (900 + drift * 0.3) + "L" + (985 + drift * 0.6) + " " + baseY + "H" + baseX
        : "M682 " + (index === 0 ? 555 : 695) + "H" + (865 + drift * 0.3) + "L" + (955 + drift * 0.6) + " " + baseY + "H" + baseX;
      let connection;
      if (metrics) {
        const { mobile, width, logoLeft, logoTop, scale, targets } = metrics;
        const target = targets[index];
        const start = { x: logoLeft + (baseX - 140) * scale, y: logoTop + (baseY - 140) * scale };
        const rail = mobile ? width - 3 - index * 3 : start.x + (target.x - start.x) * (0.44 + index * 0.09);
        const points = mobile
          ? [start, { x: rail, y: start.y }, { x: rail, y: target.y }, target]
          : [start, { x: rail, y: start.y }, { x: target.x - 22, y: target.y }, target];
        const length = points.slice(1).reduce((total, point, pointIndex) =>
          total + Math.hypot(point.x - points[pointIndex].x, point.y - points[pointIndex].y), 0);
        connection = { points, target, length };
      }
      const selected = routes[index].dataset.route === activeKey;
      const radius = metrics ? 43 * metrics.scale : 0;
      const maximumTravel = connection ? Math.max(0, Math.min(connection.length * 0.7, 220, connection.length - radius - 24)) * 0.25 : 0;
      const travel = selected ? maximumTravel * extensionAmount : 0;
      let terminalX = baseX;
      let terminalY = baseY;
      if (connection && travel > 0) {
        const moving = splitAt(connection.points, travel);
        shape += moving.head.slice(1).map((point) =>
          "L" + (140 + (point.x - metrics.logoLeft) / metrics.scale) + " " + (140 + (point.y - metrics.logoTop) / metrics.scale)
        ).join("");
        const endpoint = moving.head[moving.head.length - 1];
        terminalX = 140 + (endpoint.x - metrics.logoLeft) / metrics.scale;
        terminalY = 140 + (endpoint.y - metrics.logoTop) / metrics.scale;
      }
      path.setAttribute("d", shape);
      terminals[index].setAttribute("cx", terminalX);
      terminals[index].setAttribute("cy", terminalY);
      if (!connection) return;
      // The original light pulse stays outside the moving orange circle.
      const connector = pathData(splitAt(connection.points, travel + radius).tail);
      routes[index].querySelectorAll("path").forEach((element) => element.setAttribute("d", connector));
      const end = routes[index].querySelector("circle");
      end.setAttribute("cx", connection.target.x);
      end.setAttribute("cy", connection.target.y);
    });
  };

  const measure = () => {
    const rect = stage.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    if (!rect.width || !logoRect.width) return;
    const mobile = window.matchMedia("(max-width: 680px)").matches;
    const scale = logoRect.width / 1020;
    const logoLeft = logoRect.left - rect.left;
    const logoTop = logoRect.top - rect.top;
    metrics = {
      scale, logoLeft, logoTop, mobile, width: rect.width,
      targets: destinations.map((element) => {
        const targetRect = element.getBoundingClientRect();
        return { x: (mobile ? targetRect.right : targetRect.left) - rect.left, y: targetRect.top - rect.top + targetRect.height / 2 };
      }),
    };
    overlay.setAttribute("viewBox", "0 0 " + rect.width + " " + rect.height);
    render();
  };

  const requestSelection = () => {
    const wanted = wantedKey();
    if (wanted === activeKey && !switching) return;
    if (preference.matches || extensionAmount === 0) {
      activate(wanted);
      render();
    } else if (!switching) {
      switching = { age: 0, from: extensionAmount };
    }
  };
  const advance = (delta) => {
    requestSelection();
    if (switching) {
      switching.age += delta;
      extensionAmount = switching.from * (1 - ease(Math.min(switching.age / switchDuration, 1)));
      if (switching.age >= switchDuration) activate(wantedKey());
      render();
      return;
    }
    selectionAge += delta;
    if (selectionAge >= cycleDuration) {
      if (!hoveredKey && !focusedKey) {
        automaticIndex = (automaticIndex + 1) % highlightTargets.length;
        activate(wantedKey());
      } else {
        selectionAge %= cycleDuration;
      }
    }
    extensionAmount = routes.some((route) => route.dataset.route === activeKey) ? extensionAt(selectionAge) : 0;
    render();
  };
  const tick = (time) => {
    const delta = lastTime === null ? 0 : Math.min(time - lastTime, 64);
    lastTime = time;
    motionTime += delta;
    advance(delta);
    frame = window.requestAnimationFrame(tick);
  };
  const updateMotion = () => {
    const paused = userPaused || preference.matches;
    const stopped = paused || document.hidden || learningOpen;
    document.documentElement.classList.toggle("motion-paused", stopped);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.disabled = preference.matches;
    const label = preference.matches ? "Minder beweging ingeschakeld" : userPaused ? "Hervat animatie" : "Pauzeer animatie";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    if (stopped) {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      if (preference.matches) {
        automaticIndex = -1;
        activate(wantedKey());
        render();
      }
    } else if (frame === null) {
      if (automaticIndex < 0) automaticIndex = Math.max(0, highlightTargets.findIndex((element) => element.dataset.destination === activeKey));
      requestSelection();
      frame = window.requestAnimationFrame(tick);
    }
    highlight();
  };

  highlightTargets.forEach((element) => {
    element.addEventListener("pointerenter", () => { hoveredKey = element.dataset.destination; requestSelection(); });
    element.addEventListener("pointerleave", () => { hoveredKey = null; requestSelection(); });
    element.addEventListener("focus", () => { focusedKey = element.dataset.destination; requestSelection(); });
    element.addEventListener("blur", () => { focusedKey = null; requestSelection(); });
  });
  toggle.addEventListener("click", () => { userPaused = !userPaused; updateMotion(); });
  preference.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  document.addEventListener("cdsc:learning-visibility", (event) => {
    learningOpen = event.detail?.open === true;
    updateMotion();
  });
  window.addEventListener("resize", measure);
  if (window.ResizeObserver) new window.ResizeObserver(measure).observe(stage);
  document.fonts?.ready.then(measure);
  measure();
  toggle.hidden = false;
  updateMotion();
})();
