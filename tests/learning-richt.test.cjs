const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, memoryStorage, perfect, roundActions } = require("./helpers/learning.cjs");

const active = game => game.reduce(game.createAttempt(), { type: "start" });
const second = game => ({ ...active(game), round: 1, results: [{ score: 100, critical: false }] });
const sendAll = (game, state, actions) => actions.reduce((value, action) => game.reduce(value, action), state);
const button = (env, container, label) => env.ids.get(container).querySelectorAll("button").find(node => node.textContent === label);

test("RICHT has exactly five parts, with tone-only Houding and the agreed weights", () => {
  const { Q } = environment(), game = Q.games.inbox;
  assert.deepEqual(Array.from(Q.content.richt, item => item.label), ["Rol", "Intentie", "Context", "Houding", "Template"]);
  assert.match(Q.content.richt.find(item => item.id === "attitude").definition, /toon en stijl/);
  assert.match(Q.content.richt.find(item => item.id === "context").definition, /feiten, doelgroep en grenzen/);
  for (const [slot, score] of Object.entries({ role: 15, intent: 25, context: 30, attitude: 15, template: 15 })) {
    const state = { ...active(game), choices: { [slot]: slot + "-good" } };
    assert.equal(game.evaluate(state).score, score);
  }
  const baseline = Object.fromEntries(Q.content.slots.map(slot => [slot, slot + "-good"]));
  for (const slot of Q.content.slots) {
    const outputs = Q.content.inbox[0].ingredients[slot].map(item => game.evaluate({ ...active(game), choices: { ...baseline, [slot]: item.id } }).output);
    assert.equal(new Set(outputs).size, 3, slot + " must visibly change the authored output");
  }
  assert.match(game.evaluate(active(game)).feedback.join(" "), /Bij Context ontbreekt dat je geen korting mag toezeggen/);
});

test("few-shot examples score relevance, cap unsafe promises, and never copy unrelated facts", () => {
  const { Q } = environment(), game = Q.games.inbox;
  const examples = Q.content.inbox[1].examples;
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    const state = { ...second(game), examples: [examples[a].id, examples[b].id] };
    const evaluation = game.evaluate(state);
    const unsafe = [examples[a], examples[b]].some(item => item.quality === "unsafe");
    assert.equal(evaluation.critical, unsafe);
    assert.equal(evaluation.score, unsafe ? Math.min(39, [examples[a], examples[b]].filter(item => item.quality === "good").length * 50) : [examples[a], examples[b]].filter(item => item.quality === "good").length * 50);
  }
  const best = game.evaluate({ ...second(game), examples: ["confirmed", "uncertain"] });
  assert.equal(best.score, 100);
  assert.match(best.output, /nog geen bevestigde opleverdatum/);
  assert.doesNotMatch(best.output, /maandag|zaal 4|vrijdag|storing/);
  assert.match(game.prompt({ ...second(game), examples: ["confirmed"] }), /Voorbeeld — invoer:/);
});

test("few-shot selection is bounded and can be refined without duplicate rewards", () => {
  const { Q } = environment(), game = Q.games.inbox;
  let state = second(game);
  assert.equal(game.reduce(state, { type: "generate" }).phase, "active");
  state = sendAll(game, state, ["confirmed", "advert", "uncertain", "missing"].map(id => ({ type: "toggle-example", id })));
  assert.deepEqual(Array.from(state.examples), ["confirmed", "advert"]);
  state = game.reduce(state, { type: "generate" });
  assert.equal(state.evaluation.score, 50);
  const generation = state.generations;
  assert.equal(game.reduce(state, { type: "generate" }).generations, generation);
  state = sendAll(game, state, [{ type: "retry" }, { type: "toggle-example", id: "advert" }, { type: "toggle-example", id: "uncertain" }, { type: "generate" }]);
  assert.equal(state.evaluation.score, 100);
  assert.equal(state.firstScore, 50);
  assert.equal(state.results.length, 1);
  assert.equal(game.hydrate(JSON.parse(JSON.stringify(state))).evaluation.score, 100);
});

