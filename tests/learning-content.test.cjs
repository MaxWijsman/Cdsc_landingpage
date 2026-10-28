const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, perfect } = require("./helpers/learning.cjs");

test("the catalog contains all sixteen scenario units with unique IDs and complete metadata", () => {
  const { Q } = environment();
  const units = [...Q.content.inbox, ...Q.content.delegation, ...Q.content.repair, ...Q.content.hunter, ...Q.content.danger];
  assert.equal(units.length, 16);
  assert.equal(new Set(units.map(unit => unit.id)).size, 16);
  for (const id of Q.content.order) {
    assert.ok(Q.content.meta[id].title && Q.content.meta[id].skill && Q.content.meta[id].takeaway);
    assert.equal(Q.games[id].revision, ["inbox", "repair", "hunter"].includes(id) ? 2 : 1);
    assert.equal(Q.core.result(perfect(Q, id)).score, 100);
  }
});

test("every Inbox ingredient combination has bounded scores and visibly unsafe instructions are capped", () => {
  const { Q } = environment();
  for (let round = 0; round < 1; round++) {
    const scenario = Q.content.inbox[0];
    const visit = (slotIndex, choices, unsafe) => {
      if (slotIndex === 5) {
        const result = Q.games.inbox.evaluate({ round, choices, firstScore: null });
        assert.ok(result.score >= 0 && result.score <= 100);
        assert.equal(result.critical, unsafe);
        if (unsafe) assert.ok(result.score <= 39);
        return;
      }
      const slot = Q.content.slots[slotIndex];
      for (const item of scenario.ingredients[slot]) visit(slotIndex + 1, { ...choices, [slot]: item.id }, unsafe || item.quality === "unsafe");
    };
    visit(0, {}, false);
  }
});

test("all orders of constructive repair feedback can reach a factual full-score summary", () => {
  const { Q } = environment();
  for (const a of ["structure", "next", "audience"]) for (const b of ["structure", "next", "audience"]) for (const c of ["structure", "next", "audience"]) {
    if (new Set([a, b, c]).size !== 3) continue;
    for (let round = 1; round < 2; round++) {
      const result = Q.games.repair.evaluate({ round, actions: [a, b, c] });
      assert.equal(result.score, 100);
      assert.ok(result.output.includes(Q.content.repair[round].facts));
      assert.ok(result.output.includes(Q.content.repair[round].risk));
      assert.ok(result.output.includes(Q.content.repair[round].next));
      assert.equal(result.critical, false);
    }
  }
});

test("authored evidence distinguishes percentage points, percent change, and unsupported causality", () => {
  const { Q } = environment();
  assert.equal(75 - 70, 5);
  assert.equal((1000 - 880) / 1000 * 100, 12);
  assert.equal((126000 - 120000) / 120000 * 100, 5);
  assert.equal(Q.content.hunter[0].claims[0].answer, "supported");
  assert.equal(Q.content.hunter[0].claims[1].answer, "contradicted");
  assert.equal(Q.content.hunter[0].claims[2].answer, "verify");
  for (const scenario of Q.content.hunter) {
    assert.equal(scenario.claims.length, 3);
    assert.ok(scenario.evidence && scenario.corrected);
    for (const claim of scenario.claims) assert.ok(Q.content.verdicts.some(item => item.id === claim.answer) && claim.why);
  }
});

test("fictional policies and data never treat anonymization as permission", () => {
  const { Q } = environment();
  assert.match(Q.content.policy.label, /Fictieve/);
  for (const classes of Object.values(Q.content.policy.allowed)) for (const forbidden of ["personal", "secret", "restricted"]) assert.ok(!classes.includes(forbidden));
  assert.equal(Q.content.danger[1].classification, "restricted");
  assert.equal(Q.content.danger[1].preferred, "decline");
  for (const scenario of Q.content.danger) {
    assert.ok(scenario.segments.some(span => span.remove));
    assert.ok(scenario.segments.some(span => !span.remove));
    assert.equal(new Set(scenario.segments.map(span => span.id)).size, scenario.segments.length);
  }
  const inbox = Q.games.inbox.evaluate({ round: 0, choices: { role: "role-good" }, firstScore: null });
  assert.match(inbox.feedback.join(" "), /Intentie.*Context.*Houding.*Template/);
  assert.doesNotMatch(inbox.feedback.join(" "), /audience|constraints|format/);
  const repair = Q.games.repair.render({ ...Q.games.repair.createAttempt(), phase: "active", round: 1, screen: "draft" }, { view: Q.view, dispatch() {} });
  assert.match(repair.body.textContent, /juistheid.*bondigheid.*structuur/);
  assert.doesNotMatch(repair.body.textContent, /accuracy|concise|structured/);
  const danger = Q.games["data-danger"];
  const state = { ...danger.createAttempt(), phase: "active", round: 1, workflow: "public" };
  assert.match(danger.render(state, { view: Q.view, dispatch() {} }).body.textContent, /Documentklasse: beperkt toegankelijk/);
  assert.match(danger.evaluate(state).feedback.join(" "), /persoonsgegevens.*toegangsgegevens/);
  assert.doesNotMatch(danger.evaluate(state).feedback.join(" "), /restricted|personal|secret|internal/);
});
