((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ category: null, evaluation: null });
  const evaluate = (state) => {
    const card = content.delegation[state.round];
    const correct = state.category === card.answer;
    return C.grade(correct ? 100 : 0, !correct && !!card.critical, [correct ? "Good delegation judgment. " + card.why : "A better route: " + content.categories.find((item) => item.id === card.answer).label + ". " + card.why]);
  };
  C.register({
    id: "delegate", revision: 1, count: 8,
    createAttempt: () => C.attempt("delegate", reset()), evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "classify" && state.phase === "active" && content.categories.some((item) => item.id === action.id)) {
        state.category = action.id; state.evaluation = evaluate(state); state.phase = "feedback";
      } else if (action.type === "next") return C.next(state, 8, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("delegate", raw, 8);
      if (!base) return null;
      const state = { ...base, ...reset(), category: content.categories.some((item) => item.id === raw.category) ? raw.category : null };
      if (state.phase === "feedback") { if (!state.category) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const card = content.delegation[state.round];
      if (state.phase === "feedback") return { body: V.layout("Where should this task go?", card.task, V.el("div", { className: "q-sort-feedback" }, [V.el("p", {}, "Your choice: " + content.categories.find((item) => item.id === state.category).label), V.feedback(state.evaluation)])), note: "Card " + (state.round + 1) + "/8 · No speed score.", buttons: [V.button("Next task", () => dispatch({ type: "next" }), { primary: true })] };
      return { body: V.layout("Your work queue", card.task, [V.el("p", {}, card.context), V.choices(content.categories, (id) => dispatch({ type: "classify", id }), undefined, "category")], "Choose help, human authority, or reviewed assistance."), note: "Card " + (state.round + 1) + "/8 · Take the time you need.", buttons: [] };
    },
  });
})(window.CDSCLearning);
