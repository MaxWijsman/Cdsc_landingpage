const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
const configSource = fs.readFileSync(path.join(root, "public/site-config.js"), "utf8");

class Element {
  constructor(tag = "span", text = "") {
    this.tagName = tag;
    this.textContent = text;
    this.attributes = {};
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.classes = new Set();
    this.classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
    this.rect = { left: 0, top: 0, width: 0, height: 0 };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  removeAttribute(name) { delete this.attributes[name]; }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.selector === selector || child.tagName === selector ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  append(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this;
    this.children.push(child);
  }
  get firstChild() { return this.children[0]; }
  replaceWith(next) { this.replacement = next; next.rect = this.rect; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  getBoundingClientRect() { return { ...this.rect, right: this.rect.left + this.rect.width }; }
}

function setup({ reduced = false, mobile = false, mutateConfig } = {}) {
  const nodes = new Map();
  const one = (selector, node = new Element()) => { nodes.set(selector, [node]); return node; };
  const many = (selector, list) => { nodes.set(selector, list); return list; };
  const document = {
    hidden: false,
    documentElement: new Element("html"),
    listeners: {},
    querySelector: selector => nodes.get(selector)?.[0],
    querySelectorAll: selector => nodes.get(selector) || [],
    getElementById: id => nodes.get("#" + id)?.[0],
    createElement: tag => new Element(tag),
    addEventListener(name, fn) { this.listeners[name] = fn; },
  };
  one("[data-name-first]");
  one("[data-name-rest]");
  one("#logo-title");
  one('meta[property="og:title"]');
  const stage = one("#connection-stage");
  const logo = one("#logo-mark");
  const overlay = one("#connection-tracks");
  stage.rect = { left: 40, top: 80, width: mobile ? 350 : 1120, height: mobile ? 870 : 600 };
  logo.rect = { left: mobile ? 55 : 100, top: 80, width: mobile ? 320 : 460, height: mobile ? 301.176 : 432.941 };
  const keys = ["products", "team", "contact"];
  const placeholders = many(".destinations [data-destination]", keys.map((key, index) => {
    const node = new Element();
    node.dataset.destination = key;
    node.className = "destination";
    const label = new Element("strong", key);
    label.selector = "[data-label]";
    const status = new Element("small", "Coming soon");
    status.selector = "[data-status]";
    node.append(label);
    node.append(status);
    node.rect = { left: mobile ? 55 : 780, top: mobile ? 560 + index * 87 : 131 + index * 107, width: mobile ? 320 : 380, height: mobile ? 75 : 91 };
    return node;
  }));
  const paths = many("[data-branch]", Array.from({ length: 3 }, () => new Element("path")));
  const terminals = many("[data-terminal]", Array.from({ length: 3 }, () => new Element("circle")));
  const routes = many("[data-route]", keys.map(key => {
    const route = new Element("g");
    route.dataset.route = key;
    route.append(new Element("path"));
    route.append(new Element("path"));
    route.append(new Element("circle"));
    return route;
  }));
  const toggle = one("#motion-toggle", new Element("button"));
  const learningLink = one("#learning-link", new Element("a"));
  learningLink.dataset.destination = "learning";
  learningLink.setAttribute("aria-disabled", "true");
  const hint = new Element("text");
  hint.selector = ".star-hint";
  learningLink.append(hint);
  one("#learning-link-title");
  const preference = { matches: reduced, addEventListener(name, fn) { this.listener = fn; } };
  const callbacks = new Map();
  let counter = 0;
  const window = {
    listeners: {},
    matchMedia: query => query.includes("reduced") ? preference : { matches: mobile },
    requestAnimationFrame: fn => { callbacks.set(++counter, fn); return counter; },
    cancelAnimationFrame: id => callbacks.delete(id),
    addEventListener(name, fn) { this.listeners[name] = fn; },
  };
  const context = vm.createContext({ window, document, URL });
  vm.runInContext(configSource, context);
  if (mutateConfig) mutateConfig(window.CDSC_CONFIG);
  vm.runInContext(appSource, context);
  const destinations = placeholders.map(node => node.replacement || node);
  return {
    window, document, nodes, stage, logo, overlay, placeholders, destinations, learningLink, highlightTargets: [...destinations, learningLink], paths, terminals, routes, toggle, preference, callbacks,
    step(time) {
      const [id, callback] = callbacks.entries().next().value;
      callbacks.delete(id);
      callback(time);
    },
  };
}

test("three unconfigured chapters and the learning star retain missing-link states", () => {
  const page = setup();
  assert.equal(page.destinations.length, 3);
  page.placeholders.forEach(node => {
    assert.equal(node.replacement, undefined);
    assert.equal(node.querySelector("[data-status]").textContent, "Coming soon");
  });
  assert.equal(page.document.title, "COMMIT Datascience Cell");
  assert.equal(page.nodes.get("[data-name-rest]")[0].textContent, "Datascience Cell");
  assert.equal(page.learningLink.getAttribute("href"), undefined);
  assert.equal(page.learningLink.getAttribute("aria-label"), "AI Learning Track — Coming soon");
});

test("configured links open in the same tab and hide placeholder status", () => {
  const page = setup({ mutateConfig(config) {
    config.destinations.products.url = "https://example.org/products";
    config.destinations.contact.url = "mailto:team@example.org";
    config.destinations.team.label = "People";
  } });
  assert.equal(page.destinations[0].href, "https://example.org/products");
  assert.equal(page.destinations[2].href, "mailto:team@example.org");
  for (const node of [page.destinations[0], page.destinations[2]]) {
    assert.equal(node.tagName, "a");
    assert.equal(node.target, undefined);
    assert.equal(node.getAttribute("aria-disabled"), undefined);
    assert.equal(node.querySelector("[data-status]").hidden, true);
  }
  assert.equal(page.destinations[1].querySelector("[data-label]").textContent, "People");
});

test("the central SVG star opens the configured learning URL as an accessible same-tab link", () => {
  const page = setup({ mutateConfig(config) { config.destinations.learning.url = "https://example.org/learn"; } });
  assert.equal(page.learningLink.getAttribute("href"), "https://example.org/learn");
  assert.equal(page.learningLink.getAttribute("aria-disabled"), undefined);
  assert.equal(page.learningLink.getAttribute("aria-label"), "AI Learning Track");
  assert.equal(page.learningLink.getAttribute("target"), undefined);
  page.learningLink.listeners.focus();
  assert.ok(page.learningLink.classes.has("is-highlighted"));
  assert.equal(page.routes.filter(route => route.classes.has("is-highlighted")).length, 0);
});

test("unsafe and malformed URLs remain inactive", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "/relative", "not a URL", ""]) {
    const page = setup({ mutateConfig(config) { config.destinations.products.url = url; config.destinations.learning.url = url; } });
    assert.equal(page.placeholders[0].replacement, undefined, url);
    assert.equal(page.learningLink.getAttribute("href"), undefined, url);
  }
});

