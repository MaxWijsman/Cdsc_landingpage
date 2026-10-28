((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = (round = 0) => ({ actions: [], screen: round === 0 ? "meta" : "draft", original: false, metaChoice: null, clarifications: {}, evaluation: null });
  const quality = (actions) => {
    const flags = { accuracy: true, concise: false, structured: false, risks: false, audience: false, next: false };
    for (const id of actions) {
      if (id === "structure") { flags.concise = true; flags.structured = true; flags.accuracy = true; }
      if (id === "next") flags.next = true;
      if (id === "audience") { flags.audience = true; flags.risks = true; }
      if (id === "cut") { flags.concise = true; flags.risks = false; flags.next = false; }
      if (id === "stats") flags.accuracy = false;
      if (id === "complex") { flags.concise = false; flags.structured = false; flags.audience = false; }
    }
    return flags;
  };
  const answer = (state, id) => content.metaPrompt.questions.find((question) => question.id === id).options.find((option) => option.id === state.clarifications[id]);
  const prompt = (state) => {
    if (state.metaChoice === "longer") return "Maak een zeer uitgebreide, uitvoerige en lange update van deze informatie. Schrijf veel tekst.";
    if (state.metaChoice === "invent") return "Schrijf een overtuigende update. Verzin dat de oplossing vrijdag klaar is en beloof de startdatum.";
    return [
      "Rol: je bent een projectassistent die een concept schrijft, zonder beslissingsbevoegdheid.",
      "Intentie: geef een bruikbare statusupdate met een advies.",
      "Context: " + content.repair[0].source + " Doelgroep: " + (answer(state, "audience")?.label || "[eerst uitvragen]") + ". Verzin geen feiten of datums.",
      "Houding: professioneel en neutraal.",
      "Template: " + (answer(state, "template")?.label || "[eerst uitvragen]") + ".",
    ].join("\n");
  };
  const draft = (state) => {
    const scenario = content.repair[state.round];
    if (state.round === 0) {
      if (state.metaChoice === "invent") return "De leverancier heeft de oplossing gegarandeerd vrijdag klaar. Het project start vrijdag. [Niet onderbouwd door de bron]";
      if (state.metaChoice !== "richt") return scenario.original + "\nEr zijn daarnaast nog veel andere overwegingen die uitgebreid besproken kunnen worden.";
      const header = state.clarifications.audience === "management" ? "Update voor het management" : state.clarifications.audience === "team" ? "Update voor het technische team" : "Openbare projectupdate";
      const lines = [scenario.facts, scenario.risk, "Advies: " + scenario.next];
      return header + "\n" + (state.clarifications.template === "bullets" ? lines.map((line) => "• " + line).join("\n") : state.clarifications.template === "post" ? "#Projectupdate " + lines.join(" ") : lines.join(" ") + " Deze situatie biedt ruimte voor een uitgebreide verdere bespreking.");
    }
    const flags = quality(state.actions);
    if (!state.actions.length) return scenario.original;
    const lines = [];
    if (flags.audience) lines.push("Update voor het management");
    if (flags.next) lines.push((flags.structured ? "• Advies: " : "Voorgestelde volgende stap: ") + scenario.next);
    lines.push((flags.structured ? "• " : "") + scenario.facts);
    if (flags.risks) lines.push((flags.structured ? "• Risico: " : "Risico: ") + scenario.risk);
    if (!flags.concise) lines.push("Er zijn allerlei samenhangende overwegingen en gesprekken die op verschillende manieren meer aandacht kunnen vragen.");
    if (!flags.accuracy) lines.push("Er wordt een indrukwekkende productiviteitsstijging van 92% verwacht. [Niet onderbouwd door de bron]");
    return lines.join("\n");
  };
  const evaluate = (state) => {
    if (state.round === 0) {
      const good = state.metaChoice === "richt", critical = state.metaChoice === "invent";
      const feedback = [content.metaPrompt.options.find((option) => option.id === state.metaChoice)?.why || "Kies eerst hoe AI je prompt moet verbeteren."];
      let score = good ? 40 : 0;
      if (good) for (const question of content.metaPrompt.questions) {
        if (state.clarifications[question.id] === question.answer) score += 30;
        else feedback.push(question.id === "audience" ? "Context: de opdracht vraagt een update voor het management dat capaciteit kan toewijzen." : "Template: drie korte punten maken status, risico en advies direct bruikbaar.");
      }
      if (score === 100) feedback.push("Je liet ontbrekende informatie uitvragen en controleerde de herschreven RICHT-prompt.");
      return C.grade(score, critical, feedback, draft(state));
    }
    const flags = quality(state.actions);
    const weights = { accuracy: 25, concise: 15, structured: 15, risks: 15, audience: 15, next: 15 };
    const score = Object.entries(weights).reduce((sum, [key, value]) => sum + (flags[key] ? value : 0), 0);
    const missing = Object.keys(flags).filter((key) => !flags[key]);
    return C.grade(score, !flags.accuracy, missing.length ? ["Nog verbeteren: " + missing.map((key) => content.qualityLabels[key]).join(", ") + ".", !flags.accuracy ? "Verwijder het niet-onderbouwde cijfer. Herschrijven levert geen bewijs op." : "Bruikbare feedback verbetert het concept zonder feiten te verzinnen."] : ["Drie gerichte instructies verbeterden Intentie, Context en Template zonder feiten te verzinnen."], draft(state));
  };
  const ready = (state) => state.metaChoice && (state.metaChoice !== "richt" || content.metaPrompt.questions.every((question) => answer(state, question.id)));
  C.register({
    id: "repair", revision: 2, count: 2, quality, prompt,
    createAttempt: () => C.attempt("repair", reset()), evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "screen" && ["active", "feedback"].includes(state.phase) && (state.round === 0 ? ["meta", "questions", "prompt", "output"] : ["draft", "actions"]).includes(action.id)) state.screen = action.id;
      else if (action.type === "meta-choice" && state.round === 0 && state.phase === "active" && content.metaPrompt.options.some((option) => option.id === action.id)) {
        if (state.metaChoice !== action.id) state.clarifications = {};
        state.metaChoice = action.id; state.screen = action.id === "richt" ? "questions" : "meta";
      } else if (action.type === "clarify" && state.round === 0 && state.phase === "active" && state.metaChoice === "richt" && content.metaPrompt.questions.some((question) => question.id === action.question && question.options.some((option) => option.id === action.id))) state.clarifications[action.question] = action.id;
      else if (action.type === "reset-questions" && state.round === 0 && state.phase === "active" && state.metaChoice === "richt") { state.clarifications = {}; state.screen = "questions"; }
      else if (action.type === "original" && state.round === 1 && state.phase === "active") state.original = !state.original;
      else if (action.type === "apply" && state.round === 1 && state.phase === "active" && state.actions.length < 3 && !state.actions.includes(action.id) && content.repairActions.some((item) => item.id === action.id)) {
        state.actions.push(action.id); state.screen = "draft"; state.original = false;
      } else if (action.type === "finish" && state.phase === "active" && (state.round === 1 || ready(state))) { state.evaluation = evaluate(state); state.phase = "feedback"; state.screen = state.round === 0 ? "prompt" : "draft"; }
      else if (action.type === "retry" && state.phase === "feedback") Object.assign(state, reset(state.round), { phase: "active" });
      else if (action.type === "next") return C.next(state, 2, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("repair", raw, 2);
      if (!base || !Array.isArray(raw.actions) || raw.actions.length > 3 || new Set(raw.actions).size !== raw.actions.length || raw.actions.some((id) => !content.repairActions.some((item) => item.id === id))) return null;
      const state = { ...base, ...reset(base.round), actions: raw.actions.slice() };
      const screens = state.round === 0 ? ["meta", "questions", "prompt", "output"] : ["draft", "actions"];
      state.screen = screens.includes(raw.screen) ? raw.screen : state.screen;
      state.original = raw.original === true;
      state.metaChoice = content.metaPrompt.options.some((option) => option.id === raw.metaChoice) ? raw.metaChoice : null;
      for (const question of content.metaPrompt.questions) if (question.options.some((option) => option.id === raw.clarifications?.[question.id])) state.clarifications[question.id] = raw.clarifications[question.id];
      if (state.phase === "feedback") { if (state.round === 0 && !ready(state)) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.repair[state.round];
      if (state.phase === "feedback") {
        const viewPrompt = state.round === 0 && state.screen === "prompt";
        return { body: V.el("div", { className: "q-layout" }, [V.el("div", {}, [V.el("h3", {}, state.round === 0 ? "Meta-prompting: bekijk het voorstel" : "Bekijk de verbetering"), V.feedback(state.evaluation)]), V.output(viewPrompt ? prompt(state) : state.evaluation.output, viewPrompt ? "Gesimuleerde AI — verbeterde prompt" : "Gesimuleerde AI")]), note: Math.round(state.evaluation.score) + "/100 · Controleer het voorstel zelf.", buttons: [...(state.round === 0 ? [V.button(viewPrompt ? "Bekijk het concept" : "Bekijk RICHT-prompt", () => dispatch({ type: "screen", id: viewPrompt ? "output" : "prompt" }))] : []), V.button("Probeer deze ronde opnieuw", () => dispatch({ type: "retry" })), V.button("Bewaar de verbetering", () => dispatch({ type: "next" }), { primary: true })] };
      }
      if (state.round === 0) {
        if (state.screen === "questions" && state.metaChoice === "richt") {
          const question = content.metaPrompt.questions.find((item) => !answer(state, item.id));
          if (question) return { body: V.layout("Gesimuleerde AI vraagt door", scenario.goal + "\n" + scenario.source, [V.el("h4", {}, question.text), V.choices(question.options, (id) => dispatch({ type: "clarify", question: question.id, id }), state.clarifications[question.id], "clarification")], "Ontbrekende informatie uitvragen is beter dan feiten verzinnen."), note: Object.keys(state.clarifications).length + "/2 vragen beantwoord · Meta-prompting.", buttons: [V.button("Andere meta-prompt", () => dispatch({ type: "screen", id: "meta" }))] };
          return { body: V.layout("De informatie is compleet", "Bekijk hoe AI je instructie met RICHT herschrijft.", V.output(prompt(state), "Gesimuleerde AI — voorstel")), note: "Controleer doelgroep, grenzen en antwoordvorm.", buttons: [V.button("Antwoorden aanpassen", () => dispatch({ type: "reset-questions" })), V.button("Genereer het voorstel", () => dispatch({ type: "finish" }), { primary: true })] };
        }
        return { body: V.layout("Laat AI je prompt verbeteren", scenario.goal + "\nVage prompt: “" + content.metaPrompt.original + "”\nBron: " + scenario.source, [V.el("h4", {}, "Welke opdracht geef je aan AI?"), V.choices(content.metaPrompt.options, (id) => dispatch({ type: "meta-choice", id }), state.metaChoice, "meta")], "Meta-prompting: je gebruikt AI om een betere prompt te maken."), note: "Vraag ontbrekende Context en Template uit.", buttons: [V.button(state.metaChoice === "richt" ? "Beantwoord de vragen" : "Bekijk het voorstel", () => state.metaChoice === "richt" ? dispatch({ type: "screen", id: "questions" }) : dispatch({ type: "finish" }), { primary: true, disabled: !state.metaChoice })] };
      }
      if (state.screen === "actions") return { body: V.layout("Geef gerichte feedback", scenario.goal, V.choices(content.repairActions.map((item) => ({ ...item, disabled: state.actions.includes(item.id) })), (id) => dispatch({ type: "apply", id }), undefined, "repair", 2), "Elke verbeterinstructie kost één van je drie beurten."), note: (3 - state.actions.length) + " beurten over.", buttons: [V.button("Terug naar het concept", () => dispatch({ type: "screen", id: "draft" }))] };
      const flags = quality(state.actions);
      const metrics = V.el("div", { className: "q-metrics" }, Object.entries(flags).map(([key, value]) => V.el("span", { className: "q-metric" + (value ? " is-good" : "") }, (value ? "✓ " : "○ ") + content.qualityLabels[key])));
      const previousLines = draft({ ...state, actions: state.actions.slice(0, -1) }).split("\n");
      const passages = draft(state).split("\n").flatMap((line, index) => [index ? "\n" : "", state.actions.length && !previousLines.includes(line) ? V.el("mark", { className: "q-changed" }, line) : line]);
      const panel = [V.output(state.original ? scenario.original : passages), metrics];
      const last = state.actions.at(-1);
      return { body: V.layout(scenario.title, scenario.source, panel, last ? content.repairActions.find((item) => item.id === last).why : "Verbeter Intentie, Context en Template. Houding gaat alleen over toon en stijl."), note: (3 - state.actions.length) + " beurten over · Houd je aan de bronfeiten.", buttons: [V.button(state.original ? "Huidig concept" : "Origineel", () => dispatch({ type: "original" })), V.button("Rond de verbetering af", () => dispatch({ type: "finish" }), { primary: state.actions.length === 3 }), ...(state.actions.length < 3 ? [V.button("Geef feedback", () => dispatch({ type: "screen", id: "actions" }), { primary: true })] : [])] };
    },
  });
})(window.CDSCLearning);
