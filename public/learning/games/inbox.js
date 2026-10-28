((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ choices: {}, slot: "task", generations: 0, firstScore: null, bestDraftScore: null, evaluation: null });
  const evaluate = (state) => {
    const scenario = content.inbox[state.round];
    const chosen = Object.fromEntries(content.slots.map((slot) => [slot, scenario.ingredients[slot].find((item) => item.id === state.choices[slot])]));
    const good = (slot) => chosen[slot]?.quality === "good";
    const critical = Object.values(chosen).some((item) => item?.quality === "unsafe");
    const weights = { task: 20, context: 15, audience: 10, tone: 15, constraints: 20, format: 10 };
    const suitability = good("task") && good("tone") && good("constraints") && !critical ? 10 : 0;
    const score = content.slots.reduce((sum, slot) => sum + (good(slot) ? weights[slot] : 0), suitability);
    const missing = content.slots.filter((slot) => !good(slot));
    const feedback = critical ? ["Het concept bevat een onbevoegde toezegging of een verzonnen regel. Vervang die instructie voordat je de tekst gebruikt."] : [];
    if (missing.length) feedback.push("Verbeter: " + missing.map((slot) => content.slotLabels[slot].toLowerCase()).join(", ") + ". Duidelijke, relevante instructies helpen meer dan extra woorden.");
    if (good("constraints")) feedback.push("Je grenzen voorkomen ongefundeerde toezeggingen.");
    if (!missing.length) feedback.push("De prompt bevat een duidelijke taak, doelgroep, context, toon, grenzen en een bruikbare antwoordvorm.");
    const lines = [];
    if (good("format")) lines.push("Onderwerp: " + scenario.subject, "");
    lines.push(good("audience") ? scenario.greeting : "Hallo,", "");
    if (chosen.tone?.id === "tone-weak") lines.push("Uw verzoek is niet acceptabel.");
    lines.push(chosen.task?.quality === "unsafe" ? scenario.unsafe : good("task") ? scenario.goodBody : "Bedankt voor uw bericht. We zullen uw verzoek bekijken.");
    if (chosen.constraints?.quality === "unsafe") lines.push(scenario.invented);
    if (good("context")) lines.push(scenario.positive);
    if (!good("constraints") && !critical) lines.push("Controleer welke toezeggingen zijn toegestaan voordat u dit concept verstuurt.");
    if (!good("format")) lines.push("Er zijn nog diverse aanvullende overwegingen en mogelijke vervolggesprekken die we verder zouden kunnen uitwerken.");
    return { ...C.grade(score, critical, feedback, lines.join("\n")), firstScore: state.firstScore };
  };
  const game = {
    id: "inbox", revision: 1, count: 2,
    createAttempt: () => C.attempt("inbox", reset()),
    evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "slot" && state.phase === "active" && content.slots.includes(action.id)) state.slot = action.id;
      else if (action.type === "choose" && state.phase === "active" && content.inbox[state.round].ingredients[state.slot].some((item) => item.id === action.id)) state.choices[state.slot] = action.id;
      else if (action.type === "generate" && state.phase === "active" && Object.keys(state.choices).length) {
        const evaluation = evaluate(state);
        if (state.firstScore === null) state.firstScore = evaluation.score;
        evaluation.firstScore = state.firstScore;
        state.bestDraftScore = Math.max(state.bestDraftScore || 0, evaluation.score);
        state.generations++;
        state.evaluation = evaluation;
        state.phase = "feedback";
      } else if (action.type === "retry" && state.phase === "feedback") { state.phase = "active"; state.evaluation = null; }
      else if (action.type === "next") return C.next(state, 2, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("inbox", raw, 2);
      if (!base) return null;
      const state = { ...base, ...reset() };
      for (const slot of content.slots) if (content.inbox[state.round].ingredients[slot].some((item) => item.id === raw.choices?.[slot])) state.choices[slot] = raw.choices[slot];
      state.slot = content.slots.includes(raw.slot) ? raw.slot : "task";
      state.generations = Number.isInteger(raw.generations) ? C.clamp(raw.generations, 0, 100000) : 0;
      state.firstScore = Number.isFinite(raw.firstScore) ? C.clamp(raw.firstScore) : null;
      state.bestDraftScore = Number.isFinite(raw.bestDraftScore) ? C.clamp(raw.bestDraftScore) : null;
      if (state.phase === "feedback") { if (!Object.keys(state.choices).length) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.inbox[state.round];
      if (state.phase === "feedback") return {
        body: V.el("div", { className: "q-layout" }, [V.el("div", {}, [V.el("h3", {}, "Bekijk het resultaat"), V.feedback(state.evaluation)]), V.output(state.evaluation.output)]),
        note: "Eerste score: " + Math.round(state.firstScore) + " · Nu: " + Math.round(state.evaluation.score) + "/100",
        buttons: [V.button("Verbeter de prompt", () => dispatch({ type: "retry" })), V.button("Bewaar dit concept", () => dispatch({ type: "next" }), { primary: true })],
      };
      const tabs = V.el("div", { className: "q-tabs", role: "group", "aria-label": "Onderdelen van de prompt" }, content.slots.map((slot) => V.button((state.choices[slot] ? "✓ " : "") + content.slotLabels[slot], () => dispatch({ type: "slot", id: slot }), { className: "q-choice", key: "slot-" + slot, pressed: state.slot === slot })));
      const panel = [tabs, V.el("h4", {}, "Onderdeel: " + content.slotLabels[state.slot].toLowerCase()), V.choices(scenario.ingredients[state.slot], (id) => dispatch({ type: "choose", id }), state.choices[state.slot], "ingredient")];
      return { body: V.layout(scenario.title, scenario.brief, panel, "Maak een prompt, probeer hem uit en verbeter hem."), note: Object.keys(state.choices).length + "/6 onderdelen · Je kunt al een antwoord genereren.", buttons: [V.button("Genereer", () => dispatch({ type: "generate" }), { primary: true, disabled: !Object.keys(state.choices).length })] };
    },
  };
  C.register(game);
})(window.CDSCLearning);