test("all four destinations are highlighted in turn", () => {
  const page = setup();
  const seen = new Set();
  for (let index = 0; index < 300; index++) {
    page.step(index * 32);
    const highlighted = page.highlightTargets.filter(node => node.classes.has("is-highlighted"));
    assert.equal(highlighted.length, 1);
    seen.add(highlighted[0].dataset.destination);
    const route = page.routes.find(route => route.classes.has("is-highlighted"));
    if (highlighted[0] === page.learningLink) assert.equal(route, undefined);
    else assert.equal(route.dataset.route, highlighted[0].dataset.destination);
  }
  assert.equal(seen.size, 4);
});

test("hover and keyboard focus select the corresponding circuit, including with reduced motion", () => {
  const page = setup({ reduced: true, mutateConfig(config) { config.destinations.team.url = "https://example.org/team"; } });
  assert.equal(page.destinations.filter(node => node.classes.has("is-highlighted")).length, 0);
  page.destinations[0].listeners.pointerenter();
  assert.ok(page.routes[0].classes.has("is-highlighted"));
  page.destinations[1].listeners.focus();
  assert.ok(page.routes[1].classes.has("is-highlighted"));
  page.destinations[1].listeners.blur();
  assert.ok(page.routes[0].classes.has("is-highlighted"));
  page.destinations[0].listeners.pointerleave();
  assert.equal(page.routes.filter(route => route.classes.has("is-highlighted")).length, 0);
});

