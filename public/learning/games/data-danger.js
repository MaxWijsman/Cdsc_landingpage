((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ redacted: [], workflow: null, screen: "redact", evaluation: null });
  const policyText = () => content.workflows.filter((tool) => tool.id !== "decline").map((tool) => tool.label + ": " + ((content.policy.allowed[tool.id] || []).join(" + ") || "no information classes") + " only.").join(" ") + " All other information classes are prohibited.";
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
    if (correct < required.length) feedback.push("Find the remaining personal identifiers or credential. These details are not needed for the task.");
    if (falsePositives) feedback.push("Keep useful non-sensitive facts. Removing everything does not make a useful summary.");
    if (critical) {
      const exposed = [...new Set([scenario.classification, ...remaining.map((span) => span.dataClass)].filter((dataClass) => !permitted.includes(dataClass)))];
      feedback.push("Do not submit. This fictional tool prohibits the remaining information classes: " + exposed.join(", ") + ".");
    }
    else if (state.workflow === "decline" && scenario.preferred !== "decline") feedback.push("Not submitting is safe. The approved enterprise route would also help complete this task after minimization.");
    else feedback.push(scenario.classification === "restricted" ? "Correct: redaction does not remove the document's restriction. Use the approved non-AI process." : "The necessary internal facts can go to the fictional approved enterprise tool after personal details are removed.");
    return C.grade(minimization + workflowPoints, critical, feedback, remaining.map((span) => span.text).join(" ") || "[All document content removed]");
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
      if (state.phase === "feedback") return { body: V.el("div", { className: "q-layout" }, [V.feedback(state.evaluation), V.output(state.evaluation.output, "Revised training prompt")]), note: Math.round(state.evaluation.score) + "/100 · " + content.policy.label, buttons: [V.button("Retry round", () => dispatch({ type: "retry" })), V.button("Continue", () => dispatch({ type: "next" }), { primary: true })] };
      if (state.screen === "workflow") {
        const preview = scenario.segments.filter((span) => !state.redacted.includes(span.id)).map((span) => span.text).join(" ") || "[All content removed]";
        return { body: V.layout("Choose a safe workflow", preview, [V.el("p", { className: "q-small" }, policyText()), V.choices(content.workflows, (id) => dispatch({ type: "workflow", id }), state.workflow, "workflow")]), note: content.policy.label, buttons: [V.button("Edit redactions", () => dispatch({ type: "screen", id: "redact" })), V.button("Check safety", () => dispatch({ type: "check" }), { primary: true, disabled: !state.workflow })] };
      }
      const spans = V.el("div", { className: "q-spans", role: "group", "aria-label": "Select information to redact" }, scenario.segments.map((span) => V.button(span.text, () => dispatch({ type: "redact", id: span.id }), { className: "q-choice q-span", pressed: state.redacted.includes(span.id), key: "span-" + span.id })));
      return { body: V.layout(scenario.title, scenario.brief, [V.el("h4", {}, "Select details to remove"), spans, V.el("p", { className: "q-policy" }, "Fictional data · Document class: " + scenario.classification)], "The right tool and permissions matter as much as redaction."), note: content.policy.label, buttons: [V.button("Choose workflow", () => dispatch({ type: "screen", id: "workflow" }), { primary: true })] };
    },
  });
})(window.CDSCLearning);
