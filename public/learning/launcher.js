(() => {
  "use strict";
  const Q = window.CDSCLearning = window.CDSCLearning || {};
  const trigger = document.getElementById("learning-link");
  const dialog = document.getElementById("ai-learning-dialog");
  if (!trigger || !dialog || window.CDSC_CONFIG?.destinations?.learning?.mode === "external") return;
  const root = new URL("./", document.currentScript?.src || new URL("learning/launcher.js", document.baseURI));
  const loaded = new Map();
  let loading;
  let closing;
  let outsideDown = false;
  let previousOverflow = "";
  const visibility = (open) => document.dispatchEvent(new CustomEvent("cdsc:learning-visibility", { detail: { open } }));
  const script = (name) => {
    if (loaded.has(name)) return loaded.get(name);
    const promise = new Promise((resolve, reject) => {
      const element = document.createElement("script");
      element.src = new URL(name, root).href;
      element.onload = () => resolve();
      element.onerror = () => { element.remove(); loaded.delete(name); reject(new Error("Could not load " + name)); };
      document.head.append(element);
    });
    loaded.set(name, promise);
    return promise;
  };
  const load = () => {
    if (!loading) loading = Promise.all(["core.js", "content.js", "progress.js", "view.js"].map(script))
      .then(() => Promise.all(["games/inbox.js", "games/delegate.js", "games/repair.js", "games/hunter.js", "games/data-danger.js"].map(script)))
      .then(() => script("controller.js"))
      .then(() => { Q.controller.init(); return Q.controller; })
      .catch((error) => { loading = null; throw error; });
    return loading;
  };
  const errorView = () => {
    if (!dialog.open) return;
    const body = document.getElementById("quest-body");
    body.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "The practice desk could not load. Check your connection, then try again.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "q-button q-primary";
    retry.textContent = "Retry loading";
    retry.addEventListener("click", () => { retry.disabled = true; load().then((controller) => { if (dialog.open) controller.onOpen(); }).catch(errorView); });
    body.append(message, retry);
  };
  const open = () => {
    if (dialog.open || closing) return;
    if (typeof dialog.showModal !== "function") {
      trigger.setAttribute("aria-label", "AI Learning Track requires a current browser");
      return;
    }
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    visibility(true);
    document.getElementById("quest-title").focus({ preventScroll: true });
    load().then((controller) => { if (dialog.open) controller.onOpen(); }).catch(errorView);
  };
  const restore = () => {
    document.body.style.overflow = previousOverflow;
    visibility(false);
    trigger.focus({ preventScroll: true });
  };
  const close = () => {
    if (!dialog.open || closing) return closing;
    Q.controller?.save();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return Promise.resolve();
    }
    closing = new Promise((resolve) => {
      const finish = () => { dialog.classList.remove("is-closing"); dialog.close(); closing = null; resolve(); };
      dialog.classList.add("is-closing"); window.setTimeout(finish, 250);
    });
    return closing;
  };
  trigger.addEventListener("click", (event) => { event.preventDefault(); open(); });
  trigger.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  document.getElementById("quest-close").addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("close", restore);
  const outside = (event) => { const rect = dialog.getBoundingClientRect(); return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom; };
  dialog.addEventListener("pointerdown", (event) => { outsideDown = event.target === dialog && outside(event); });
  dialog.addEventListener("pointerup", (event) => { if (outsideDown && event.target === dialog && outside(event)) close(); outsideDown = false; });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]):not([hidden]), a[href], [tabindex="0"]')).filter((element) => element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === document.getElementById("quest-title"))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  Q.launcher = { open, close };
})();
