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
    const feedback = critical ? ["The draft makes an unauthorized promise or invents a policy. Replace that instruction before using it."] : [];
    if (missing.length) feedback.push("Strengthen: " + missing.join(", ") + ". Clear, relevant instructions matter more than extra words.");
    if (good("constraints")) feedback.push("Your constraints prevent unsupported commitments.");
    if (!missing.length) feedback.push("The prompt states a clear task, audience, context, tone, limits and usable format.");
    const lines = [];
    if (good("format")) lines.push("Subject: " + scenario.subject, "");
    lines.push(good("audience") ? scenario.greeting : "Hello,", "");
    if (chosen.tone?.id === "tone-weak") lines.push("Your request is not acceptable.");
    lines.push(chosen.task?.quality === "unsafe" ? scenario.unsafe : good("task") ? scenario.goodBody : "Thank you for your message. We will consider your request.");
    if (chosen.constraints?.quality === "unsafe") lines.push(scenario.invented);
    if (good("context")) lines.push(scenario.positive);
    if (!good("constraints") && !critical) lines.push("Please confirm which commitments are authorized before sending this draft.");
    if (!good("format")) lines.push("There are a number of additional considerations and possible further discussions that could be explored in more detail.");
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
        body: V.el("div", { className: "q-layout" }, [V.el("div", {}, [V.el("h3", {}, "See what changed"), V.feedback(state.evaluation)]), V.output(state.evaluation.output)]),
        note: "First: " + Math.round(state.firstScore) + " · Current: " + Math.round(state.evaluation.score) + "/100",
        buttons: [V.button("Refine prompt", () => dispatch({ type: "retry" })), V.button("Keep this draft", () => dispatch({ type: "next" }), { primary: true })],
      };
      const tabs = V.el("div", { className: "q-tabs", role: "group", "aria-label": "Prompt ingredients" }, content.slots.map((slot) => V.button((state.choices[slot] ? "✓ " : "") + slot.charAt(0).toUpperCase() + slot.slice(1), () => dispatch({ type: "slot", id: slot }), { className: "q-choice", key: "slot-" + slot, pressed: state.slot === slot })));
      const panel = [tabs, V.el("h4", {}, "Choose your " + state.slot), V.choices(scenario.ingredients[state.slot], (id) => dispatch({ type: "choose", id }), state.choices[state.slot], "ingredient")];
      return { body: V.layout(scenario.title, scenario.brief, panel, "Build a prompt, test it, then improve it."), note: Object.keys(state.choices).length + "/6 ingredients · Generate at any point.", buttons: [V.button("Generate", () => dispatch({ type: "generate" }), { primary: true, disabled: !Object.keys(state.choices).length })] };
    },
  };
  C.register(game);
})(window.CDSCLearning);
