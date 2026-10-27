/* Static-page configuration and decorative motion. No dependencies or network calls. */
(() => {
  "use strict";

  const config = window.CDSC_CONFIG || {};
  const setText = (selector, text) => {
    if (typeof text !== "string" || !text.trim()) return;
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = text;
    });
  };

  const teamName = typeof config.teamName === "string" && config.teamName.trim()
    ? config.teamName.trim() : "COMMIT Datascience Cell";
  setText("[data-team-name], #logo-title", teamName);
  setText("[data-short-name]", config.shortName);
  setText("[data-introduction]", config.introduction);
  document.querySelector("[data-brand-link]").setAttribute("aria-label", `${teamName} home`);
  const brandWords = teamName.split(/\s+/);
  setText(".brand-name strong", brandWords.shift());
  setText(".brand-name > span", brandWords.join(" ") || teamName);
  document.querySelector(".brand-image img").alt = `${teamName} orange gear and circuit logo`;

  if (Array.isArray(config.headline) && config.headline.length === 3) {
    document.querySelectorAll("h1 > span").forEach((line, index) => {
      if (typeof config.headline[index] === "string") line.textContent = config.headline[index];
    });
  }
  const headline = Array.from(document.querySelectorAll("h1 > span"), (line) => line.textContent).join(" ");
  document.title = `${teamName} — ${headline}`;
  document.querySelector('meta[property="og:title"]').content = document.title;
  const intro = document.querySelector("[data-introduction]").textContent;
  document.querySelector('meta[name="description"]').content = intro;
  document.querySelector('meta[property="og:description"]').content = intro;

  // Only explicit web, email, and telephone destinations become links.
  const destinationUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value.trim());
      return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  document.querySelectorAll("[data-destination]").forEach((card) => {
    const key = card.dataset.destination;
    const destination = config.destinations?.[key] || {};
    const heading = card.querySelector("[data-destination-label]");
    if (typeof destination.label === "string" && destination.label.trim()) heading.textContent = destination.label;
    if (typeof destination.description === "string") card.querySelector("[data-destination-description]").textContent = destination.description;
    const navItem = document.querySelector(`[data-nav="${key}"]`);
    navItem.textContent = heading.textContent;
    const url = destinationUrl(destination.url);

    if (!url) {
      navItem.title = `${heading.textContent} — Coming soon`;
      return;
    }

    const link = document.createElement("a");
    link.className = card.className;
    link.dataset.destination = key;
    link.href = url;
    while (card.firstChild) link.append(card.firstChild);
    link.querySelector("[data-destination-status]").textContent = "Explore destination ↗";
    card.replaceWith(link);

    const navLink = document.createElement("a");
    navLink.dataset.nav = key;
    navLink.href = url;
    navLink.textContent = heading.textContent;
    navItem.replaceWith(navLink);
  });

  const toggle = document.getElementById("motion-toggle");
  const motionLabel = toggle.querySelector("[data-motion-label]");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const paths = Array.from(document.querySelectorAll("[data-branch]"));
  const terminals = Array.from(document.querySelectorAll("[data-terminal]"));
  const centres = Array.from(document.querySelectorAll("[data-terminal-centre]"));
  let userPaused = false;
  let frame = null;
  let lastTime = null;
  let elapsed = 0;

  const drawBranches = (seconds, still = false) => {
    paths.forEach((path, index) => {
      const phase = seconds * 0.47 + index * 1.6;
      const extension = still ? 0 : (Math.sin(phase) + 1) * 61;
      const bend = still ? 0 : Math.sin(phase * 0.83) * 26;
      const endX = 1063 + extension;
      let endY;
      let shape;

      if (index === 1) {
        endY = 626 + bend * 0.45;
        shape = `M773 626H${900 + extension * 0.35}L${985 + extension * 0.7} ${endY}H${endX}`;
      } else {
        const direction = index === 0 ? -1 : 1;
        const anchorY = index === 0 ? 555 : 695;
        endY = (index === 0 ? 468 : 785) + direction * extension * 0.2 + bend;
        const elbowX = 865 + extension * 0.3;
        const outerX = 955 + extension * 0.65;
        shape = `M682 ${anchorY}H${elbowX}L${outerX} ${endY}H${endX}`;
      }
      path.setAttribute("d", shape);
      terminals[index].setAttribute("cx", endX);
      terminals[index].setAttribute("cy", endY);
      centres[index].setAttribute("cx", endX);
      centres[index].setAttribute("cy", endY);
    });
  };

  const tick = (time) => {
    if (lastTime !== null) elapsed += Math.min(time - lastTime, 64);
    lastTime = time;
    drawBranches(elapsed / 1000);
    frame = window.requestAnimationFrame(tick);
  };

  const updateMotion = () => {
    const paused = userPaused || preference.matches;
    const stopped = paused || document.hidden;
    document.documentElement.classList.toggle("motion-paused", stopped);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.disabled = preference.matches;
    motionLabel.textContent = preference.matches ? "Reduced motion" : userPaused ? "Resume motion" : "Pause motion";
    toggle.title = preference.matches ? "Motion is off to match your device's reduced-motion preference" : "Pause or resume decorative animations";
    toggle.setAttribute("aria-label", motionLabel.textContent);

    if (stopped) {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      if (preference.matches) drawBranches(0, true);
    } else if (frame === null) {
      frame = window.requestAnimationFrame(tick);
    }
  };

  toggle.addEventListener("click", () => {
    userPaused = !userPaused;
    updateMotion();
  });
  preference.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  toggle.hidden = false;
  updateMotion();
})();
