((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ selected: 0, viewed: [], answers: {}, showEvidence: false, evaluation: null });
  const evaluate = (state) => {
    const scenario = content.hunter[state.round];
    let points = 0;
    for (const claim of scenario.claims) {
      const answer = state.answers[claim.id];
      if (answer?.verdict === claim.answer) points += 8;
      if (answer?.evidence === true) points += 2;
    }
    return C.grade(points / 30 * 100, false, ["Met bronnen zie je het verschil tussen een onjuiste uitspraak en een uitspraak die nog niet is gecontroleerd.", scenario.corrected], scenario.corrected);
  };
  C.register({
    id: "hunter", revision: 1, count: 2,
    createAttempt: () => C.attempt("hunter", reset()), evaluate,
    reduce(old, action) {
      const state = C.clone(old);
      const scenario = content.hunter[state.round];
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "claim" && state.phase === "active" && Number.isInteger(action.index) && action.index >= 0 && action.index < 3) { state.selected = action.index; state.showEvidence = false; }
      else if (action.type === "evidence" && state.phase === "active") {
        state.showEvidence = !state.showEvidence;
        const id = scenario.claims[state.selected].id;
        if (!state.viewed.includes(id)) state.viewed.push(id);
      } else if (action.type === "classify" && state.phase === "active" && content.verdicts.some((item) => item.id === action.id)) {
        const claim = scenario.claims[state.selected];
        if (!state.answers[claim.id]) state.answers[claim.id] = { verdict: action.id, evidence: state.viewed.includes(claim.id) };
      } else if (action.type === "check" && state.phase === "active" && scenario.claims.every((claim) => state.answers[claim.id])) { state.evaluation = evaluate(state); state.phase = "feedback"; }
      else if (action.type === "next") return C.next(state, 2, reset);
      return state;
    },
    hydrate(raw) {
      const base = C.hydrateBase("hunter", raw, 2);
      if (!base) return null;
      const state = { ...base, ...reset() };
      state.selected = Number.isInteger(raw.selected) && raw.selected >= 0 && raw.selected < 3 ? raw.selected : 0;
      const ids = content.hunter[state.round].claims.map((claim) => claim.id);
      state.viewed = Array.isArray(raw.viewed) ? [...new Set(raw.viewed.filter((id) => ids.includes(id)))] : [];
      for (const id of ids) if (content.verdicts.some((item) => item.id === raw.answers?.[id]?.verdict)) state.answers[id] = { verdict: raw.answers[id].verdict, evidence: raw.answers[id].evidence === true };
      if (state.phase === "feedback") { if (Object.keys(state.answers).length !== 3) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.hunter[state.round];
      if (state.phase === "feedback") return { body: V.layout("Een verslag dat klopt met de bronnen", "Alle cijfers en documenten in dit spel zijn fictief.", V.feedback(state.evaluation)), note: Math.round(state.evaluation.score) + "/100 · Juistheid + gebruik van bronnen.", buttons: [V.button("Volgend verslag", () => dispatch({ type: "next" }), { primary: true })] };
      const claim = scenario.claims[state.selected];
      const answer = state.answers[claim.id];
      const claimList = V.el("div", { className: "q-claims" }, scenario.claims.map((item, index) => V.button((state.answers[item.id] ? "✓ " : "") + item.text, () => dispatch({ type: "claim", index }), { className: "q-choice", pressed: state.selected === index, key: "claim-" + item.id })));
      const panel = [V.el("h4", {}, claim.text), V.button(state.showEvidence ? "Verberg de bron" : "Bekijk de bron", () => dispatch({ type: "evidence" }), { key: "evidence" })];
      if (state.showEvidence) panel.push(V.el("p", { className: "q-evidence" }, scenario.evidence));
      if (answer) panel.push(V.el("div", { className: "q-feedback" + (answer.verdict === claim.answer ? "" : " q-caution") }, [V.el("p", {}, (answer.verdict === claim.answer ? "Goed. " : "Bekijk deze uitspraak nog eens. ") + claim.why)]));
      else panel.push(V.choices(content.verdicts, (id) => dispatch({ type: "classify", id }), undefined, "verdict"));
      const nextIndex = scenario.claims.findIndex((item) => !state.answers[item.id]);
      return { body: V.el("div", { className: "q-layout" }, [V.el("div", {}, [V.el("h3", {}, scenario.title), V.el("p", { className: "q-small" }, "Gesimuleerde AI · Kies een uitspraak om te onderzoeken."), claimList]), V.el("div", { className: "q-panel" }, panel)]), note: Object.keys(state.answers).length + "/3 uitspraken beoordeeld · Bronpunten tellen mee als je de bron vóór je keuze bekijkt.", buttons: nextIndex === -1 ? [V.button("Bekijk het resultaat", () => dispatch({ type: "check" }), { primary: true })] : answer ? [V.button("Volgende uitspraak", () => dispatch({ type: "claim", index: nextIndex }), { primary: true })] : [] };
    },
  });
})(window.CDSCLearning);