test("meta-prompting asks two questions and guards incomplete or unknown answers", () => {
  const { Q } = environment(), game = Q.games.repair;
  let state = active(game);
  assert.equal(game.reduce(state, { type: "finish" }).phase, "active");
  state = game.reduce(state, { type: "meta-choice", id: "richt" });
  assert.match(game.render(state, { view: Q.view, dispatch() {} }).body.textContent, /Voor wie is de statusupdate/);
  state = game.reduce(state, { type: "clarify", question: "audience", id: "management" });
  assert.equal(game.reduce(state, { type: "finish" }).phase, "active");
  assert.match(game.render(state, { view: Q.view, dispatch() {} }).body.textContent, /Welke antwoordvorm/);
  state = game.reduce(state, { type: "clarify", question: "template", id: "unknown" });
  assert.equal(state.clarifications.template, undefined);
  state = game.reduce(state, { type: "clarify", question: "template", id: "bullets" });
  state = game.reduce(state, { type: "finish" });
  assert.equal(state.evaluation.score, 100);
  for (const label of ["Rol:", "Intentie:", "Context:", "Houding:", "Template:"]) assert.ok(game.prompt(state).includes(label));
  assert.doesNotMatch(game.prompt(state), /vrijdag|92%/);
  assert.ok(state.evaluation.output.includes(Q.content.repair[0].facts));
  assert.ok(state.evaluation.output.includes(Q.content.repair[0].risk));
});

test("meta-prompting rewards clarification rather than length and permits a safe retry", () => {
  const { Q } = environment(), game = Q.games.repair;
  const long = game.reduce(active(game), { type: "meta-choice", id: "longer" });
  assert.equal(game.evaluate(long).score, 0);
  let unsafe = sendAll(game, active(game), [{ type: "meta-choice", id: "invent" }, { type: "finish" }]);
  assert.equal(unsafe.evaluation.critical, true);
  assert.ok(unsafe.evaluation.score <= 39);
  unsafe = sendAll(game, unsafe, [{ type: "retry" }, ...roundActions(Q, "repair", 0)]);
  assert.equal(unsafe.evaluation.score, 100);
  assert.equal(unsafe.evaluation.critical, false);
  const wrongAudience = game.evaluate({ ...unsafe, clarifications: { audience: "team", template: "bullets" } });
  assert.equal(wrongAudience.score, 70);
});

test("Chain-of-thought practice scores checkable steps, with correct percentage arithmetic", () => {
  const { Q } = environment(), game = Q.games.hunter;
  const structured = sendAll(game, active(game), roundActions(Q, "hunter", 0));
  assert.equal(structured.evaluation.score, 100);
  const verbose = game.evaluate({ ...structured, method: "verbose" });
  assert.equal(verbose.score, 80);
  assert.match(Q.content.methods[0].output, /75 − 70 = 5 procentpunt/);
  assert.match(Q.content.methods[0].output, /\(1.000 − 880\) \/ 1.000 = 12%/);
  assert.match(Q.content.methods[0].output, /oorzaak is niet onderzocht/);
  const locked = game.reduce(structured, { type: "method", id: "guess" });
  assert.equal(locked.method, "structured");
});

test("self-consistency requires all three variants and does not reward a false majority", () => {
  const { Q } = environment(), game = Q.games.hunter;
  let state = second(game);
  state = game.reduce(state, { type: "variant", id: "a" });
  state = game.reduce(state, { type: "variant", id: "a" });
  assert.equal(state.viewedVariants.length, 1);
  assert.equal(game.reduce(state, { type: "screen", id: "claims" }).screen, "prepare");
  assert.equal(Object.keys(game.reduce(state, { type: "classify", id: "supported" }).answers).length, 0);
  state = sendAll(game, state, roundActions(Q, "hunter", 1));
  assert.equal(state.evaluation.score, 100);
  const falseMajority = game.evaluate({ ...state, answers: { ...state.answers, ranking: { verdict: "supported", evidence: true } } });
  assert.ok(falseMajority.score < 100);
  assert.match(falseMajority.feedback[0], /Een meerderheid is geen bewijs/);
  const forged = game.hydrate({ ...second(game), screen: "claims", answers: { budget: { verdict: "contradicted", evidence: true } }, viewedVariants: ["a", "unknown"] });
  assert.equal(forged.screen, "prepare");
  assert.equal(Object.keys(forged.answers).length, 0);
});

test("new checkpoint fields survive storage and invalid choice IDs are discarded", () => {
  const { Q } = environment(), storage = memoryStorage(), adapter = Q.progress.create(storage), progress = adapter.load();
  const inbox = sendAll(Q.games.inbox, second(Q.games.inbox), [{ type: "example", id: "confirmed" }, { type: "toggle-example", id: "confirmed" }]);
  const repair = sendAll(Q.games.repair, active(Q.games.repair), [{ type: "meta-choice", id: "richt" }, { type: "clarify", question: "audience", id: "management" }]);
  const hunter = Q.games.hunter.reduce(second(Q.games.hunter), { type: "variant", id: "b" });
  for (const [id, state] of [["inbox", inbox], ["repair", repair], ["hunter", hunter]]) Q.core.record(progress, id, state, true);
  adapter.save(progress);
  const restored = Q.progress.create(storage).load();
  assert.deepEqual(Array.from(restored.games.inbox.checkpoint.examples), ["confirmed"]);
  assert.equal(restored.games.repair.checkpoint.clarifications.audience, "management");
  assert.deepEqual(Array.from(restored.games.hunter.checkpoint.viewedVariants), ["b"]);
  assert.equal(Q.games.repair.hydrate({ ...repair, clarifications: { audience: "unknown" } }).clarifications.audience, undefined);
  assert.deepEqual(Array.from(Q.games.inbox.hydrate({ ...inbox, examples: ["missing", "confirmed", "confirmed"] }).examples), ["confirmed"]);
});

