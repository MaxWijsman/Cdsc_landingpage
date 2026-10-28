((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ redacted: [], workflow: null, screen: "redact", evaluation: null });
  const classLabel = (id) => content.classLabels[id] || "onbekende informatieklasse";
  const policyText = () => content.workflows.filter((tool) => tool.id !== "decline").map((tool) => tool.label + ": " + ((content.policy.allowed[tool.id] || []).map(classLabel).join(" + ") || "geen informatieklassen") + " toegestaan.").join(" ") + " Alle andere informatieklassen zijn verboden.";
  const evaluate = (state) => {
    const scenario = content.danger[state.round];
    const required = scenario.segments.filter((span) => span.remove);
    const correct = required.filter((span) => state.redacted.includes(span.id)).length;
    const falsePositives = scenario.segments.filter((span) => !span.remove && state.redacted.includes(span.id)).length;
    const minimization = C.clamp((correct - falsePositives) / required.length * 50, 0, 50);
    const remaining = scenario.segments.filter((span) => !state.redacted.includes(span.id));
    const permitted = content.policy.allowed[state.workflow] || [];
    const critical = state.workflow !== "decline" && (!permitted.includes(scenario.classification) || remaining.some((span) => !permitted.includes(span.dataClass)));
    const workflowPoints = critical ? 0 : state.workflow === scenario.preferred ? 50 : state.workflow === "decline" ? 35 : 0;
    const feedback = [];
    if (correct < required.length) feedback.push("Zoek de overgebleven persoonsgegevens of toegangscode. Deze gegevens zijn niet nodig voor de taak.");
    if (falsePositives) feedback.push("Behoud bruikbare, niet-gevoelige feiten. Alles verwijderen levert geen bruikbare samenvatting op.");
    if (critical) {
      const exposed = [...new Set([scenario.classification, ...remaining.map((span) => span.dataClass)].filter((dataClass) => !permitted.includes(dataClass)))];
      feedback.push("Niet versturen. Dit fictieve hulpmiddel staat de volgende overgebleven informatieklassen niet toe: " + exposed.map(classLabel).join(", ") + ".");
    }
    else if (state.workflow === "decline" && scenario.preferred !== "decline") feedback.push("Niet versturen is veilig. Na het verwijderen van onnodige gegevens kun je deze taak ook uitvoeren met de goedgekeurde zakelijke assistent.");
    else feedback.push(scenario.classification === "restricted" ? "Goed: weglakken verandert de toegangsbeperking van het document niet. Gebruik het goedgekeurde proces zonder AI." : "Na het verwijderen van persoonsgegevens mogen de noodzakelijke interne feiten naar de fictieve goedgekeurde zakelijke assistent.");
    feedback.push("RICHT — Context: deel alleen noodzakelijke, toegestane informatie. Een goede prompt verandert het gegevensbeleid niet.");
    return C.grade(minimization + workflowPoints, critical, feedback, remaining.map((span) => span.text).join(" ") || "[Alle documentinhoud verwijderd]");
  };
  C.register({
    id: "data-danger", revision: 1, count: 2,
    createAttempt: () => C.attempt("data-danger", reset()), evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      const scenario = content.danger[state.round];
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "redact" && state.phase === "active" && scenario.segments.some((span) => span.id === action.id)) state.redacted = state.redacted.includes(action.id) ? state.redacted.filter((id) => id !== action.id) : [...state.redacted, action.id];
      else if (action.type === "screen" && state.phase === "active" && ["redact", "workflow"].includes(action.id)) state.screen = action.id;
      else if (action.type === "workflow" && state.phase === "active" && content.workflows.some((item) => item.id === action.id)) state.workflow = action.id;
      else if (action.type === "check" && state.phase === "active" && state.workflow) { state.evaluation = evaluate(state); state.phase = "feedback"; }
      else if (action.type === "retry" && state.phase === "feedback") { state.phase = "active"; state.screen = "redact"; state.evaluation = null; }
      else if (action.type === "next") return C.next(state, 2, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("data-danger", raw, 2);
      if (!base) return null;
      const state = { ...base, ...reset() };
      state.redacted = Array.isArray(raw.redacted) ? [...new Set(raw.redacted.filter((id) => content.danger[state.round].segments.some((span) => span.id === id)))] : [];
      state.workflow = content.workflows.some((item) => item.id === raw.workflow) ? raw.workflow : null;
      state.screen = raw.screen === "workflow" ? "workflow" : "redact";
      if (state.phase === "feedback") { if (!state.workflow) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.danger[state.round];
      if (state.phase === "feedback") return { body: V.el("div", { className: "q-layout" }, [V.feedback(state.evaluation), V.output(state.evaluation.output, "Aangepaste oefenprompt")]), note: Math.round(state.evaluation.score) + "/100 · " + content.policy.label, buttons: [V.button("Probeer deze ronde opnieuw", () => dispatch({ type: "retry" })), V.button("Verder", () => dispatch({ type: "next" }), { primary: true })] };
      if (state.screen === "workflow") {
        const preview = scenario.segments.filter((span) => !state.redacted.includes(span.id)).map((span) => span.text).join(" ") || "[Alle inhoud verwijderd]";
        return { body: V.layout("Kies een veilig proces", preview, [V.el("p", { className: "q-small" }, policyText()), V.choices(content.workflows, (id) => dispatch({ type: "workflow", id }), state.workflow, "workflow")]), note: content.policy.label, buttons: [V.button("Pas het weglakken aan", () => dispatch({ type: "screen", id: "redact" })), V.button("Controleer de veiligheid", () => dispatch({ type: "check" }), { primary: true, disabled: !state.workflow })] };
      }
      const spans = V.el("div", { className: "q-spans", role: "group", "aria-label": "Selecteer informatie om weg te lakken" }, scenario.segments.map((span) => V.button(span.text, () => dispatch({ type: "redact", id: span.id }), { className: "q-choice q-span", pressed: state.redacted.includes(span.id), key: "span-" + span.id })));
      return { body: V.layout(scenario.title, scenario.brief, [V.el("h4", {}, "Kies welke gegevens je verwijdert"), spans, V.el("p", { className: "q-policy" }, "Fictieve gegevens · Documentklasse: " + classLabel(scenario.classification))], "Het juiste hulpmiddel en de juiste toestemming zijn net zo belangrijk als weglakken."), note: content.policy.label, buttons: [V.button("Kies een proces", () => dispatch({ type: "screen", id: "workflow" }), { primary: true })] };
    },
  });
})(window.CDSCLearning);
