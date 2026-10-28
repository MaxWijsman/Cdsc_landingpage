const test = require("node:test");
const assert = require("node:assert/strict");
const { environment, memoryStorage } = require("./helpers/learning.cjs");

function play(controller, Q, id) {
  controller.openGame(id);
  controller.dispatch({ type: "start" });
  for (let round = 0; round < Q.games[id].count; round++) {
    const send = action => controller.dispatch(action);
    if (id === "inbox") { for (const slot of Q.content.slots) { send({ type: "slot", id: slot }); send({ type: "choose", id: slot + "-good" }); } send({ type: "generate" }); }
    if (id === "delegate") send({ type: "classify", id: Q.content.delegation[round].answer });
    if (id === "repair") { send({ type: "screen", id: "actions" }); for (const action of ["structure", "next", "audience"]) send({ type: "apply", id: action }); send({ type: "finish" }); }
    if (id === "hunter") { for (let index = 0; index < 3; index++) { send({ type: "claim", index }); send({ type: "evidence" }); send({ type: "classify", id: Q.content.hunter[round].claims[index].answer }); } send({ type: "check" }); }
    if (id === "data-danger") { for (const span of Q.content.danger[round].segments.filter(span => span.remove)) send({ type: "redact", id: span.id }); send({ type: "screen", id: "workflow" }); send({ type: "workflow", id: Q.content.danger[round].preferred }); send({ type: "check" }); }
    send({ type: "next" });
  }
}

test("star activation opens the shell immediately, lazy-loads once, and restores focus and scroll on close", async () => {
  const env = environment({ preload: false, reduced: true });
  env.run("launcher.js");
  env.trigger.click();
  assert.equal(env.dialog.open, true);
  assert.equal(env.document.body.style.overflow, "hidden");
  assert.equal(env.document.activeElement, env.ids.get("quest-title"));
  await env.flush();
  assert.match(env.ids.get("quest-body").textContent, /Inbox Inferno/);
  assert.equal(env.requestedScripts.length, 10);
  assert.equal(env.document.events[0].detail.open, true);
  env.ids.get("quest-close").click();
  assert.equal(env.dialog.open, false);
  assert.equal(env.document.activeElement, env.trigger);
  assert.equal(env.document.body.style.overflow, "auto");
  env.trigger.dispatchEvent({ type: "keydown", key: " " });
  await env.flush();
  assert.equal(env.dialog.open, true);
  assert.equal(env.requestedScripts.length, 10);
});

test("closing during lazy loading does not reopen the sheet, and failed scripts can be retried", async () => {
  let failing = true;
  const env = environment({ preload: false, reduced: true, failScript: name => failing && name === "content.js" });
  env.run("launcher.js"); env.trigger.click();
  env.ids.get("quest-close").click();
  await env.flush();
  assert.equal(env.dialog.open, false);
  env.trigger.click(); await env.flush();
  assert.match(env.ids.get("quest-body").textContent, /could not load/);
  failing = false;
  env.ids.get("quest-body").querySelector("button").click();
  await env.flush();
  assert.match(env.ids.get("quest-body").textContent, /Inbox Inferno/);
});

test("Escape and intentional backdrop clicks close; clicks inside the panel do not", async () => {
  const env = environment({ preload: false, reduced: true }); env.run("launcher.js");
  env.trigger.click(); await env.flush();
  env.dialog.dispatchEvent({ type: "pointerdown", target: env.dialog, clientX: 100, clientY: 650 });
  env.dialog.dispatchEvent({ type: "pointerup", target: env.dialog, clientX: 100, clientY: 650 });
  assert.equal(env.dialog.open, true);
  env.dialog.dispatchEvent({ type: "cancel" });
  assert.equal(env.dialog.open, false);
  env.trigger.click(); await env.flush();
  env.dialog.dispatchEvent({ type: "pointerdown", target: env.dialog, clientX: 100, clientY: 50 });
  env.dialog.dispatchEvent({ type: "pointerup", target: env.dialog, clientX: 100, clientY: 50 });
  assert.equal(env.dialog.open, false);
});

test("external mode binds no modal trigger and keyboard focus wraps inside the dialog", async () => {
  const external = environment({ preload: false, external: true }); external.run("launcher.js");
  external.trigger.click(); assert.equal(external.dialog.open, false);
  const env = environment({ preload: false, reduced: true }); env.run("launcher.js"); env.trigger.click(); await env.flush();
  const buttons = env.dialog.querySelectorAll('button:not([disabled]):not([hidden]), a[href], [tabindex="0"]').filter(node => !node.hidden);
  buttons.at(-1).focus();
  const event = { type: "keydown", key: "Tab", shiftKey: false };
  env.dialog.dispatchEvent(event);
  assert.equal(env.document.activeElement, buttons[0]);
  assert.equal(event.defaultPrevented, true);
});

