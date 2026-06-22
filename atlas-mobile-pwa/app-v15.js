(() => {
  "use strict";

  const STORAGE_KEY = "thought-atlas-mobile:bundle";

  document.addEventListener("DOMContentLoaded", () => {
    enhance();
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  });

  function enhance() {
    const atlas = readAtlas();
    if (!atlas) return;
    document.querySelectorAll(".atlas-card").forEach((card) => enhanceCard(card, atlas));
    const detail = document.querySelector("#detailPanel");
    if (detail && !detail.classList.contains("empty-state")) enhanceDetail(detail, atlas);
  }

  function enhanceCard(card, atlas) {
    if (card.dataset.v15Visualized === "true") return;
    const item = findItemByTitle(atlas, text(card.querySelector(".card-title")));
    const visual = item ? visualFor(item, atlas, true) : "";
    if (!visual) return;
    const wrap = document.createElement("div");
    wrap.className = "atlas-visual-card";
    wrap.innerHTML = visual;
    card.append(wrap);
    bindNetwork(wrap);
    card.dataset.v15Visualized = "true";
  }

  function enhanceDetail(detail, atlas) {
    const title = text(detail.querySelector("h3"));
    if (detail.dataset.v15Visualized === title) return;
    detail.querySelectorAll(".atlas-visual").forEach((node) => node.remove());
    const item = findItemByTitle(atlas, title);
    const visual = item ? visualFor(item, atlas, false) : "";
    if (!visual) return;
    detail.insertAdjacentHTML("beforeend", visual);
    bindNetwork(detail);
    detail.dataset.v15Visualized = title;
  }

  function visualFor(item, atlas, compact) {
    if (isNetworkItem(item) && hasNetwork(atlas)) return networkSvg(item, atlas, compact);
    if (item.kind === "tension" && arr(atlas.tensions).length) return tensionSpectrum(item, atlas, compact);
    if (item.source_type === "observed_pattern" && patterns(atlas).length) return patternBars(item, atlas, compact);
    return "";
  }

  function isNetworkItem(item) {
    return item.kind === "node" || item.source_type === "core_principle";
  }

  function hasNetwork(atlas) {
    return arr(atlas.edges).length && networkItems(atlas).length > 1;
  }

  function networkItems(atlas) {
    return [
      ...arr(atlas.thought_nodes),
      ...arr(atlas.latent_beliefs).filter((item) => item.source_type === "core_principle")
    ];
  }

  function networkSvg(activeItem, atlas, compact) {
    const data = networkData(atlas);
    if (data.nodes.length < 2 || !data.edges.length) return "";
    const activeKey = keyForItem(activeItem);
    const edgeSvg = data.edges.map((edge) => {
      const a = data.map.get(edge.source);
      const b = data.map.get(edge.target);
      if (!a || !b) return "";
      const cx = ((a.x + b.x) / 2) * 0.45 + 180 * 0.55;
      const cy = ((a.y + b.y) / 2) * 0.45 + 180 * 0.55;
      const hit = !activeKey || edge.source === activeKey || edge.target === activeKey;
      return `<path class="network-edge${hit ? " is-active" : " is-muted"}" data-source="${esc(edge.source)}" data-target="${esc(edge.target)}" d="M ${fixed(a.x)} ${fixed(a.y)} Q ${fixed(cx)} ${fixed(cy)} ${fixed(b.x)} ${fixed(b.y)}" stroke-width="${fixed(Math.max(1, edge.weight))}"></path>`;
    }).join("");
    const nodeSvg = data.nodes.map((node) => {
      const hit = !activeKey || node.key === activeKey || data.edges.some((edge) => (edge.source === activeKey && edge.target === node.key) || (edge.target === activeKey && edge.source === node.key));
      return `<circle class="network-node${hit ? " is-active" : " is-muted"}" data-node="${esc(node.key)}" cx="${fixed(node.x)}" cy="${fixed(node.y)}" r="${fixed(node.r)}"><title>${esc(node.label)}</title></circle>`;
    }).join("");
    const labelSvg = data.nodes.map((node) => {
      const angle = Math.atan2(node.y - 180, node.x - 180);
      const x = 180 + Math.cos(angle) * 162;
      const y = 180 + Math.sin(angle) * 162;
      const anchor = Math.cos(angle) > 0.25 ? "start" : Math.cos(angle) < -0.25 ? "end" : "middle";
      return `<text class="network-label" x="${fixed(x)}" y="${fixed(y)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(shorten(node.label, compact ? 9 : 12))}</text>`;
    }).join("");
    return `<div class="atlas-visual network-visual"><svg viewBox="0 0 360 360" role="img" aria-label="links network">${edgeSvg}${nodeSvg}${labelSvg}</svg></div>`;
  }

  function networkData(atlas) {
    const items = networkItems(atlas);
    const nodesByKey = new Map();
    const aliases = new Map();
    items.forEach((item, index) => {
      const label = item.title || item.label || item.id || `node-${index + 1}`;
      const key = slug(label);
      if (!nodesByKey.has(key)) nodesByKey.set(key, { key, label, degree: 0 });
      if (item.id) aliases.set(item.id, key);
      aliases.set(label, key);
    });
    const edges = arr(atlas.edges).map((edge) => {
      const source = aliases.get(edge.source) || slug(edge.source);
      const target = aliases.get(edge.target) || slug(edge.target);
      if (!nodesByKey.has(source) || !nodesByKey.has(target) || source === target) return null;
      nodesByKey.get(source).degree += 1;
      nodesByKey.get(target).degree += 1;
      return { source, target, weight: num(edge.weight ?? edge.strength ?? 1) || 1 };
    }).filter(Boolean);
    const nodes = [...nodesByKey.values()];
    const maxDegree = Math.max(1, ...nodes.map((node) => node.degree));
    nodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / nodes.length;
      node.x = 180 + Math.cos(angle) * 140;
      node.y = 180 + Math.sin(angle) * 140;
      node.r = 4 + (node.degree / maxDegree) * 6;
    });
    return { nodes, edges, map: new Map(nodes.map((node) => [node.key, node])) };
  }

  function tensionSpectrum(item, atlas, compact) {
    const rows = arr(atlas.tensions)
      .filter((row) => compact ? sameTension(row, item) : true)
      .slice(0, compact ? 1 : 8);
    if (!rows.length) return "";
    return `<div class="atlas-visual tension-visual">${rows.map((row) => {
      const left = row.pole_a || row.from || "A";
      const right = row.pole_b || row.to || "B";
      const hasLean = row.lean !== undefined && row.lean !== null;
      const pct = hasLean ? ((Math.max(-1, Math.min(1, num(row.lean))) + 1) / 2) * 100 : 50;
      return `<div class="tension-row${hasLean ? "" : " is-unmeasured"}"><span class="tension-label left">${esc(left)}</span><span class="tension-track"><span class="tension-marker" style="left:${fixed(pct)}%"></span></span><span class="tension-label right">${esc(right)}</span></div>`;
    }).join("")}</div>`;
  }

  function patternBars(item, atlas, compact) {
    const rows = patterns(atlas).map((row, index) => ({ ...row, index }));
    const hasSalience = rows.some((row) => row.salience !== undefined && row.salience !== null);
    if (hasSalience) rows.sort((a, b) => num(b.salience) - num(a.salience));
    const picked = compact
      ? rows.filter((row) => row.id === item.id || row.title === item.title || row.label === item.title).slice(0, 1)
      : rows.slice(0, 8);
    const visible = picked.length ? picked : rows.slice(0, compact ? 1 : 8);
    if (!visible.length) return "";
    return `<div class="atlas-visual pattern-visual">${visible.map((row) => {
      const width = hasSalience ? Math.max(4, Math.min(100, num(row.salience) * 100)) : 100;
      const badge = hasSalience ? "" : `<b>${esc(row.count || row.frequency || row.index + 1)}</b>`;
      return `<div class="pattern-row"><span class="pattern-label">${esc(row.label || row.title || row.id || `pattern-${row.index + 1}`)}</span><span class="pattern-bar"><span style="width:${fixed(width)}%"></span>${badge}</span></div>`;
    }).join("")}</div>`;
  }

  function patterns(atlas) {
    return arr(atlas.latent_beliefs).filter((item) => item.source_type === "observed_pattern");
  }

  function bindNetwork(root) {
    root.querySelectorAll(".network-visual").forEach((visual) => {
      if (visual.dataset.bound === "true") return;
      visual.dataset.bound = "true";
      visual.addEventListener("click", (event) => {
        const node = event.target.closest(".network-node");
        const key = node?.dataset.node || "";
        updateNetwork(visual, key);
        if (node) event.stopPropagation();
      });
    });
  }

  function updateNetwork(visual, key) {
    const adjacent = new Set([key]);
    visual.querySelectorAll(".network-edge").forEach((edge) => {
      const hit = !key || edge.dataset.source === key || edge.dataset.target === key;
      edge.classList.toggle("is-active", hit);
      edge.classList.toggle("is-muted", !hit);
      if (hit && key) {
        adjacent.add(edge.dataset.source);
        adjacent.add(edge.dataset.target);
      }
    });
    visual.querySelectorAll(".network-node").forEach((node) => {
      const hit = !key || adjacent.has(node.dataset.node);
      node.classList.toggle("is-active", hit);
      node.classList.toggle("is-muted", !hit);
    });
  }

  function findItemByTitle(atlas, title) {
    return [...arr(atlas.thought_nodes), ...arr(atlas.latent_beliefs), ...arr(atlas.tensions)]
      .find((item) => (item.title || item.label || item.id) === title);
  }

  function sameTension(row, item) {
    return row.id === item.id || row.title === item.title || row.from === item.from || row.to === item.to || row.pole_a === item.pole_a || row.pole_b === item.pole_b;
  }

  function readAtlas() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  }
  function keyForItem(item) { return slug(item?.title || item?.label || item?.id); }
  function text(node) { return node?.textContent?.trim() || ""; }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function fixed(value) { return num(value).toFixed(1); }
  function shorten(value, max) { const s = String(value || ""); return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s; }
  function slug(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-") || "node"; }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
})();