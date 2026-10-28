((Q) => {
  "use strict";
  const C = Q.core, V = Q.view;
  let initialized = false;
  let adapter, progress, body, footer, dialog, home;
  let activeId = null;
  let state = null;
  let screen = "overview";
  let helpReturn = "overview", helpTopic = "richt";
  let busy = false;
  const save = () => {
    if (!initialized) return;
    if (activeId && state) C.record(progress, activeId, state);
    adapter.save(progress);
  };
  const announce = (message) => { document.getElementById("quest-announcement").textContent = message; };
  const recommended = () => Q.content.order.find((id) => !progress.games[id]?.completed);
  const footerView = (note, buttons) => {
    footer.replaceChildren(V.el("div", { className: "q-footer-note" }, note + (adapter.temporary() ? " · Je voortgang blijft alleen tijdens dit bezoek beschikbaar." : "")), V.el("div", { className: "q-actions" }, buttons));
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
  const showHelp = () => { save(); if (screen !== "help") helpReturn = screen; screen = "help"; helpTopic = "richt"; render(true); };
  const helpView = () => {
    const tabs = V.el("div", { className: "q-tabs", role: "group", "aria-label": "Kies uitleg" }, [V.button("RICHT", () => { helpTopic = "richt"; render(true); }, { className: "q-choice", pressed: helpTopic === "richt", key: "help-richt" }), V.button("Promptingtechnieken", () => { helpTopic = "techniques"; render(true); }, { className: "q-choice", pressed: helpTopic === "techniques", key: "help-techniques" })]);
    const cards = helpTopic === "richt" ? Q.content.richt.map((item) => V.el("article", { className: "q-reference" }, [V.el("h4", {}, item.label), V.el("p", {}, item.definition), V.el("p", { className: "q-small" }, "Bijvoorbeeld: “" + item.example + "”")])) : Q.content.techniques.map((item) => V.el("article", { className: "q-reference" }, [V.el("h4", {}, item.title), V.el("p", {}, item.text), V.el("p", { className: "q-small" }, "Oefen in: " + Q.content.meta[item.game].title)]));
    return { body: V.el("div", {}, [V.el("div", { className: "q-reference-heading" }, [V.el("h3", {}, helpTopic === "richt" ? "RICHT-spiekkaart" : "Vier promptingtechnieken"), tabs]), V.el("div", { className: "q-reference-grid" + (helpTopic === "techniques" ? " q-techniques" : "") }, cards)]), note: "De simulaties tonen technieken; resultaten verschillen per AI-model.", buttons: [V.button("Terug naar " + (helpReturn === "game" ? "het spel" : helpReturn === "summary" ? "het leeroverzicht" : "het overzicht"), () => { screen = helpReturn; render(true); }, { primary: true })] };
  };
  const overview = () => {
    const summary = C.summary(progress);
    const nextId = recommended();
    const cards = Q.content.order.map((id, index) => {
      const meta = Q.content.meta[id], entry = progress.games[id];
      const card = V.button("", () => openGame(id), { className: "q-game-card" + (id === nextId ? " q-recommended" : ""), key: "game-" + id });
      card.append(V.el("small", {}, String(index + 1).padStart(2, "0") + " · " + meta.duration), V.el("strong", {}, meta.title), V.el("small", {}, meta.skill), V.el("span", { className: "q-card-score" }, entry?.completed ? V.starsText(entry.bestScore) + " · " + entry.bestScore + "/100" : entry?.checkpoint ? "Ga verder" : id === nextId ? "Aanbevolen volgende spel" : "Klaar om te spelen"));
      return card;
    });
    const welcome = summary.completed ? "Oefen verder met RICHT en de promptingtechnieken." : "Oefen met RICHT en gesimuleerde AI. Begin waar je wilt; de nummers geven de aanbevolen volgorde aan.";
    const notice = progress.revisionNotice.length ? V.el("div", { className: "q-revision-notice", role: "status" }, [V.el("p", {}, "Vernieuwd met RICHT: " + progress.revisionNotice.map((id) => Q.content.meta[id].title).join(", ") + ". Speel deze spellen opnieuw. De voortgang van de andere spellen blijft behouden."), V.button("Begrepen", () => { progress.revisionNotice = []; adapter.save(progress); render(true); })]) : null;
    const content = V.el("div", {}, [notice, V.el("div", { className: "q-topline" }, [V.circuit(), V.el("p", {}, welcome)]), V.el("div", { className: "q-overview" }, cards)]);
    const last = progress.lastGameId;
    const resumable = last && progress.games[last]?.checkpoint?.phase !== "completed" && progress.games[last]?.checkpoint;
    const primary = resumable ? V.button("Hervat " + Q.content.meta[last].title, () => openGame(last), { primary: true }) : nextId ? V.button("Start " + Q.content.meta[nextId].title, () => openGame(nextId), { primary: true }) : V.button("Bekijk je leeroverzicht", showSummary, { primary: true });
    return { body: content, note: summary.completed + "/5 voltooid · " + adapter.status(), buttons: [V.button("Wis voortgang", () => { screen = "reset"; render(true); }), primary] };
  };
  const intro = () => {
    const meta = Q.content.meta[activeId];
    const instructions = {
      inbox: "Bouw in beide rondes een RICHT-prompt. In de tweede ronde kun je optioneel voorbeelden toevoegen. Zonder voorbeelden kun je de maximale score halen.",
      delegate: "Verdeel acht werktaken. Er is geen tijdslimiet: context en menselijke verantwoordelijkheid zijn belangrijker dan snelheid.",
      repair: "Laat AI eerst je prompt met RICHT verbeteren en twee vragen stellen. Verbeter daarna een samenvatting met maximaal drie feedbackbeurten.",
      hunter: "Kies eerst controleerbare tussenstappen. Vergelijk daarna drie afzonderlijke antwoorden. Toets in beide rondes de uitspraken aan de bron.",
      "data-danger": "Verwijder onnodige gevoelige gegevens en kies daarna een toegestaan proces. De gegevens en regels zijn fictieve oefenvoorbeelden.",
    };
    return { body: V.layout(meta.title, instructions[activeId], [V.el("h3", {}, meta.skill), V.el("p", {}, meta.takeaway), V.el("p", { className: "q-small" }, "Gesimuleerde AI · " + meta.duration + " · Speel opnieuw wanneer je wilt.")], "Circuit: probeer iets, bekijk het resultaat en verbeter het."), note: "Je keuzes blijven in deze browser.", buttons: [V.button("Start het spel", () => dispatch({ type: "start" }), { primary: true })] };
  };
  const completion = () => {
    const meta = Q.content.meta[activeId], result = C.result(state), entry = progress.games[activeId];
    const nextId = recommended();
    const details = [V.el("div", { className: "q-score-big" }, result.score + "/100"), V.el("p", { className: "q-stars", "aria-label": result.stars + " van de drie sterren" }, V.starsText(result.score)), V.el("p", {}, "Beste score: " + entry.bestScore + "/100"), V.el("p", { className: "q-small" }, result.critical ? "Een veiligheidsfout beperkt de score van deze poging. Speel opnieuw om een veiligere aanpak te oefenen." : "Je hebt dit oefenspel voltooid. Pas deze vaardigheid ook op het werk toe.")];
    return { body: V.layout("Spel voltooid", meta.takeaway, details, result.score >= 70 ? "Circuit: deze vaardigheid komt van pas op het werk." : "Circuit: elke nieuwe poging is een kans om te leren."), note: meta.title + " · " + C.summary(progress).completed + "/5 spellen voltooid.", buttons: [V.button("Speel opnieuw", () => openGame(activeId, true)), V.button(nextId ? "Volgende: " + Q.content.meta[nextId].title : "Leeroverzicht", () => nextId ? openGame(nextId) : showSummary(), { primary: true })] };
  };
  const summaryView = () => {
    const summary = C.summary(progress);
    const entries = Q.content.order.map((id) => V.el("div", { className: "q-summary-item" }, Q.content.meta[id].title + ": " + (progress.games[id]?.bestScore ?? "—") + "/100"));
    const achievements = [V.el("div", { className: "q-score-big" }, summary.score + "/500"), V.el("p", {}, summary.completed + "/5 spellen · " + summary.stars + "/15 sterren · " + summary.percent + "% voltooid"), ...(summary.badge ? [V.el("span", { className: "q-badge" }, "AI-vaardig — Oefenbadge")] : [])];
    return { body: V.layout(summary.completed === 5 ? "Je AI-vaardigheden in beeld" : "Je voortgang tot nu toe", "RICHT: Rol, Intentie, Context, Houding en Template. Verbeter prompts, gebruik voorbeelden, controleer tussenstappen en vergelijk antwoorden met bronnen.", [V.el("div", { className: "q-topline" }, [V.circuit("celebrate"), V.el("div", {}, achievements)]), V.el("div", { className: "q-summary-list" }, entries)]), note: "Persoonlijke oefenresultaten · " + adapter.status(), buttons: [V.button("RICHT-spiekkaart", showHelp), V.button("Kies een spel", showOverview), V.button("Sluiten", () => Q.launcher.close(), { primary: true })] };
  };
  const render = (focus = false) => {
    if (!initialized) return;
    const previousKey = document.activeElement?.getAttribute("data-q-focus");
    const summary = C.summary(progress);
    document.getElementById("quest-score").textContent = summary.completed + "/5 · " + summary.stars + "★";
    home.hidden = screen === "overview";
    document.getElementById("quest-subtitle").textContent = screen === "game" && activeId ? Q.content.meta[activeId].title + " · " + (state.round + 1) + "/" + Q.games[activeId].count : screen === "summary" ? "Je leeroverzicht" : "Vijf korte spellen · ongeveer 12–15 minuten";
    let view;
    try {
      if (screen === "reset") view = { body: V.layout("Alle oefenvoortgang wissen?", "Dit wist alleen de voortgang van het AI Werkplekavontuur in deze browser. Je kunt dit niet ongedaan maken.", V.el("p", {}, "Je kunt een spel opnieuw spelen zonder je beste score te wissen.")), note: "Je voorkeuren voor de startpagina blijven behouden.", buttons: [V.button("Bewaar voortgang", () => { screen = "overview"; render(true); }, { primary: true }), V.button("Wis alle voortgang", () => { progress = adapter.reset(); activeId = null; state = null; screen = "overview"; render(true); announce("Je oefenvoortgang is gewist."); })] };
      else if (screen === "help") view = helpView();
      else if (screen === "summary") view = summaryView();
      else if (screen === "overview") view = overview();
      else if (state.phase === "intro") view = intro();
      else if (state.phase === "completed") view = completion();
      else view = Q.games[activeId].render(state, { view: V, dispatch });
    } catch {
      view = { body: V.el("p", {}, "Dit spel kan niet worden weergegeven. Je opgeslagen voortgang is nog beschikbaar."), note: "Kies een ander spel of begin een nieuwe poging.", buttons: [V.button("Kies een spel", showOverview), V.button("Begin dit spel opnieuw", () => openGame(activeId, true), { primary: true })] };
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
    if (!activeId || !state || busy || screen !== "game") return;
    busy = true;
    try {
      const previousPhase = state.phase;
      const next = Q.games[activeId].reduce(state, action);
      if (JSON.stringify(next) === JSON.stringify(state)) return;
      state = next;
      save();
      render(true);
      if (state.phase === "feedback" && previousPhase !== "feedback") announce("Resultaat: " + Math.round(state.evaluation.score) + " van de 100. " + state.evaluation.feedback[0]);
      else if (state.phase === "completed" && previousPhase !== "completed") announce("Spel voltooid. " + C.result(state).score + " van de 100.");
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
    document.getElementById("quest-help").addEventListener("click", showHelp);
  };
  Q.controller = { init, save, openGame, dispatch, showOverview, showSummary, showHelp, onOpen: showOverview, getProgress: () => C.clone(progress), getAttempt: () => state ? C.clone(state) : null };
})(window.CDSCLearning);
