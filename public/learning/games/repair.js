((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ actions: [], screen: "draft", original: false, evaluation: null });
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
  const draft = (state) => {
    const scenario = content.repair[state.round];
    const flags = quality(state.actions);
    if (!state.actions.length) return scenario.original;
    const lines = [];
    if (flags.audience) lines.push("Management update");
    if (flags.next) lines.push((flags.structured ? "• Recommendation: " : "Recommended next step: ") + scenario.next);
    lines.push((flags.structured ? "• " : "") + scenario.facts);
    if (flags.risks) lines.push((flags.structured ? "• Risk: " : "Risk: ") + scenario.risk);
    if (!flags.concise) lines.push("There are numerous related considerations and discussions which may require further attention in a variety of ways.");
    if (!flags.accuracy) lines.push("An impressive 92% productivity increase is expected. [Not supported by the source]");
    return lines.join("\n");
  };
  const evaluate = (state) => {
    const flags = quality(state.actions);
    const weights = { accuracy: 25, concise: 15, structured: 15, risks: 15, audience: 15, next: 15 };
    const score = Object.entries(weights).reduce((sum, [key, value]) => sum + (flags[key] ? value : 0), 0);
    const missing = Object.keys(flags).filter((key) => !flags[key]);
    return C.grade(score, !flags.accuracy, missing.length ? ["Still improve: " + missing.join(", ") + ".", !flags.accuracy ? "Remove the unsupported statistic. Editing does not create evidence." : "Useful feedback changes the draft without inventing facts."] : ["Three specific instructions made the summary concise, factual and actionable."], draft(state));
  };
  C.register({
    id: "repair", revision: 1, count: 2, quality,
    createAttempt: () => C.attempt("repair", reset()), evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "screen" && state.phase === "active" && ["draft", "actions"].includes(action.id)) state.screen = action.id;
      else if (action.type === "original" && state.phase === "active") state.original = !state.original;
      else if (action.type === "apply" && state.phase === "active" && state.actions.length < 3 && !state.actions.includes(action.id) && content.repairActions.some((item) => item.id === action.id)) {
        state.actions.push(action.id); state.screen = "draft"; state.original = false;
      } else if (action.type === "finish" && state.phase === "active") { state.evaluation = evaluate(state); state.phase = "feedback"; }
      else if (action.type === "retry" && state.phase === "feedback") Object.assign(state, reset(), { phase: "active" });
      else if (action.type === "next") return C.next(state, 2, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("repair", raw, 2);
      if (!base || !Array.isArray(raw.actions) || raw.actions.length > 3 || new Set(raw.actions).size !== raw.actions.length || raw.actions.some((id) => !content.repairActions.some((item) => item.id === id))) return null;
      const state = { ...base, ...reset(), actions: raw.actions.slice(), screen: raw.screen === "actions" ? "actions" : "draft" };
      if (state.phase === "feedback") state.evaluation = evaluate(state);
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.repair[state.round];
      if (state.phase === "feedback") return { body: V.el("div", { className: "q-layout" }, [V.feedback(state.evaluation), V.output(state.evaluation.output)]), note: Math.round(state.evaluation.score) + "/100 · Three turns, specific feedback.", buttons: [V.button("Retry round", () => dispatch({ type: "retry" })), V.button("Keep repair", () => dispatch({ type: "next" }), { primary: true })] };
      if (state.screen === "actions") return { body: V.layout("Give specific feedback", scenario.goal, V.choices(content.repairActions.map((item) => ({ ...item, disabled: state.actions.includes(item.id) })), (id) => dispatch({ type: "apply", id }), undefined, "repair", 2), "Each feedback instruction uses one of three turns."), note: (3 - state.actions.length) + " moves left.", buttons: [V.button("Back to draft", () => dispatch({ type: "screen", id: "draft" }))] };
      const flags = quality(state.actions);
      const metrics = V.el("div", { className: "q-metrics" }, Object.entries(flags).map(([key, value]) => V.el("span", { className: "q-metric" + (value ? " is-good" : "") }, (value ? "✓ " : "○ ") + key)));
      const previousLines = draft({ ...state, actions: state.actions.slice(0, -1) }).split("\n");
      const passages = draft(state).split("\n").flatMap((line, index) => [index ? "\n" : "", state.actions.length && !previousLines.includes(line) ? V.el("mark", { className: "q-changed" }, line) : line]);
      const panel = [V.output(state.original ? scenario.original : passages), metrics];
      const last = state.actions.at(-1);
      return { body: V.layout(scenario.title, scenario.source, panel, last ? content.repairActions.find((item) => item.id === last).why : "The first response is a draft. Improve what matters."), note: (3 - state.actions.length) + " moves left · Source facts are your boundary.", buttons: [V.button(state.original ? "Current draft" : "Original", () => dispatch({ type: "original" })), V.button("Finish repair", () => dispatch({ type: "finish" }), { primary: state.actions.length === 3 }), ...(state.actions.length < 3 ? [V.button("Give feedback", () => dispatch({ type: "screen", id: "actions" }), { primary: true })] : [])] };
    },
  });
})(window.CDSCLearning);