test("revision upgrade preserves the two compatible games and remembers notice dismissal", () => {
  const seed = environment(), raw = seed.Q.core.initialProgress();
  for (const id of seed.Q.content.order) {
    seed.Q.core.record(raw, id, perfect(seed.Q, id), true);
    raw.games[id].revision = 1;
    raw.games[id].checkpoint.revision = 1;
  }
  raw.contentVersion = 1;
  const storage = memoryStorage({ [seed.Q.progress.key]: JSON.stringify(raw) });
  const env = environment({ storage }); env.Q.controller.init(); env.dialog.showModal(); env.Q.controller.onOpen();
  const progress = env.Q.controller.getProgress();
  assert.deepEqual(Object.keys(progress.games).sort(), ["data-danger", "delegate"]);
  assert.equal(env.Q.core.summary(progress).percent, 40);
  assert.equal(progress.games.delegate.bestScore, 100);
  assert.equal(progress.games["data-danger"].bestScore, 100);
  assert.match(env.ids.get("quest-body").textContent, /Vernieuwd met RICHT/);
  button(env, "quest-body", "Begrepen").click();
  const reopened = environment({ storage }); reopened.Q.controller.init(); reopened.dialog.showModal(); reopened.Q.controller.onOpen();
  assert.doesNotMatch(reopened.ids.get("quest-body").textContent, /Vernieuwd met RICHT/);
  assert.equal(reopened.Q.controller.getProgress().revisionNotice.length, 0);
});

test("the shared cheat sheet returns to every game without altering its attempt", () => {
  const env = environment(); env.Q.controller.init(); env.dialog.showModal();
  for (const id of env.Q.content.order) {
    env.Q.controller.openGame(id); env.Q.controller.dispatch({ type: "start" });
    const before = JSON.stringify(env.Q.controller.getAttempt());
    env.ids.get("quest-help").click();
    assert.match(env.ids.get("quest-body").textContent, /RICHT-spiekkaart/);
    button(env, "quest-body", "Promptingtechnieken").click();
    for (const topic of ["Meta-prompting", "Chain-of-thought prompting", "Few-shot voorbeelden", "Zelf-consistentie"]) assert.ok(env.ids.get("quest-body").textContent.includes(topic));
    button(env, "quest-footer", "Terug naar het spel").click();
    assert.equal(JSON.stringify(env.Q.controller.getAttempt()), before);
  }
  env.Q.controller.showSummary(); button(env, "quest-footer", "RICHT-spiekkaart").click();
  button(env, "quest-footer", "Terug naar het leeroverzicht").click();
  assert.match(env.ids.get("quest-body").textContent, /\/500/);
  assert.equal(env.document.body.querySelectorAll("dialog").length, 1);
});

test("closing from the cheat sheet preserves a partially answered meta-prompt", () => {
  const storage = memoryStorage(), env = environment({ storage }); env.Q.controller.init(); env.dialog.showModal();
  env.Q.controller.openGame("repair");
  for (const action of [{ type: "start" }, { type: "meta-choice", id: "richt" }, { type: "clarify", question: "audience", id: "management" }]) env.Q.controller.dispatch(action);
  env.Q.controller.showHelp(); env.Q.controller.save();
  const restored = environment({ storage }); restored.Q.controller.init(); restored.dialog.showModal(); restored.Q.controller.openGame("repair");
  assert.equal(restored.Q.controller.getAttempt().clarifications.audience, "management");
  assert.match(restored.ids.get("quest-body").textContent, /Welke antwoordvorm/);
});

test("switching prompt and output does not reannounce results or award points", () => {
  const env = environment(); env.Q.controller.init(); env.dialog.showModal(); env.Q.controller.openGame("inbox");
  env.Q.controller.dispatch({ type: "start" });
  for (const action of roundActions(env.Q, "inbox", 0)) env.Q.controller.dispatch(action);
  env.ids.get("quest-announcement").textContent = "already announced";
  const score = env.Q.controller.getAttempt().evaluation.score;
  env.Q.controller.dispatch({ type: "screen", id: "prompt" });
  assert.equal(env.ids.get("quest-announcement").textContent, "already announced");
  assert.equal(env.Q.controller.getAttempt().evaluation.score, score);
  assert.equal(env.Q.controller.getAttempt().results.length, 0);
});
