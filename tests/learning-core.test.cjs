const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, memoryStorage, perfect } = require("./helpers/learning.cjs");

for (const id of ["inbox", "delegate", "repair", "hunter", "data-danger"]) {
  test(id + " can complete with 100 points, three stars, and a valid checkpoint", () => {
    const { Q } = environment();
    const state = perfect(Q, id);
    assert.equal(state.phase, "completed");
    assert.equal(state.results.length, Q.games[id].count);
    assert.equal(Q.core.result(state).score, 100);
    assert.equal(Q.core.result(state).stars, 3);
    assert.ok(Q.games[id].hydrate(JSON.parse(JSON.stringify(state))));
    assert.equal(JSON.stringify(Q.games[id].reduce(state, { type: "next" })), JSON.stringify(state));
  });
}

test("star thresholds reflect competence and unresolved safety issues cap the whole attempt", () => {
  const { Q } = environment();
  for (const [score, stars] of [[0, 0], [39, 0], [40, 1], [69, 1], [70, 2], [89, 2], [90, 3], [100, 3]]) assert.equal(Q.core.stars(score), stars);
  const result = Q.core.result({ results: [{ score: 100, critical: false }, { score: 39, critical: true }] });
  assert.equal(result.score, 39);
  assert.equal(result.stars, 0);
});

test("Inbox blocks empty and duplicate generation; refinement does not commit extra rounds", () => {
  const { Q } = environment(), game = Q.games.inbox;
  let state = game.reduce(game.createAttempt(), { type: "start" });
  assert.equal(game.reduce(state, { type: "generate" }).phase, "active");
  state = game.reduce(state, { type: "choose", id: "task-unsafe" });
  state = game.reduce(state, { type: "generate" });
  assert.equal(state.evaluation.critical, true);
  assert.ok(state.evaluation.score <= 39);
  const once = JSON.stringify(state);
  assert.equal(JSON.stringify(game.reduce(state, { type: "generate" })), once);
  state = game.reduce(state, { type: "retry" });
  for (const slot of Q.content.slots) { state = game.reduce(state, { type: "slot", id: slot }); state = game.reduce(state, { type: "choose", id: slot + "-good" }); }
  state = game.reduce(state, { type: "generate" });
  assert.equal(state.evaluation.score, 100);
  assert.ok(state.firstScore < state.evaluation.score);
  assert.equal(state.results.length, 0);
  state = game.reduce(state, { type: "next" });
  assert.equal(state.round, 1);
  assert.equal(state.results.length, 1);
  assert.equal(game.reduce(state, { type: "next" }).results.length, 1);
});

test("delegation feedback preserves final human authority", () => {
  const { Q } = environment(), game = Q.games.delegate;
  const state = { ...game.createAttempt(), phase: "active", round: 3, results: Array.from({ length: 3 }, () => ({ score: 100, critical: false })) };
  const result = game.reduce(state, { type: "classify", id: "review" });
  assert.equal(result.evaluation.critical, true);
  assert.match(result.evaluation.feedback[0], /human/i);
});

test("repair feedback is stateful, bounded to three unique turns, and can remove unsupported claims", () => {
  const { Q } = environment(), game = Q.games.repair;
  let state = game.reduce(game.createAttempt(), { type: "start" });
  state = game.reduce(state, { type: "apply", id: "stats" });
  assert.equal(game.evaluate(state).critical, true);
  state = game.reduce(state, { type: "apply", id: "structure" });
  assert.equal(game.evaluate(state).critical, false);
  state = game.reduce(state, { type: "apply", id: "structure" });
  assert.equal(state.actions.length, 2);
  state = game.reduce(state, { type: "apply", id: "audience" });
  assert.equal(game.reduce(state, { type: "apply", id: "next" }).actions.length, 3);
  const cut = game.quality(["next", "audience", "cut"]);
  assert.equal(cut.risks, false);
  assert.equal(cut.next, false);
});

test("claim evidence credit is locked at classification and unsupported is not contradicted", () => {
  const { Q } = environment(), game = Q.games.hunter;
  let state = game.reduce(game.createAttempt(), { type: "start" });
  state = game.reduce(state, { type: "claim", index: 2 });
  state = game.reduce(state, { type: "classify", id: "contradicted" });
  assert.equal(state.answers.cause.evidence, false);
  state = game.reduce(state, { type: "evidence" });
  state = game.reduce(state, { type: "classify", id: "verify" });
  assert.equal(state.answers.cause.verdict, "contradicted");
  assert.equal(state.answers.cause.evidence, false);
  assert.equal(game.reduce(state, { type: "check" }).phase, "active");
});

