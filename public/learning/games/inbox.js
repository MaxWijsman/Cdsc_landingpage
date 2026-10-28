((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ choices: {}, slot: "role", examples: [], exampleId: null, screen: "builder", generations: 0, firstScore: null, bestDraftScore: null, evaluation: null });
  const selected = (state) => content.slots.map((slot) => [slot, content.inbox[state.round].ingredients[slot].find((item) => item.id === state.choices?.[slot])]);
  const prompt = (state) => {
    const fields = Object.fromEntries(selected(state).map(([slot, item]) => [slot, item?.label || "[niet ingevuld]"]));
    const lines = content.slots.map((slot) => content.slotLabels[slot] + ": " + fields[slot]);
    if (state.round === 1) for (const item of content.inbox[1].examples.filter((example) => (state.examples || []).includes(example.id))) lines.push("", "Voorbeeld — invoer: " + item.input, "Voorbeeld — uitvoer: " + item.output);
    return lines.join("\n");
  };
  const evaluate = (state) => {
    const scenario = content.inbox[state.round];
    const examples = state.round === 1 ? scenario.examples.filter((item) => (state.examples || []).includes(item.id)) : [];
    const chosen = Object.fromEntries(selected(state));
    const good = (slot) => chosen[slot]?.quality === "good";
    const critical = Object.values(chosen).some((item) => item?.quality === "unsafe") || examples.some((item) => item.quality === "unsafe");
    const weights = { role: 15, intent: 25, context: 30, attitude: 15, template: 15 };
    const score = content.slots.reduce((sum, slot) => sum + (good(slot) ? weights[slot] : 0), 0);
    const feedback = content.slots.filter((slot) => !good(slot)).map((slot) => scenario.feedback[slot]);
    if (critical) feedback.unshift("Een rol, instructie of voorbeeld geeft AI geen bevoegdheid om onbevestigde toezeggingen te doen of beleid te verzinnen.");
    if (!feedback.length) feedback.push("RICHT is compleet: passende Rol, duidelijke Intentie, relevante Context, respectvolle Houding en een bruikbaar Template.");
    if (examples.length) {
      feedback.push(...examples.map((item) => item.why));
      feedback.push("Voorbeelden zijn optioneel en leveren geen extra punten op. Je RICHT-instructies en opdrachtfeiten blijven leidend.");
    }
    const lines = [];
    if (good("template")) lines.push("Onderwerp: " + scenario.subject, "");
    else if (chosen.template?.id === "template-wrong") lines.push(state.round === 0 ? "#Klantupdate" : "#Projectupdate");
    lines.push(good("context") ? scenario.greeting : "Hallo,", "");
    if (chosen.role?.id === "role-weak") lines.push("Als algemene assistent geef ik een algemene reactie.");
    if (chosen.role?.quality === "unsafe") lines.push(state.round === 0 ? "Als directeur keur ik de korting zelfstandig goed. [Niet bevoegd]" : "Als projectleider leg ik vrijdag als opleverdatum vast. [Niet bevestigd]");
    if (chosen.attitude?.id === "attitude-wrong") lines.push(state.round === 0 ? "Uw verzoek is niet acceptabel." : "Deze vertraging is niet mijn probleem.");
    lines.push(chosen.intent?.quality === "unsafe" ? scenario.unsafe : good("intent") ? scenario.goodBody : "Bedankt voor uw bericht. We zullen uw verzoek bekijken.");
    if (chosen.context?.quality === "unsafe") lines.push(scenario.invented);
    else if (good("context")) lines.push(scenario.positive);
    else if (chosen.context) lines.push("Ons bedrijf heeft een lange geschiedenis.");
    if (examples.some((item) => item.quality === "unsafe")) lines.push(scenario.unsafe);
    if (!good("context") && !critical) lines.push("Controleer welke toezeggingen zijn toegestaan voordat u dit concept verstuurt.");
    if (good("attitude")) lines.push(state.round === 0 ? "Dank voor uw begrip. We blijven graag met u in gesprek." : "Bedankt voor jullie begrip. We houden jullie op de hoogte.");
    if (!good("role") && !chosen.role) lines.push("Een passend vakperspectief is nog niet opgegeven.");
    if (!good("template") && chosen.template?.id !== "template-wrong") lines.push("Er zijn nog diverse aanvullende overwegingen en mogelijke vervolggesprekken die we verder zouden kunnen uitwerken.");
    return { ...C.grade(score, critical, feedback, lines.join("\n")), firstScore: state.firstScore };
  };
  const canGenerate = (state) => Object.keys(state.choices).length > 0;
  C.register({
    id: "inbox", revision: 3, count: 2, prompt,
    createAttempt: () => C.attempt("inbox", reset()), evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "screen" && ["active", "feedback"].includes(state.phase) && (["builder", "prompt", "output"].includes(action.id) || action.id === "examples" && state.round === 1 && state.phase === "active")) state.screen = action.id;
      else if (action.type === "slot" && state.phase === "active" && content.slots.includes(action.id)) state.slot = action.id;
      else if (action.type === "choose" && state.phase === "active" && content.inbox[state.round].ingredients[state.slot].some((item) => item.id === action.id)) state.choices[state.slot] = action.id;
      else if (action.type === "example" && state.round === 1 && state.phase === "active" && content.inbox[1].examples.some((item) => item.id === action.id)) state.exampleId = action.id;
      else if (action.type === "toggle-example" && state.round === 1 && state.phase === "active" && content.inbox[1].examples.some((item) => item.id === action.id)) {
        if (state.examples.includes(action.id)) state.examples = state.examples.filter((id) => id !== action.id);
        else if (state.examples.length < 2) state.examples.push(action.id);
      } else if (action.type === "generate" && state.phase === "active" && canGenerate(state)) {
        const evaluation = evaluate(state);
        if (state.firstScore === null) state.firstScore = evaluation.score;
        evaluation.firstScore = state.firstScore;
        state.bestDraftScore = Math.max(state.bestDraftScore || 0, evaluation.score);
        state.generations++; state.evaluation = evaluation; state.phase = "feedback"; state.screen = "output";
      } else if (action.type === "retry" && state.phase === "feedback") { state.phase = "active"; state.evaluation = null; state.screen = "builder"; }
      else if (action.type === "next") return C.next(state, 2, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("inbox", raw, 2);
      if (!base) return null;
      const state = { ...base, ...reset() };
      for (const slot of content.slots) if (content.inbox[state.round].ingredients[slot].some((item) => item.id === raw.choices?.[slot])) state.choices[slot] = raw.choices[slot];
      state.slot = content.slots.includes(raw.slot) ? raw.slot : "role";
      const ids = content.inbox[1].examples.map((item) => item.id);
      state.examples = Array.isArray(raw.examples) ? [...new Set(raw.examples.filter((id) => ids.includes(id)))].slice(0, 2) : [];
      state.exampleId = ids.includes(raw.exampleId) ? raw.exampleId : null;
      state.screen = ["builder", "prompt", "output"].includes(raw.screen) || raw.screen === "examples" && state.round === 1 ? raw.screen : "builder";
      state.generations = Number.isInteger(raw.generations) ? C.clamp(raw.generations, 0, 100000) : 0;
      state.firstScore = Number.isFinite(raw.firstScore) ? C.clamp(raw.firstScore) : null;
      state.bestDraftScore = Number.isFinite(raw.bestDraftScore) ? C.clamp(raw.bestDraftScore) : null;
      if (state.phase === "feedback") { if (!canGenerate(state)) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.inbox[state.round];
      const viewPrompt = state.screen === "prompt";
      const togglePrompt = V.button(viewPrompt ? (state.phase === "feedback" ? "Bekijk het concept" : "Terug naar onderdelen") : "Bekijk RICHT-prompt", () => dispatch({ type: "screen", id: viewPrompt ? (state.phase === "feedback" ? "output" : "builder") : "prompt" }));
      if (state.phase === "feedback") return {
        body: V.el("div", { className: "q-layout" }, [V.el("div", {}, [V.el("h3", {}, "Bekijk het resultaat"), V.feedback(state.evaluation)]), V.output(viewPrompt ? prompt(state) : state.evaluation.output, viewPrompt ? "Jouw RICHT-prompt" : "Gesimuleerde AI")]),
        note: "Eerste score: " + Math.round(state.firstScore) + " · Nu: " + Math.round(state.evaluation.score) + "/100",
        buttons: [togglePrompt, V.button("Verbeter de prompt", () => dispatch({ type: "retry" })), V.button("Bewaar dit concept", () => dispatch({ type: "next" }), { primary: true })],
      };
      const generate = V.button("Genereer", () => dispatch({ type: "generate" }), { primary: true, disabled: !canGenerate(state) });
      if (viewPrompt) return { body: V.layout("Jouw RICHT-prompt", "Dit zijn de instructies. Het gesimuleerde antwoord verschijnt na genereren.", V.output(prompt(state), "Prompt")), note: "RICHT · Voorbeelden zijn optioneel.", buttons: [togglePrompt, generate] };
      if (state.round === 1 && state.screen === "examples") {
        const item = scenario.examples.find((example) => example.id === state.exampleId);
        const tabs = V.el("div", { className: "q-tabs", role: "group", "aria-label": "Bekijk de vier voorbeelden" }, scenario.examples.map((example, index) => V.button((state.examples.includes(example.id) ? "✓ " : "") + "Voorbeeld " + "ABCD"[index], () => dispatch({ type: "example", id: example.id }), { pressed: example.id === state.exampleId, key: "example-" + example.id, className: "q-choice" })));
        const panel = [tabs, ...(item ? [V.el("h4", {}, item.label), V.el("p", { className: "q-small" }, "Invoer: " + item.input), V.output(item.output, "Gesimuleerde AI — voorbeeld")] : [V.el("p", {}, "Je mag maximaal twee voorbeelden toevoegen. Dit is niet nodig om het spel te voltooien of de maximale score te halen.")])];
        return { body: V.layout("Voorbeelden — optioneel", scenario.brief, panel, "Voorbeeldfeiten zijn geen feiten over jouw nieuwe opdracht."), note: state.examples.length + "/2 optionele voorbeelden · Geen extra punten.", buttons: [V.button("Terug naar RICHT", () => dispatch({ type: "screen", id: "builder" })), ...(item ? [V.button(state.examples.includes(item.id) ? "Verwijder voorbeeld" : "Gebruik voorbeeld", () => dispatch({ type: "toggle-example", id: item.id }), { disabled: state.examples.length === 2 && !state.examples.includes(item.id), pressed: state.examples.includes(item.id) })] : []), generate] };
      }
      const tabs = V.el("div", { className: "q-tabs", role: "group", "aria-label": "RICHT-onderdelen" }, content.slots.map((slot) => V.button((state.choices[slot] ? "✓ " : "") + content.slotLabels[slot], () => dispatch({ type: "slot", id: slot }), { className: "q-choice", key: "slot-" + slot, pressed: state.slot === slot })));
      const panel = [tabs, V.el("h4", {}, content.slotLabels[state.slot]), V.choices(scenario.ingredients[state.slot], (id) => dispatch({ type: "choose", id }), state.choices[state.slot], "ingredient")];
      return { body: V.layout(scenario.title, scenario.brief, panel, "RICHT: Rol, Intentie, Context, Houding, Template."), note: Object.keys(state.choices).length + "/5 RICHT-onderdelen · Voorbeelden zijn niet verplicht.", buttons: [...(state.round === 1 ? [V.button("Voorbeelden (optioneel)", () => dispatch({ type: "screen", id: "examples" }))] : []), togglePrompt, generate] };
    },
  });
})(window.CDSCLearning);
