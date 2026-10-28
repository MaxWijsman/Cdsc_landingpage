((Q) => {
  "use strict";
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "className") node.className = value;
      else if (key === "disabled" || key === "hidden") node[key] = !!value;
      else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child !== null && child !== undefined) node.append(typeof child === "string" || typeof child === "number" ? document.createTextNode(String(child)) : child);
    }
    return node;
  };
  const button = (label, onClick, options = {}) => {
    const node = el("button", { type: "button", className: options.className || ("q-button" + (options.primary ? " q-primary" : "")), disabled: options.disabled, "data-q-focus": options.key, "aria-pressed": options.pressed === undefined ? undefined : String(options.pressed) }, label);
    node.addEventListener("click", onClick);
    return node;
  };
  const circuit = (mood = "curious") => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 40 40"); svg.setAttribute("class", "q-circuit"); svg.setAttribute("aria-hidden", "true");
    const part = (tag, attrs) => { const node = document.createElementNS(svg.namespaceURI, tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); svg.append(node); };
    part("rect", { x: "4", y: "9", width: "32", height: "25", rx: "9", fill: "#fff1e3", stroke: "#e17000", "stroke-width": "2" });
    part("path", { d: "M20 9V4m-2 0h4", stroke: "#e17000", "stroke-width": "2", fill: "none" });
    [14, 26].forEach((x) => part("circle", { cx: x, cy: "20", r: "2", fill: "#154273" }));
    part("path", { d: mood === "caution" ? "M15 28q5-4 10 0" : mood === "celebrate" ? "M14 26q6 8 12 0" : "M16 27h8", stroke: "#154273", "stroke-width": "2", fill: "none", "stroke-linecap": "round" });
    return svg;
  };
  const context = (title, brief, hint = "Eén keuze tegelijk.") => el("aside", { className: "q-context" }, [el("h3", {}, title), el("p", {}, brief), el("div", { className: "q-topline" }, [circuit(), el("p", { className: "q-small" }, hint)])]);
  const layout = (title, brief, panel, hint) => el("div", { className: "q-layout" }, [context(title, brief, hint), el("div", { className: "q-panel" }, panel)]);
  const output = (text, label = "Gesimuleerde AI") => el("div", {}, [el("div", { className: "q-output-label" }, label), el("div", { className: "q-output" }, text)]);
  const feedback = (evaluation) => el("div", { className: "q-feedback" + (evaluation.critical || evaluation.score < 70 ? " q-caution" : "") }, [
    el("h4", {}, evaluation.critical ? "Let op: een veiligheidsfout" : evaluation.score >= 90 ? "Een sterk resultaat" : evaluation.score >= 70 ? "Goed op weg" : "Probeer een andere aanpak"),
    el("ul", {}, evaluation.feedback.map((text) => el("li", {}, text))),
  ]);
  const choices = (items, handler, selected, keyPrefix = "choice", columns = 3) => el("div", { className: "q-choices" + (columns === 2 ? " q-two" : "") }, items.map((item) => button(item.label, () => handler(item.id), { className: "q-choice", key: keyPrefix + "-" + item.id, pressed: selected === undefined ? undefined : selected === item.id, disabled: item.disabled })));
  const starsText = (score) => "★".repeat(Q.core.stars(score)) + "☆".repeat(3 - Q.core.stars(score));
  Q.view = { el, button, circuit, context, layout, output, feedback, choices, starsText };
})(window.CDSCLearning = window.CDSCLearning || {});
