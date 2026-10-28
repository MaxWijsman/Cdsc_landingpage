((Q) => {
  "use strict";
  const C = Q.core, V = Q.view;
  let initialized = false;
  let adapter, progress, body, footer, dialog, home;
  let activeId = null;
  let state = null;
  let screen = "overview";
  let busy = false;
  const save = () => {
    if (!initialized) return;
    if (activeId && state) C.record(progress, activeId, state);
    adapter.save(progress);
  };
  const announce = (message) => { document.getElementById("quest-announcement").textContent = message; };
  const recommended = () => Q.content.order.find((id) => !progress.games[id]?.completed);
  const footerView = (note, buttons) => {
    footer.replaceChildren(V.el("div", { className: "q-footer-note" }, note + (adapter.temporary() ? " · Progress is available for this visit only." : "")), V.el("div", { className: "q-actions" }, buttons));
  };
  const openGame = (id, replay = false) => {
    if (!Q.games[id]) return;
    save();
    activeId = id;
    const checkpoint = replay ? null : progress.games[id]?.checkpoint;
    state = checkpoint ? Q.games[id].hydrate(checkpoint) : null;
    const fresh = !state;
    if (fresh) state = Q.games[id].createAttempt();
    C.record(progress, id, state, fresh);
    adapter.save(progress);
    screen = "game";
    render(true);
  };
  const showOverview = () => { save(); activeId = null; state = null; screen = "overview"; render(true); };
  const showSummary = () => { save(); activeId = null; state = null; screen = "summary"; render(true); };
  const overview = () => {
    const summary = C.summary(progress);
    const nextId = recommended();
    const cards = Q.content.order.map((id, index) => {
      const meta = Q.content.meta[id], entry = progress.games[id];
      const card = V.button("", () => openGame(id), { className: "q-game-card" + (id === nextId ? " q-recommended" : ""), key: "game-" + id });
      card.append(V.el("small", {}, String(index + 1).padStart(2, "0") + " · " + meta.duration), V.el("strong", {}, meta.title), V.el("small", {}, meta.skill), V.el("span", { className: "q-card-score" }, entry?.completed ? V.starsText(entry.bestScore) + " · " + entry.bestScore + "/100" : entry?.checkpoint ? "Resume challenge" : id === nextId ? "Suggested next" : "Ready to play"));
      return card;
    });
    const welcome = summary.completed ? "Your next useful AI skill is one small challenge away." : "Practice with simulated AI. Start anywhere; the numbers suggest an order.";
    const content = V.el("div", {}, [V.el("div", { className: "q-topline" }, [V.circuit(), V.el("p", {}, welcome)]), V.el("div", { className: "q-overview" }, cards)]);
    const last = progress.lastGameId;
    const resumable = last && progress.games[last]?.checkpoint?.phase !== "completed" && progress.games[last]?.checkpoint;
    const primary = resumable ? V.button("Resume " + Q.content.meta[last].title, () => openGame(last), { primary: true }) : nextId ? V.button("Start " + Q.content.meta[nextId].title, () => openGame(nextId), { primary: true }) : V.button("View track summary", showSummary, { primary: true });
    return { body: content, note: summary.completed + "/5 complete · " + adapter.status(), buttons: [V.button("Reset progress", () => { screen = "reset"; render(true); }), primary] };
  };
  const intro = () => {
    const meta = Q.content.meta[activeId];
    const instructions = {
      inbox: "Build a prompt from ingredients. Generate, see the consequence, and refine it before keeping your draft.",
      delegate: "Sort eight workplace tasks. There is no timer: context and human accountability matter more than speed.",
      repair: "You have three feedback moves per summary. Keep source facts while improving clarity and usefulness.",
      hunter: "Investigate six claims across two briefings. Compare them with evidence before deciding what is supported.",
      "data-danger": "Remove unnecessary sensitive details, then choose a permitted workflow. The data and tool rules are fictional training examples.",
    };
    return { body: V.layout(meta.title, instructions[activeId], [V.el("h3", {}, meta.skill), V.el("p", {}, meta.takeaway), V.el("p", { className: "q-small" }, "Simulated AI · " + meta.duration + " · Replay whenever you like.")], "Circuit: experiment, notice the result, and try again."), note: "Your choices stay in this browser.", buttons: [V.button("Start challenge", () => dispatch({ type: "start" }), { primary: true })] };
  };
  const completion = () => {
    const meta = Q.content.meta[activeId], result = C.result(state), entry = progress.games[activeId];
    const nextId = recommended();
    const details = [V.el("div", { className: "q-score-big" }, result.score + "/100"), V.el("p", { className: "q-stars", "aria-label": result.stars + " out of three stars" }, V.starsText(result.score)), V.el("p", {}, "Best: " + entry.bestScore + "/100"), V.el("p", { className: "q-small" }, result.critical ? "An unresolved safety issue limited this attempt. Replay to practice a safer approach." : "A completed practice challenge. Keep applying this skill at work.")];
    return { body: V.layout("Challenge complete", meta.takeaway, details, result.score >= 70 ? "Circuit: that is a skill worth taking into your workday." : "Circuit: every retry is another chance to improve."), note: meta.title + " · " + C.summary(progress).completed + "/5 games completed.", buttons: [V.button("Replay", () => openGame(activeId, true)), V.button(nextId ? "Next: " + Q.content.meta[nextId].title : "Track summary", () => nextId ? openGame(nextId) : showSummary(), { primary: true })] };
  };
  const summaryView = () => {
    const summary = C.summary(progress);
    const entries = Q.content.order.map((id) => V.el("div", { className: "q-summary-item" }, Q.content.meta[id].title + ": " + (progress.games[id]?.bestScore ?? "—") + "/100"));
    const achievements = [V.el("div", { className: "q-score-big" }, summary.score + "/500"), V.el("p", {}, summary.completed + "/5 games · " + summary.stars + "/15 stars · " + summary.percent + "% complete"), ...(summary.badge ? [V.el("span", { className: "q-badge" }, "AI Ready — Practice")] : [])];
    return { body: V.layout(summary.completed === 5 ? "Your AI workday, upgraded" : "Your practice so far", "Prompt clearly. Keep human judgment. Iterate. Verify claims. Protect information.", [V.el("div", { className: "q-topline" }, [V.circuit("celebrate"), V.el("div", {}, achievements)]), V.el("div", { className: "q-summary-list" }, entries)]), note: "Personal practice results · " + adapter.status(), buttons: [V.button("Choose a game", showOverview), V.button("Return to work", () => Q.launcher.close(), { primary: true })] };
  };
  const render = (focus = false) => {
    if (!initialized) return;
    const previousKey = document.activeElement?.getAttribute("data-q-focus");
    const summary = C.summary(progress);
    document.getElementById("quest-score").textContent = summary.completed + "/5 · " + summary.stars + "★";
    home.hidden = screen === "overview";
    document.getElementById("quest-subtitle").textContent = screen === "game" && activeId ? Q.content.meta[activeId].title + " · " + (state.round + 1) + "/" + Q.games[activeId].count : screen === "summary" ? "Your learning summary" : "Five small challenges · about 12–15 minutes";
    let view;
    try {
      if (screen === "reset") view = { body: V.layout("Reset all practice progress?", "This clears only AI Office Quest progress in this browser. It cannot be undone.", V.el("p", {}, "You can replay an individual game without clearing its best score.")), note: "Your landing-page preferences will be kept.", buttons: [V.button("Keep progress", () => { screen = "overview"; render(true); }, { primary: true }), V.button("Reset all progress", () => { progress = adapter.reset(); activeId = null; state = null; screen = "overview"; render(true); announce("Practice progress reset."); })] };
      else if (screen === "summary") view = summaryView();
      else if (screen === "overview") view = overview();
      else if (state.phase === "intro") view = intro();
      else if (state.phase === "completed") view = completion();
      else view = Q.games[activeId].render(state, { view: V, dispatch });
    } catch {
      view = { body: V.el("p", {}, "This challenge could not be displayed. Your saved progress is still available."), note: "Choose another game or start a fresh attempt.", buttons: [V.button("Choose a game", showOverview), V.button("Restart this game", () => openGame(activeId, true), { primary: true })] };
    }
    body.replaceChildren(view.body);
    footerView(view.note || "", view.buttons || []);
    if (focus && dialog.open) {
      const previous = previousKey && Array.from(dialog.querySelectorAll("[data-q-focus]")).find((element) => element.getAttribute("data-q-focus") === previousKey && !element.disabled);
      const target = previous || body.querySelector("h3") || document.getElementById("quest-title");
      target.setAttribute("tabindex", target.tagName === "BUTTON" ? "0" : "-1");
      target.focus({ preventScroll: true });
    }
  };
  const dispatch = (action) => {
    if (!activeId || !state || busy) return;
    busy = true;
    try {
      const next = Q.games[activeId].reduce(state, action);
      if (JSON.stringify(next) === JSON.stringify(state)) return;
      state = next;
      save();
      render(true);
      if (state.phase === "feedback") announce("Result: " + Math.round(state.evaluation.score) + " out of 100. " + state.evaluation.feedback[0]);
      else if (state.phase === "completed") announce("Challenge complete. " + C.result(state).score + " out of 100.");
      else if (action.type === "apply") announce(Q.content.repairActions.find((item) => item.id === action.id).why);
      else if (action.type === "classify" && activeId === "hunter") {
        const claim = Q.content.hunter[state.round].claims[state.selected];
        announce(claim.why);
      }
    } finally { busy = false; }
  };
  const init = () => {
    if (initialized) return;
    for (const id of Q.content.order) if (!Q.games[id]) throw new Error("Missing game: " + id);
    dialog = document.getElementById("ai-learning-dialog"); body = document.getElementById("quest-body"); footer = document.getElementById("quest-footer"); home = document.getElementById("quest-home");
    adapter = Q.progress.create(); progress = adapter.load(); initialized = true;
    home.addEventListener("click", showOverview);
  };
  Q.controller = { init, save, openGame, dispatch, showOverview, showSummary, onOpen: showOverview, getProgress: () => C.clone(progress), getAttempt: () => state ? C.clone(state) : null };
})(window.CDSCLearning);