test("Inbox vertical slice persists after an actual UI choice and resumes in a fresh page", () => {
  const storage = memoryStorage(), env = environment({ storage });
  env.Q.controller.init(); env.dialog.showModal(); env.Q.controller.onOpen();
  const card = env.ids.get("quest-body").querySelectorAll("button").find(button => button.textContent.includes("Inbox Inferno"));
  card.click(); env.ids.get("quest-footer").querySelectorAll("button").find(button => button.textContent === "Start challenge").click();
  const ingredient = env.ids.get("quest-body").querySelectorAll("button").find(button => button.textContent.includes("Decline the requested"));
  ingredient.click();
  env.ids.get("quest-footer").querySelectorAll("button").find(button => button.textContent === "Generate").click();
  assert.equal(env.Q.controller.getAttempt().phase, "feedback");
  assert.match(env.ids.get("quest-body").textContent, /Simulated AI/);
  env.Q.controller.save();
  const reopened = environment({ storage }); reopened.Q.controller.init(); reopened.dialog.showModal(); reopened.Q.controller.onOpen();
  assert.match(reopened.ids.get("quest-footer").textContent, /Resume Inbox Inferno/);
  reopened.Q.controller.openGame("inbox");
  assert.equal(reopened.Q.controller.getAttempt().choices.task, "task-good");
  assert.equal(reopened.Q.controller.getAttempt().phase, "feedback");
});

test("all games render, complete in any order, retain best scores on replay, and produce the final badge", () => {
  const env = environment(); env.Q.controller.init(); env.dialog.showModal(); env.Q.controller.onOpen();
  for (const id of ["hunter", "data-danger", "repair", "delegate", "inbox"]) {
    play(env.Q.controller, env.Q, id);
    assert.equal(env.Q.controller.getAttempt().phase, "completed");
    assert.equal(env.Q.controller.getProgress().games[id].bestScore, 100);
    assert.match(env.ids.get("quest-body").textContent, /Challenge complete/);
  }
  env.Q.controller.showSummary();
  assert.match(env.ids.get("quest-body").textContent, /500\/500/);
  assert.match(env.ids.get("quest-body").textContent, /AI Ready — Practice/);
  env.Q.controller.openGame("inbox", true);
  assert.equal(env.Q.controller.getAttempt().phase, "intro");
  assert.equal(env.Q.controller.getProgress().games.inbox.bestScore, 100);
});

test("reset confirmation keeps other local storage keys and cancellation preserves learning progress", () => {
  const storage = memoryStorage({ unrelated: "keep-me" }), env = environment({ storage });
  env.Q.controller.init(); env.dialog.showModal(); play(env.Q.controller, env.Q, "delegate"); env.Q.controller.showOverview();
  env.ids.get("quest-footer").querySelectorAll("button").find(button => button.textContent === "Reset progress").click();
  assert.match(env.ids.get("quest-body").textContent, /Reset all practice progress/);
  env.ids.get("quest-footer").querySelectorAll("button").find(button => button.textContent === "Keep progress").click();
  assert.equal(env.Q.controller.getProgress().games.delegate.completed, true);
  env.ids.get("quest-footer").querySelectorAll("button").find(button => button.textContent === "Reset progress").click();
  env.ids.get("quest-footer").querySelectorAll("button").find(button => button.textContent === "Reset all progress").click();
  assert.equal(Object.keys(env.Q.controller.getProgress().games).length, 0);
  assert.equal(storage.getItem("unrelated"), "keep-me");
});

test("scenario text is rendered as text, and private-mode storage failures do not block gameplay", () => {
  const storage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const env = environment({ storage });
  env.Q.content.inbox[0].brief = '<img src=x onerror="alert(1)">';
  env.Q.controller.init(); env.dialog.showModal(); env.Q.controller.openGame("inbox"); env.Q.controller.dispatch({ type: "start" });
  assert.match(env.ids.get("quest-body").textContent, /<img src=x/);
  assert.equal(env.ids.get("quest-body").querySelector("img"), null);
  assert.match(env.ids.get("quest-footer").textContent, /visit only/);
});
