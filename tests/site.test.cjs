const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const configSource = fs.readFileSync(path.join(root, "public/site-config.js"), "utf8");

// A small DOM fixture lets the actual browser script run without dependencies.
class Element {
  constructor(tagName = "span", text = "") {
    this.tagName = tagName;
    this.textContent = text;
    this.attributes = {};
    this.dataset = {};
    this.children = [];
    this.selectors = {};
    this.listeners = {};
    this.classes = new Set();
    this.classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  querySelector(selector) { return this.selectors[selector] || this.children.find(child => child.selector === selector); }
  append(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this;
    this.children.push(child);
  }
  get firstChild() { return this.children[0]; }
  replaceWith(next) { this.replacement = next; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
}

function setup({ reduced = false, hidden = false, mutateConfig } = {}) {
  const selectors = new Map();
  const one = (selector, element = new Element()) => { selectors.set(selector, [element]); return element; };
  const many = (selector, elements) => { selectors.set(selector, elements); return elements; };
  const document = {
    hidden,
    documentElement: new Element("html"),
    listeners: {},
    querySelector: selector => (selectors.get(selector) || [])[0],
    querySelectorAll: selector => selectors.get(selector) || [],
    createElement: tagName => new Element(tagName),
    addEventListener(name, fn) { this.listeners[name] = fn; },
  };
  const name = one("[data-team-name], #logo-title");
  const shortName = one("[data-short-name]");
  const intro = one("[data-introduction]");
  one("[data-brand-link]");
  one(".brand-name strong");
  one(".brand-name > span");
  one(".brand-image img");
  many("h1 > span", ["Build.", "Connect.", "Explore AI."].map(text => new Element("span", text)));
  for (const selector of ['meta[property="og:title"]', 'meta[name="description"]', 'meta[property="og:description"]']) one(selector);

  const cards = many("[data-destination]", ["products", "team", "learning", "contact"].map(key => {
    const card = new Element("article");
    card.dataset.destination = key;
    card.className = "destination";
    for (const [selector, text] of [["[data-destination-label]", key], ["[data-destination-description]", "Draft"], ["[data-destination-status]", "Coming soon"]]) {
      const child = new Element("span", text);
      child.selector = selector;
      card.append(child);
    }
    one(`[data-nav="${key}"]`);
    return card;
  }));
  const toggle = one("#motion-toggle", new Element("button"));
  const motionLabel = new Element();
  toggle.selectors["[data-motion-label]"] = motionLabel;
  document.getElementById = id => id === "motion-toggle" ? toggle : null;
  const paths = many("[data-branch]", Array.from({ length: 3 }, () => new Element("path")));
  const terminals = many("[data-terminal]", Array.from({ length: 3 }, () => new Element("circle")));
  const centres = many("[data-terminal-centre]", Array.from({ length: 3 }, () => new Element("circle")));
  const preference = { matches: reduced, addEventListener(name, fn) { this.listener = fn; } };
  const callbacks = new Map();
  let frameId = 0;
  const window = {
    matchMedia: () => preference,
    requestAnimationFrame: fn => { callbacks.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => callbacks.delete(id),
  };
  const context = vm.createContext({ window, document, URL });
  vm.runInContext(configSource, context);
  if (mutateConfig) mutateConfig(window.CDSC_CONFIG);
  vm.runInContext(appSource, context);
  return {
    document, window, selectors, cards, toggle, motionLabel, paths, terminals, centres, preference, callbacks, name, shortName, intro,
    step(time) {
      const next = callbacks.entries().next().value;
      if (!next) throw new Error("No animation frame scheduled");
      callbacks.delete(next[0]);
      next[1](time);
    },
  };
}

test("all four missing destinations remain non-clickable Coming soon items", () => {
  const page = setup();
  assert.equal(page.cards.length, 4);
  for (const card of page.cards) {
    assert.equal(card.replacement, undefined);
    assert.equal(card.querySelector("[data-destination-status]").textContent, "Coming soon");
    const nav = page.selectors.get(`[data-nav="${card.dataset.destination}"]`)[0];
    assert.match(nav.title, /Coming soon/);
    assert.equal(nav.replacement, undefined);
  }
});

test("configured destinations activate matching cards and navigation in the same tab", () => {
  const page = setup({ mutateConfig(config) {
    config.destinations.products.url = "https://example.org/products";
    config.destinations.contact.url = "mailto:team@example.org";
  } });
  for (const key of ["products", "contact"]) {
    const card = page.cards.find(item => item.dataset.destination === key);
    const nav = page.selectors.get(`[data-nav="${key}"]`)[0].replacement;
    assert.equal(card.replacement.tagName, "a");
    assert.equal(nav.href, card.replacement.href);
    assert.equal(card.replacement.target, undefined);
    assert.equal(card.replacement.getAttribute("aria-disabled"), undefined);
    assert.match(card.replacement.querySelector("[data-destination-status]").textContent, /Explore/);
  }
  assert.equal(page.cards.find(item => item.dataset.destination === "team").replacement, undefined);
});

test("unsafe or malformed destinations do not create links", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hello", "not a URL", "/missing-host", "  "]) {
    const page = setup({ mutateConfig(config) { config.destinations.products.url = url; } });
    assert.equal(page.cards[0].replacement, undefined, url);
  }
});

test("branding, introductory copy, labels, and metadata use configuration as plain text", () => {
  const page = setup({ mutateConfig(config) {
    config.teamName = "COMMIT Test Cell";
    config.shortName = "TEST";
    config.headline = ["One.", "Two.", "Three."];
    config.introduction = "A configured introduction.";
    config.destinations.team.label = "People <test>";
  } });
  assert.equal(page.name.textContent, "COMMIT Test Cell");
  assert.equal(page.shortName.textContent, "TEST");
  assert.equal(page.intro.textContent, "A configured introduction.");
  assert.equal(page.document.title, "COMMIT Test Cell — One. Two. Three.");
  assert.equal(page.cards[1].querySelector("[data-destination-label]").textContent, "People <test>");
});

test("moving paths stay attached, terminals align, and all branches stay inside the SVG", () => {
  const page = setup();
  const previous = new Set();
  for (let frame = 0; frame < 1500; frame++) {
    page.step(frame * 32);
    page.paths.forEach((branch, index) => {
      const shape = branch.getAttribute("d");
      assert.ok(shape.startsWith(["M682 555H", "M773 626H", "M682 695H"][index]));
      const x = Number(page.terminals[index].getAttribute("cx"));
      const y = Number(page.terminals[index].getAttribute("cy"));
      assert.ok(shape.endsWith(`H${x}`));
      assert.ok(shape.includes(` ${y}H`));
      assert.equal(page.centres[index].getAttribute("cx"), String(x));
      assert.equal(page.centres[index].getAttribute("cy"), String(y));
      assert.ok(x + 43 < 1390 && x - 43 > 70);
      assert.ok(y - 43 > 110 && y + 43 < 1160);
      previous.add(shape);
    });
    assert.ok(Number(page.terminals[0].getAttribute("cy")) + 86 < Number(page.terminals[1].getAttribute("cy")));
    assert.ok(Number(page.terminals[1].getAttribute("cy")) + 86 < Number(page.terminals[2].getAttribute("cy")));
  }
  assert.ok(previous.size > 1000);
});

test("pause freezes JS and CSS motion; resume continues without a time jump", () => {
  const page = setup();
  page.step(1000);
  page.step(1032);
  const before = page.paths[0].getAttribute("d");
  page.toggle.listeners.click();
  assert.equal(page.callbacks.size, 0);
  assert.equal(page.motionLabel.textContent, "Resume motion");
  assert.equal(page.toggle.getAttribute("aria-pressed"), "true");
  assert.ok(page.document.documentElement.classes.has("motion-paused"));
  page.toggle.listeners.click();
  page.step(900000);
  assert.equal(page.paths[0].getAttribute("d"), before);
  assert.equal(page.motionLabel.textContent, "Pause motion");
});

test("hidden tabs suspend motion and preserve the visitor's pause choice", () => {
  const page = setup();
  page.document.hidden = true;
  page.document.listeners.visibilitychange();
  assert.equal(page.callbacks.size, 0);
  page.document.hidden = false;
  page.document.listeners.visibilitychange();
  assert.equal(page.callbacks.size, 1);
  page.toggle.listeners.click();
  page.document.hidden = true;
  page.document.listeners.visibilitychange();
  page.document.hidden = false;
  page.document.listeners.visibilitychange();
  assert.equal(page.callbacks.size, 0);
});

test("reduced motion starts static and follows live preference changes", () => {
  const page = setup({ reduced: true });
  assert.equal(page.callbacks.size, 0);
  assert.equal(page.toggle.disabled, true);
  assert.equal(page.motionLabel.textContent, "Reduced motion");
  assert.equal(page.paths[0].getAttribute("d"), "M682 555H865L955 468H1063");
  page.preference.matches = false;
  page.preference.listener();
  assert.equal(page.callbacks.size, 1);
  assert.equal(page.toggle.disabled, false);
  page.preference.matches = true;
  page.preference.listener();
  assert.equal(page.callbacks.size, 0);
  assert.equal(page.paths[2].getAttribute("d"), "M682 695H865L955 785H1063");
});

test("the original logo is preserved and the static HTML has local assets and fallbacks", () => {
  assert.deepEqual(fs.readFileSync(path.join(root, "Logo.png")), fs.readFileSync(path.join(root, "public/assets/Logo.png")));
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) {
    assert.ok(fs.existsSync(path.resolve(root, "public", match[1])), match[1]);
  }
  assert.match(html, /<h1[^>]*><span>Build\.<\/span>/);
  assert.equal((html.match(/data-destination="/g) || []).length, 4);
  assert.equal((html.match(/data-branch="/g) || []).length, 3);
  assert.match(html, /<noscript>/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
});