test("branches remain attached and all three connector endpoints align with links", () => {
  const page = setup();
  for (let frame = 0; frame < 600; frame++) {
    page.step(frame * 32);
    page.paths.forEach((branch, index) => {
      const shape = branch.getAttribute("d");
      const x = page.terminals[index].getAttribute("cx");
      const y = page.terminals[index].getAttribute("cy");
      assert.ok(shape.startsWith(["M682 555H", "M773 626H", "M682 695H"][index]));
      assert.ok(shape.endsWith(" " + y + "H" + x));
      assert.ok(Number(x) + 43 < 1160);
    });
    page.routes.forEach((route, index) => {
      const target = page.destinations[index].getBoundingClientRect();
      const end = route.querySelector("circle");
      assert.equal(Number(end.getAttribute("cx")), target.left - 40);
      assert.equal(Number(end.getAttribute("cy")), target.top - 80 + target.height / 2);
      const shape = route.querySelector("path").getAttribute("d");
      assert.ok(!shape.includes("NaN"));
      assert.ok(shape.endsWith(" " + end.getAttribute("cy") + "H" + end.getAttribute("cx")));
    });
  }
  const sources = page.routes.map(route => route.querySelector("path").getAttribute("d").split("H")[0]);
  assert.equal(new Set(sources).size, 3);
});

test("mobile routes run beside the title and connect to link right edges; resize recalculates endpoints", () => {
  const page = setup({ mobile: true });
  page.step(0);
  page.routes.forEach((route, index) => {
    const target = page.destinations[index].getBoundingClientRect();
    const end = route.querySelector("circle");
    assert.equal(Number(end.getAttribute("cx")), target.right - 40);
    assert.match(route.querySelector("path").getAttribute("d"), /H\d+V/);
  });
  page.destinations[0].rect.top += 20;
  page.window.listeners.resize();
  assert.equal(Number(page.routes[0].querySelector("circle").getAttribute("cy")), page.destinations[0].rect.top - 80 + 37.5);
});

test("pause, hidden tabs, and reduced motion stop continuous motion", () => {
  const page = setup();
  page.step(1000);
  page.step(1032);
  const before = page.paths[0].getAttribute("d");
  page.toggle.listeners.click();
  assert.equal(page.callbacks.size, 0);
  assert.equal(page.toggle.getAttribute("aria-pressed"), "true");
  assert.equal(page.toggle.getAttribute("aria-label"), "Resume motion");
  assert.equal(page.toggle.title, "Resume motion");
  assert.equal(page.toggle.children.length, 0);
  assert.ok(page.document.documentElement.classes.has("motion-paused"));
  page.toggle.listeners.click();
  page.step(900000);
  assert.equal(page.paths[0].getAttribute("d"), before);
  page.document.hidden = true;
  page.document.listeners.visibilitychange();
  assert.equal(page.callbacks.size, 0);
  page.document.hidden = false;
  page.document.listeners.visibilitychange();
  assert.equal(page.callbacks.size, 1);
  page.preference.matches = true;
  page.preference.listener();
  assert.equal(page.callbacks.size, 0);
  assert.equal(page.toggle.disabled, true);
  assert.equal(page.paths[0].getAttribute("d"), "M682 555H865L955 468H1063");
  assert.equal(page.routes.filter(route => route.classes.has("is-highlighted")).length, 0);
});

test("static fallback has the logo, title, four destinations, local fonts, and no marketing copy", () => {
  const html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  assert.match(html, /data-name-first>COMMIT/);
  assert.match(html, /data-name-rest>Datascience Cell/);
  assert.equal((html.match(/data-destination="/g) || []).length, 4);
  assert.equal((html.match(/data-route="/g) || []).length, 3);
  assert.ok(html.indexOf('<h1 class="site-title"') < html.indexOf('id="connection-stage"'));
  const nav = html.slice(html.indexOf('<nav class="destinations"'), html.indexOf('</nav>'));
  assert.deepEqual(Array.from(nav.matchAll(/data-destination="([^"]+)"/g), match => match[1]), ["products", "team", "contact"]);
  assert.doesNotMatch(html, /data-motion-label/);
  assert.match(html, /class="learning-star"[^>]+role="link"[^>]+tabindex="0"/);
  assert.doesNotMatch(html, /hero-introduction|<p>|Build\.|Explore the cell|star-field/);
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) {
    assert.ok(fs.existsSync(path.resolve(root, "public", match[1])), match[1]);
  }
  for (const font of ["RO-SansWebText-Regular.woff2", "RobotoCondensed-Bold.woff2"]) {
    assert.equal(fs.readFileSync(path.join(root, "public/assets/fonts", font)).subarray(0, 4).toString(), "wOF2");
  }
  assert.deepEqual([...fs.readFileSync(path.join(root, "public/assets/fonts/Orbitron.ttf")).subarray(0, 4)], [0, 1, 0, 0]);
  assert.deepEqual(fs.readFileSync(path.join(root, "Logo.png")), fs.readFileSync(path.join(root, "public/assets/Logo.png")));
});