test("data rules reject residual personal data and restricted documents after redaction", () => {
  const { Q } = environment(), game = Q.games["data-danger"];
  let state = game.reduce(game.createAttempt(), { type: "start" });
  state = game.reduce(state, { type: "workflow", id: "enterprise" });
  state = game.reduce(state, { type: "check" });
  assert.equal(state.evaluation.critical, true);
  state = { ...game.createAttempt(), phase: "active", round: 1, results: [{ score: 100, critical: false }], redacted: ["owner", "credential"] };
  state = game.reduce(state, { type: "workflow", id: "public" });
  assert.equal(game.evaluate(state).critical, true);
  state = game.reduce(state, { type: "workflow", id: "decline" });
  assert.equal(game.evaluate(state).score, 100);
  assert.equal(game.evaluate(state).critical, false);
});

test("data minimization does not reward removing every useful fact; safe refusal receives partial credit", () => {
  const { Q } = environment(), game = Q.games["data-danger"];
  const safe = { ...game.createAttempt(), phase: "active", redacted: ["name", "phone", "email", "account"], workflow: "enterprise" };
  assert.equal(game.evaluate(safe).score, 100);
  assert.ok(game.evaluate({ ...safe, redacted: [...safe.redacted, "issue", "request"] }).score < 100);
  assert.equal(game.evaluate({ ...safe, workflow: "decline" }).score, 85);
  Q.content.policy.allowed.enterprise = ["public"];
  assert.equal(game.evaluate(safe).critical, true);
  const view = game.render({ ...safe, screen: "workflow" }, { view: Q.view, dispatch() {} });
  assert.match(view.body.textContent, /Training Enterprise Assistant: public only/);
  assert.doesNotMatch(view.body.textContent, /public \+ internal/);
});

test("best scores survive replay and any play order yields a 500-point track", () => {
  const { Q } = environment();
  const progress = Q.core.initialProgress();
  for (const id of [...Q.content.order].reverse()) Q.core.record(progress, id, perfect(Q, id), true);
  const summary = Q.core.summary(progress);
  assert.equal(summary.completed, 5); assert.equal(summary.percent, 100); assert.equal(summary.score, 500); assert.equal(summary.stars, 15); assert.equal(summary.badge, true);
  Q.core.record(progress, "inbox", Q.games.inbox.createAttempt(), true);
  assert.equal(progress.games.inbox.bestScore, 100);
  assert.equal(progress.games.inbox.completed, true);
});

test("partial choices survive browser storage and changed revisions invalidate only the affected game", () => {
  const { Q } = environment(), storage = memoryStorage(), adapter = Q.progress.create(storage);
  const progress = adapter.load();
  let state = Q.games.inbox.reduce(Q.games.inbox.createAttempt(), { type: "start" });
  state = Q.games.inbox.reduce(state, { type: "choose", id: "task-good" });
  Q.core.record(progress, "inbox", state, true);
  Q.core.record(progress, "delegate", perfect(Q, "delegate"), true);
  adapter.save(progress);
  const loaded = Q.progress.create(storage).load();
  assert.equal(loaded.games.inbox.checkpoint.choices.task, "task-good");
  Q.games.inbox.revision = 2;
  const revised = Q.progress.create(storage).load();
  assert.equal(revised.games.inbox, undefined);
  assert.equal(revised.games.delegate.bestScore, 100);
  const newAttempt = Q.games.inbox.createAttempt();
  assert.equal(newAttempt.revision, 2);
  Q.core.record(revised, "inbox", newAttempt, true);
  adapter.save(revised);
  assert.equal(Q.progress.create(storage).load().games.inbox.checkpoint.revision, 2);
});

test("malformed or unsupported storage is preserved until explicit reset; quota failures use memory", () => {
  const { Q } = environment();
  for (const raw of ["{broken", JSON.stringify({ schemaVersion: 999 }), "x".repeat(100001)]) {
    const storage = memoryStorage({ [Q.progress.key]: raw });
    const adapter = Q.progress.create(storage);
    const progress = adapter.load(); adapter.save(progress);
    assert.equal(adapter.temporary(), true);
    assert.equal(storage.getItem(Q.progress.key), raw);
    adapter.reset();
    assert.notEqual(storage.getItem(Q.progress.key), raw);
  }
  const adapter = Q.progress.create({ getItem: () => null, setItem() { throw new Error("quota"); }, removeItem() {} });
  const progress = adapter.load(); Q.core.record(progress, "repair", perfect(Q, "repair")); adapter.save(progress);
  assert.equal(adapter.temporary(), true);
  assert.equal(adapter.load().games.repair.bestScore, 100);
});

test("invalid checkpoint cursors, duplicate repair actions, and stale ingredient IDs are handled", () => {
  const { Q } = environment();
  assert.equal(Q.games.inbox.hydrate({ ...Q.games.inbox.createAttempt(), round: 99 }), null);
  assert.equal(Q.games.repair.hydrate({ ...Q.games.repair.createAttempt(), actions: ["next", "next"] }), null);
  const sanitized = Q.games.inbox.hydrate({ ...Q.games.inbox.createAttempt(), choices: { task: "not-an-option", context: "context-good" } });
  assert.equal(sanitized.choices.task, undefined);
  assert.equal(sanitized.choices.context, "context-good");
  assert.throws(() => Q.core.register({ id: "broken" }), /Invalid/);
});
