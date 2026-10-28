const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const modules = ["core.js", "content.js", "progress.js", "view.js", "games/inbox.js", "games/delegate.js", "games/repair.js", "games/hunter.js", "games/data-danger.js", "controller.js"];

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

function environment({ preload = true, storage = memoryStorage(), reduced = false, external = false, failScript = null } = {}) {
  let document;
  class Element {
    constructor(tag, text = "") { this.tagName = tag.toUpperCase(); this.localName = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.dataset = {}; this.style = {}; this._text = text; this.hidden = false; this.disabled = false; this.open = false; this.rect = { left: 0, top: 600, right: 1440, bottom: 900 }; }
    get className() { return this.attributes.class || ""; }
    set className(value) { this.attributes.class = value; }
    get classList() { return { contains: name => this.className.split(" ").includes(name), add: name => { this.className = [...new Set([...this.className.split(" ").filter(Boolean), name])].join(" "); }, remove: name => { this.className = this.className.split(" ").filter(item => item !== name).join(" "); }, toggle: (name, enabled) => { const has = this.className.split(" ").includes(name); const add = enabled === undefined ? !has : enabled; if (add) this.classList.add(name); else this.classList.remove(name); } }; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(""); }
    set textContent(value) { this._text = String(value); this.children = []; }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === "data-q-focus") this.dataset.qFocus = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    append(...nodes) { for (const node of nodes) { if (node.parentNode) node.remove(); node.parentNode = this; this.children.push(node); this.onAppend?.(node); } }
    replaceChildren(...nodes) { this.children = []; this._text = ""; this.append(...nodes); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
    get firstChild() { return this.children[0]; }
    matches(selector) {
      if (selector.startsWith(".")) return this.className.split(" ").includes(selector.slice(1));
      if (selector.startsWith("#")) return this.getAttribute("id") === selector.slice(1);
      if (selector.startsWith("[")) { const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/); return match && this.getAttribute(match[1]) !== null && (match[2] === undefined || this.getAttribute(match[1]) === match[2]); }
      if (selector.startsWith("button:")) return this.tagName === "BUTTON" && !this.disabled && !this.hidden;
      if (selector === "a[href]") return this.tagName === "A" && this.getAttribute("href") !== null;
      return this.tagName === selector.toUpperCase();
    }
    querySelectorAll(selector) { const choices = selector.split(",").map(item => item.trim()); return this.children.flatMap(child => [...(choices.some(choice => child.matches(choice)) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatchEvent(event) { event.target ||= this; event.preventDefault ||= () => { event.defaultPrevented = true; }; for (const fn of this.listeners[event.type] || []) fn(event); return !event.defaultPrevented; }
    click() { if (!this.disabled) this.dispatchEvent({ type: "click" }); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { if (this.open) { this.open = false; this.dispatchEvent({ type: "close" }); } }
    getClientRects() { return this.hidden ? [] : [this.rect]; }
    getBoundingClientRect() { return this.rect; }
  }
  const body = new Element("body"), head = new Element("head");
  body.style.overflow = "auto";
  const ids = new Map();
  const node = (id, tag = "div") => { const value = new Element(tag); value.setAttribute("id", id); ids.set(id, value); return value; };
  const trigger = node("learning-link", "a");
  body.append(trigger);
  const dialog = node("ai-learning-dialog", "dialog");
  body.append(dialog);
  const header = new Element("header");
  dialog.append(header);
  header.append(node("quest-home", "button"), node("quest-title", "h2"), node("quest-subtitle", "span"), node("quest-score", "span"), node("quest-help", "button"), node("quest-close", "button"));
  dialog.append(node("quest-body", "section"), node("quest-footer", "footer"), node("quest-announcement"));
  document = {
    head, body, activeElement: null, baseURI: "http://localhost/project/", currentScript: { src: "http://localhost/project/learning/launcher.js" }, events: [],
    createElement: tag => new Element(tag), createElementNS: (namespace, tag) => { const value = new Element(tag); value.namespaceURI = namespace; return value; }, createTextNode: text => new Element("#text", text),
    getElementById: id => ids.get(id), querySelector: selector => body.querySelector(selector), dispatchEvent(event) { this.events.push(event); },
  };
  const timers = [];
  const window = { document, CDSCLearning: {}, CDSC_CONFIG: { destinations: { learning: { mode: external ? "external" : "embedded" } } }, localStorage: storage, matchMedia: () => ({ matches: reduced }), setTimeout: fn => { timers.push(fn); return timers.length; } };
  const context = vm.createContext({ window, document, URL, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }, console });
  const run = name => vm.runInContext(fs.readFileSync(path.join(root, "public/learning", name), "utf8"), context, { filename: name });
  const requestedScripts = [];
  head.onAppend = element => {
    if (element.tagName !== "SCRIPT") return;
    const name = new URL(element.src).pathname.split("/learning/")[1];
    requestedScripts.push(name);
    Promise.resolve().then(() => { if (failScript?.(name)) element.onerror(); else { run(name); element.onload(); } });
  };
  if (preload) modules.forEach(run);
  return { Q: window.CDSCLearning, window, document, context, ids, trigger, dialog, run, timers, requestedScripts, flush: async () => { for (let index = 0; index < 30; index++) await Promise.resolve(); } };
}

function roundActions(Q, id, round) {
  const actions = [];
  const send = action => actions.push(action);
  if (id === "inbox") {
    if (round === 0) for (const slot of Q.content.slots) { send({ type: "slot", id: slot }); send({ type: "choose", id: slot + "-good" }); }
    else for (const example of ["confirmed", "uncertain"]) send({ type: "toggle-example", id: example });
    send({ type: "generate" });
  }
  if (id === "delegate") send({ type: "classify", id: Q.content.delegation[round].answer });
  if (id === "repair") {
    if (round === 0) { send({ type: "meta-choice", id: "richt" }); for (const question of Q.content.metaPrompt.questions) send({ type: "clarify", question: question.id, id: question.answer }); }
    else for (const action of ["structure", "next", "audience"]) send({ type: "apply", id: action });
    send({ type: "finish" });
  }
  if (id === "hunter") {
    if (round === 0) send({ type: "method", id: "structured" });
    else for (const variant of Q.content.variants) send({ type: "variant", id: variant.id });
    send({ type: "screen", id: "claims" });
    for (let index = 0; index < 3; index++) { send({ type: "claim", index }); send({ type: "evidence" }); send({ type: "classify", id: Q.content.hunter[round].claims[index].answer }); }
    send({ type: "check" });
  }
  if (id === "data-danger") { for (const span of Q.content.danger[round].segments.filter(span => span.remove)) send({ type: "redact", id: span.id }); send({ type: "screen", id: "workflow" }); send({ type: "workflow", id: Q.content.danger[round].preferred }); send({ type: "check" }); }
  return actions;
}

function perfect(Q, id) {
  const game = Q.games[id];
  let state = game.reduce(game.createAttempt(), { type: "start" });
  for (let round = 0; round < game.count; round++) {
    for (const action of roundActions(Q, id, round)) state = game.reduce(state, action);
    state = game.reduce(state, { type: "next" });
  }
  return state;
}
module.exports = { environment, memoryStorage, perfect, roundActions, root };
