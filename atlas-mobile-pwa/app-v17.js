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
    enhanceDistribution(atlas);
    document.querySelectorAll(".atlas-card").forEach((card) => enhanceCard(card, atlas));
    const detail = document.querySelector("#detailPanel");
    if (detail && !detail.classList.contains("empty-state")) enhanceDetail(detail, atlas);
  }

  function enhanceDistribution(atlas) {
    const cardsView = document.querySelector("#view-cards");
    const searchPanel = cardsView?.querySelector(".search-panel");
    if (!cardsView || !searchPanel) return;
    const existing = cardsView.querySelector(".card-distribution");
    const signature = JSON.stringify(distributionItems(atlas).map((item) => [item.id, item.importance, item.confidence, item.shadow_level, item.tension_level]));
    if (existing?.dataset.signature === signature) return;
    existing?.remove();
    const items = distributionItems(atlas);
    if (!items.length) return;
    searchPanel.insertAdjacentHTML("afterend", distributionChart(items, signature));
    bindDistribution(cardsView.querySelector(".card-distribution"));
  }

  function distributionItems(atlas) {
    return [
      ...arr(atlas.thought_nodes).map((item) => ({ ...item, kind: "node" })),
      ...arr(atlas.latent_beliefs).map((item) => ({ ...item, kind: "belief" })),
      ...arr(atlas.tensions).map((item) => ({ ...item, kind: "tension" }))
    ].filter((item) => item.title || item.id);
  }

  function distributionChart(items, signature) {
    const points = items.map((item, index) => {
      const x = 36 + clamp(num(item.confidence), 0, 1) * 292;
      const y = 24 + (1 - clamp(num(item.importance), 0, 1)) * 222;
      const intensity = Math.max(num(item.shadow_level ?? item.friction_level), num(item.tension_level ?? item.dilemma_level));
      const size = 5 + clamp(intensity, 0, 1) * 5;
      const kind = item.kind || "node";
      const label = item.title || item.id || `card-${index + 1}`;
      return `<g class="distribution-point kind-${esc(kind)}" tabindex="0" role="button" data-title="${esc(label)}" aria-label="${esc(label)}">${pointShape(kind, x, y, size)}<title>${esc(label)} / importance ${fixed(item.importance)} / confidence ${fixed(item.confidence)}</title></g>`;
    }).join("");
    return `<section class="card-distribution" data-signature="${esc(signature)}" aria-labelledby="distribution-title"><div class="distribution-heading"><div><h3 id="distribution-title">カード分布</h3><p>重要度 × 確信度</p></div><div class="distribution-legend" aria-label="カード種別"><span><i class="legend-topic"></i>Topic</span><span><i class="legend-principle"></i>Principle</span><span><i class="legend-question"></i>Question</span></div></div><svg viewBox="0 0 360 286" role="img" aria-label="カードの重要度と確信度の分布"><line class="distribution-grid" x1="36" y1="24" x2="36" y2="246"></line><line class="distribution-grid" x1="36" y1="246" x2="328" y2="246"></line><line class="distribution-midline" x1="36" y1="135" x2="328" y2="135"></line><line class="distribution-midline" x1="182" y1="24" x2="182" y2="246"></line><text class="distribution-axis-label" x="16" y="24">高</text><text class="distribution-axis-label" x="16" y="250">低</text><text class="distribution-axis-title" x="13" y="140" transform="rotate(-90 13 140)">重要度</text><text class="distribution-axis-label" x="36" y="270">低</text><text class="distribution-axis-label" x="328" y="270" text-anchor="end">高</text><text class="distribution-axis-title" x="182" y="282" text-anchor="middle">確信度</text>${points}</svg><p class="distribution-note">点が大きいほど、明示された迷い・摩擦が強いカードです。</p></section>`;
  }

  function pointShape(kind, x, y, size) {
    if (kind === "belief") return `<rect x="${fixed(x - size)}" y="${fixed(y - size)}" width="${fixed(size * 2)}" height="${fixed(size * 2)}" rx="2"></rect>`;
    if (kind === "tension") return `<path d="M ${fixed(x)} ${fixed(y - size - 1)} L ${fixed(x + size + 1)} ${fixed(y + size)} L ${fixed(x - size - 1)} ${fixed(y + size)} Z"></path>`;
    return `<circle cx="${fixed(x)}" cy="${fixed(y)}" r="${fixed(size)}"></circle>`;
  }

  function bindDistribution(root) {
    if (!root || root.dataset.bound === "true") return;
    root.dataset.bound = "true";
    const open = (point) => {
      const title = point?.dataset.title;
      if (!title) return;
      const card = [...document.querySelectorAll("#cardList .atlas-card")].find((node) => text(node.querySelector(".card-title")) === title);
      card?.click();
    };
    root.addEventListener("click", (event) => open(event.target.closest(".distribution-point")));
    root.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(event.target.closest(".distribution-point")); }
    });
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

  function isNetworkItem(item) { return item.kind === "node" || item.source_type === "core_principle"; }
  function hasNetwork(atlas) { return arr(atlas.edges).length && networkItems(atlas).length > 1; }
  function networkItems(atlas) { return [...arr(atlas.thought_nodes), ...arr(atlas.latent_beliefs).filter((item) => item.source_type === "core_principle")]; }

  function networkSvg(activeItem, atlas, compact) {
    const data = networkData(atlas);
    if (data.nodes.length < 2 || !data.edges.length) return "";
    const activeKey = keyForItem(activeItem);
    const edgeSvg = data.edges.map((edge) => {
      const a = data.map.get(edge.source), b = data.map.get(edge.target);
      if (!a || !b) return "";
      const cx = ((a.x + b.x) / 2) * 0.45 + 180 * 0.55, cy = ((a.y + b.y) / 2) * 0.45 + 180 * 0.55;
      const hit = !activeKey || edge.source === activeKey || edge.target === activeKey;
      return `<path class="network-edge${hit ? " is-active" : " is-muted"}" data-source="${esc(edge.source)}" data-target="${esc(edge.target)}" d="M ${fixed(a.x)} ${fixed(a.y)} Q ${fixed(cx)} ${fixed(cy)} ${fixed(b.x)} ${fixed(b.y)}" stroke-width="${fixed(Math.max(1, edge.weight))}"></path>`;
    }).join("");
    const nodeSvg = data.nodes.map((node) => {
      const hit = !activeKey || node.key === activeKey || data.edges.some((edge) => (edge.source === activeKey && edge.target === node.key) || (edge.target === activeKey && edge.source === node.key));
      return `<circle class="network-node${hit ? " is-active" : " is-muted"}" data-node="${esc(node.key)}" cx="${fixed(node.x)}" cy="${fixed(node.y)}" r="${fixed(node.r)}"><title>${esc(node.label)}</title></circle>`;
    }).join("");
    const labelSvg = data.nodes.map((node) => {
      const angle = Math.atan2(node.y - 180, node.x - 180), x = 180 + Math.cos(angle) * 162, y = 180 + Math.sin(angle) * 162;
      const anchor = Math.cos(angle) > 0.25 ? "start" : Math.cos(angle) < -0.25 ? "end" : "middle";
      return `<text class="network-label" x="${fixed(x)}" y="${fixed(y)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(shorten(node.label, compact ? 9 : 12))}</text>`;
    }).join("");
    return `<div class="atlas-visual network-visual"><svg viewBox="0 0 360 360" role="img" aria-label="links network">${edgeSvg}${nodeSvg}${labelSvg}</svg></div>`;
  }

  function networkData(atlas) {
    const nodesByKey = new Map(), aliases = new Map();
    networkItems(atlas).forEach((item, index) => {
      const label = item.title || item.label || item.id || `node-${index + 1}`, key = slug(label);
      if (!nodesByKey.has(key)) nodesByKey.set(key, { key, label, degree: 0 });
      if (item.id) aliases.set(item.id, key);
      aliases.set(label, key);
    });
    const edges = arr(atlas.edges).map((edge) => {
      const source = aliases.get(edge.source) || slug(edge.source), target = aliases.get(edge.target) || slug(edge.target);
      if (!nodesByKey.has(source) || !nodesByKey.has(target) || source === target) return null;
      nodesByKey.get(source).degree += 1; nodesByKey.get(target).degree += 1;
      return { source, target, weight: num(edge.weight ?? edge.strength ?? 1) || 1 };
    }).filter(Boolean);
    const nodes = [...nodesByKey.values()], maxDegree = Math.max(1, ...nodes.map((node) => node.degree));
    nodes.forEach((node, index) => { const angle = -Math.PI / 2 + (Math.PI * 2 * index) / nodes.length; node.x = 180 + Math.cos(angle) * 140; node.y = 180 + Math.sin(angle) * 140; node.r = 4 + (node.degree / maxDegree) * 6; });
    return { nodes, edges, map: new Map(nodes.map((node) => [node.key, node])) };
  }

  function tensionSpectrum(item, atlas, compact) {
    const rows = arr(atlas.tensions).filter((row) => compact ? sameTension(row, item) : true).slice(0, compact ? 1 : 8);
    if (!rows.length) return "";
    return `<div class="atlas-visual tension-visual">${rows.map((row) => {
      const left = row.pole_a || row.from || "A", right = row.pole_b || row.to || "B";
      const hasLean = row.lean !== undefined && row.lean !== null;
      const pct = hasLean ? ((Math.max(-1, Math.min(1, num(row.lean))) + 1) / 2) * 100 : 50;
      return `<div class="tension-row${hasLean ? "" : " is-unmeasured"}"><span class="tension-label left">${esc(left)}</span><span class="tension-track"><span class="tension-marker" style="left:${fixed(pct)}%"></span></span><span class="tension-label right">${esc(right)}</span></div>`;
    }).join("")}</div>`;
  }

  function patternBars(item, atlas, compact) {
    const rows = patterns(atlas).map((row, index) => ({ ...row, index }));
    const hasSalience = rows.some((row) => row.salience !== undefined && row.salience !== null);
    if (hasSalience) rows.sort((a, b) => num(b.salience) - num(a.salience));
    const picked = compact ? rows.filter((row) => row.id === item.id || row.title === item.title || row.label === item.title).slice(0, 1) : rows.slice(0, 8);
    const visible = picked.length ? picked : rows.slice(0, compact ? 1 : 8);
    if (!visible.length) return "";
    return `<div class="atlas-visual pattern-visual">${visible.map((row) => {
      const width = hasSalience ? Math.max(4, Math.min(100, num(row.salience) * 100)) : 100;
      const badge = hasSalience ? "" : `<b>${esc(row.count || row.frequency || row.index + 1)}</b>`;
      return `<div class="pattern-row"><span class="pattern-label">${esc(row.label || row.title || row.id || `pattern-${row.index + 1}`)}</span><span class="pattern-bar"><span style="width:${fixed(width)}%"></span>${badge}</span></div>`;
    }).join("")}</div>`;
  }

  function patterns(atlas) { return arr(atlas.latent_beliefs).filter((item) => item.source_type === "observed_pattern"); }
  function bindNetwork(root) {
    root.querySelectorAll(".network-visual").forEach((visual) => {
      if (visual.dataset.bound === "true") return;
      visual.dataset.bound = "true";
      visual.addEventListener("click", (event) => { const node = event.target.closest(".network-node"); updateNetwork(visual, node?.dataset.node || ""); if (node) event.stopPropagation(); });
    });
  }
  function updateNetwork(visual, key) {
    const adjacent = new Set([key]);
    visual.querySelectorAll(".network-edge").forEach((edge) => { const hit = !key || edge.dataset.source === key || edge.dataset.target === key; edge.classList.toggle("is-active", hit); edge.classList.toggle("is-muted", !hit); if (hit && key) { adjacent.add(edge.dataset.source); adjacent.add(edge.dataset.target); } });
    visual.querySelectorAll(".network-node").forEach((node) => { const hit = !key || adjacent.has(node.dataset.node); node.classList.toggle("is-active", hit); node.classList.toggle("is-muted", !hit); });
  }

  function findItemByTitle(atlas, title) { return [...arr(atlas.thought_nodes), ...arr(atlas.latent_beliefs), ...arr(atlas.tensions)].find((item) => (item.title || item.label || item.id) === title); }
  function sameTension(row, item) { return row.id === item.id || row.title === item.title || row.from === item.from || row.to === item.to || row.pole_a === item.pole_a || row.pole_b === item.pole_b; }
  function readAtlas() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } }
  function keyForItem(item) { return slug(item?.title || item?.label || item?.id); }
  function text(node) { return node?.textContent?.trim() || ""; }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function fixed(value) { return num(value).toFixed(1); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function shorten(value, max) { const s = String(value || ""); return s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s; }
  function slug(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-") || "node"; }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
})();