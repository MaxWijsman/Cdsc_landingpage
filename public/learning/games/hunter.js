((Q) => {
  "use strict";
  const C = Q.core, content = Q.content;
  const reset = () => ({ selected: 0, viewed: [], answers: {}, showEvidence: false, method: null, variantId: null, viewedVariants: [], screen: "prepare", evaluation: null });
  const ready = (state) => state.round === 0 ? content.methods.some((item) => item.id === state.method) : content.variants.every((item) => state.viewedVariants.includes(item.id));
  const evaluate = (state) => {
    const scenario = content.hunter[state.round];
    let points = 0;
    for (const claim of scenario.claims) {
      const answer = state.answers[claim.id];
      if (answer?.verdict === claim.answer) points += 8;
      if (answer?.evidence === true) points += 2;
    }
    const feedback = [state.round === 0 ? (state.method === "structured" ? "Je koos controleerbare tussenstappen: 20 methodepunten. Lengte op zichzelf levert geen punten op." : "De gekozen aanpak mist controleerbare tussenstappen: 0 methodepunten. Controleer bronwaarden en berekeningen.") : "Antwoorden A en B noemen een koppositie, maar de bron bevat geen sectorvergelijking. Een meerderheid is geen bewijs.", scenario.corrected];
    return C.grade(state.round === 0 ? (state.method === "structured" ? 20 : 0) + points / 30 * 80 : points / 30 * 100, false, feedback, scenario.corrected);
  };
  C.register({
    id: "hunter", revision: 2, count: 2, evaluate,
    createAttempt: () => C.attempt("hunter", reset()),
    reduce(old, action) {
      const state = C.clone(old);
      const scenario = content.hunter[state.round];
      if (action.type === "start" && state.phase === "intro") state.phase = "active";
      else if (action.type === "method" && state.round === 0 && state.phase === "active" && !Object.keys(state.answers).length && content.methods.some((item) => item.id === action.id)) { state.method = action.id; state.screen = "method"; }
      else if (action.type === "variant" && state.round === 1 && state.phase === "active" && content.variants.some((item) => item.id === action.id)) {
        state.variantId = action.id; if (!state.viewedVariants.includes(action.id)) state.viewedVariants.push(action.id);
      } else if (action.type === "screen" && state.phase === "active" && (action.id === "prepare" || action.id === "claims" && ready(state))) { state.screen = action.id; state.showEvidence = false; }
      else if (action.type === "claim" && state.phase === "active" && state.screen === "claims" && ready(state) && Number.isInteger(action.index) && action.index >= 0 && action.index < 3) { state.selected = action.index; state.showEvidence = false; }
      else if (action.type === "evidence" && state.phase === "active" && state.screen === "claims" && ready(state)) {
        state.showEvidence = !state.showEvidence;
        const id = scenario.claims[state.selected].id;
        if (!state.viewed.includes(id)) state.viewed.push(id);
      } else if (action.type === "classify" && state.phase === "active" && state.screen === "claims" && ready(state) && content.verdicts.some((item) => item.id === action.id)) {
        const claim = scenario.claims[state.selected];
        if (!state.answers[claim.id]) state.answers[claim.id] = { verdict: action.id, evidence: state.viewed.includes(claim.id) };
      } else if (action.type === "check" && state.phase === "active" && ready(state) && scenario.claims.every((claim) => state.answers[claim.id])) { state.evaluation = evaluate(state); state.phase = "feedback"; }
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
      state.method = content.methods.some((item) => item.id === raw.method) ? raw.method : null;
      const variantIds = content.variants.map((item) => item.id);
      state.viewedVariants = Array.isArray(raw.viewedVariants) ? [...new Set(raw.viewedVariants.filter((id) => variantIds.includes(id)))] : [];
      state.variantId = variantIds.includes(raw.variantId) ? raw.variantId : null;
      state.screen = ["prepare", "method", "claims"].includes(raw.screen) ? raw.screen : "prepare";
      state.showEvidence = raw.showEvidence === true;
      if (ready(state)) {
        for (const id of ids) if (content.verdicts.some((item) => item.id === raw.answers?.[id]?.verdict)) state.answers[id] = { verdict: raw.answers[id].verdict, evidence: raw.answers[id].evidence === true && state.viewed.includes(id) };
      } else state.screen = "prepare";
      if (state.phase === "feedback") { if (!ready(state) || Object.keys(state.answers).length !== 3) return null; state.evaluation = evaluate(state); }
      return state;
    },
    render(state, { view: V, dispatch }) {
      const scenario = content.hunter[state.round];
      if (state.phase === "feedback") return { body: V.layout("Een verslag dat klopt met de bronnen", "Alle cijfers, antwoorden en documenten zijn fictieve simulaties.", V.feedback(state.evaluation)), note: Math.round(state.evaluation.score) + "/100 · " + (state.round === 0 ? "Aanpak + classificatie + brongebruik." : "Overeenstemming blijft ondergeschikt aan broncontrole."), buttons: [V.button(state.round === 0 ? "Volgend verslag" : "Rond Feitenjacht af", () => dispatch({ type: "next" }), { primary: true })] };
      if (state.screen !== "claims") {
        if (state.round === 0) {
          const method = content.methods.find((item) => item.id === state.method);
          if (state.screen === "method" && method) return { body: V.layout("Bekijk de tussenresultaten", method.why, V.output(method.output), "Chain-of-thought prompting: stuur op controleerbare tussenstappen en een korte onderbouwing."), note: "Een simulatie, geen garantie op een juist antwoord.", buttons: [V.button("Andere aanpak", () => dispatch({ type: "screen", id: "prepare" })), V.button("Onderzoek de uitspraken", () => dispatch({ type: "screen", id: "claims" }), { primary: true })] };
          return { body: V.layout("Kies een controleerbare aanpak", scenario.evidence, V.choices(content.methods.map((item) => ({ ...item, disabled: Object.keys(state.answers).length > 0 })), (id) => dispatch({ type: "method", id }), state.method, "method"), "Chain-of-thought prompting: controleer tussenstappen, niet de lengte van de uitleg."), note: "De aanpak telt voor 20/100 punten.", buttons: [V.button("Naar de uitspraken", () => dispatch({ type: "screen", id: "claims" }), { primary: true, disabled: !ready(state) })] };
        }
        const variant = content.variants.find((item) => item.id === state.variantId);
        const tabs = V.el("div", { className: "q-tabs", role: "group", "aria-label": "Drie afzonderlijke gesimuleerde antwoorden" }, content.variants.map((item) => V.button((state.viewedVariants.includes(item.id) ? "✓ " : "") + item.label, () => dispatch({ type: "variant", id: item.id }), { className: "q-choice", pressed: state.variantId === item.id, key: "variant-" + item.id })));
        return { body: V.layout("Zelf-consistentie: vergelijk drie antwoorden", "Dezelfde opdracht aan AI: geef een korte projectupdate over kosten, mijlpalen en de positie in de sector.", [tabs, ...(variant ? [V.output(variant.output, "Gesimuleerde AI — " + variant.label)] : [V.el("p", {}, "Open alle drie de antwoorden. Waar komen ze overeen, en waar spreken ze elkaar tegen?")])], "Afzonderlijke antwoorden kunnen dezelfde fout maken. Vergelijk daarna met de bron."), note: state.viewedVariants.length + "/3 antwoorden bekeken.", buttons: [V.button("Onderzoek de uitspraken", () => dispatch({ type: "screen", id: "claims" }), { primary: true, disabled: !ready(state) })] };
      }
      const claim = scenario.claims[state.selected];
      const answer = state.answers[claim.id];
      const claimList = V.el("div", { className: "q-claims" }, scenario.claims.map((item, index) => V.button((state.answers[item.id] ? "✓ " : "") + item.text, () => dispatch({ type: "claim", index }), { className: "q-choice", pressed: state.selected === index, key: "claim-" + item.id })));
      const panel = [V.el("h4", {}, claim.text), V.button(state.showEvidence ? "Verberg de bron" : "Bekijk de bron", () => dispatch({ type: "evidence" }), { key: "evidence" })];
      if (state.showEvidence) panel.push(V.el("p", { className: "q-evidence" }, scenario.evidence));
      if (answer) panel.push(V.el("div", { className: "q-feedback" + (answer.verdict === claim.answer ? "" : " q-caution") }, V.el("p", {}, (answer.verdict === claim.answer ? "Goed. " : "Bekijk deze uitspraak nog eens. ") + claim.why)));
      else panel.push(V.choices(content.verdicts, (id) => dispatch({ type: "classify", id }), undefined, "verdict"));
      const nextIndex = scenario.claims.findIndex((item) => !state.answers[item.id]);
      return { body: V.el("div", { className: "q-layout" }, [V.el("div", {}, [V.el("h3", {}, scenario.title), V.el("p", { className: "q-small" }, "Gesimuleerde AI · Toets de uitspraak aan de bron."), claimList]), V.el("div", { className: "q-panel" }, panel)]), note: Object.keys(state.answers).length + "/3 uitspraken beoordeeld · Bekijk de bron vóór je keuze.", buttons: [V.button(state.round === 0 ? "Bekijk de aanpak" : "Vergelijk antwoorden", () => dispatch({ type: "screen", id: "prepare" })), ...(nextIndex === -1 ? [V.button("Bekijk het resultaat", () => dispatch({ type: "check" }), { primary: true })] : answer ? [V.button("Volgende uitspraak", () => dispatch({ type: "claim", index: nextIndex }), { primary: true })] : [])] };
    },
  });
})(window.CDSCLearning);
