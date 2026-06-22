(() => {
  "use strict";

  const STORAGE_KEY = "thought-atlas-mobile:bundle";
  const NOTES_KEY = "thought-atlas-mobile:notes";
  const $ = (id) => document.getElementById(id);

  const refs = {
    atlasTextInput: $("atlasTextInput"),
    cardCount: $("cardCount"),
    cardSearchInput: $("cardSearchInput"),
    clearDataButton: $("clearDataButton"),
    copyPromptButton: $("copyPromptButton"),
    copyRepairPromptButton: $("copyRepairPromptButton"),
    detailHint: $("detailHint"),
    detailPanel: $("detailPanel"),
    exportButton: $("exportButton"),
    fileInput: $("fileInput"),
    healthBadge: $("healthBadge"),
    healthList: $("healthList"),
    healthSummary: $("healthSummary"),
    loadSampleButton: $("loadSampleButton"),
    parseStatus: $("parseStatus"),
    parseTextButton: $("parseTextButton"),
    promptPreview: $("promptPreview"),
    tourList: $("tourList"),
    tourTabs: $("tourTabs"),
    cardList: $("cardList"),
    cardTabs: $("cardTabs"),
    cardTemplate: $("cardTemplate")
  };

  const tourDefinitions = [
    { id: "career", label: "Career", text: "仕事、学習、収益、生活基盤、将来選択に関係するテーマ", score: (item) => Math.max(val(item.importance), val(item.exploration_level)) + keywordBoost(item, ["仕事", "学習", "キャリア", "収益", "将来", "役割"]) },
    { id: "shadow", label: "Shadow", text: "行動に影響していそうな葛藤、回避、抵抗を観察するテーマ", score: (item) => val(item.shadow_level) + val(item.tension_level) + keywordBoost(item, ["葛藤", "不安", "回避", "抵抗", "恐れ", "迷い"]) },
    { id: "recurring", label: "Recurring", text: "繰り返し出てくる価値観や関心の候補", score: (item) => val(item.importance) + val(item.confidence) + keywordBoost(item, ["習慣", "繰り返し", "価値観", "関心"]) },
    { id: "emerging", label: "Emerging", text: "最近育ち始めた探索中の関心や問い", score: (item) => val(item.exploration_level) + (1 - val(item.confidence)) * 0.25 + keywordBoost(item, ["探索", "新しい", "実験", "これから"]) }
  ];

  const cardTypes = [
    { id: "nodes", label: "Nodes" },
    { id: "beliefs", label: "Beliefs" },
    { id: "tensions", label: "Tensions" }
  ];

  let atlas = null;
  let notes = loadNotes();
  let selectedId = "";
  let activeTour = "career";
  let activeCardType = "nodes";
  let searchQuery = "";
  let lastHealth = { ok: false, messages: [] };

  function init() {
    bindNavigation();
    bindImportControls();
    renderTabs();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) loadFromText(saved, "保存済みAtlasを復元しました");
    else renderEmpty();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  }

  function bindNavigation() {
    document.querySelectorAll(".nav-button[data-view]").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });
  }

  function bindImportControls() {
    refs.copyPromptButton?.addEventListener("click", () => copyPrompt());
    refs.parseTextButton?.addEventListener("click", () => loadFromText(refs.atlasTextInput.value, "貼り付け内容を読み込みました"));
    refs.fileInput?.addEventListener("change", readFile);
    refs.loadSampleButton?.addEventListener("click", loadSample);
    refs.exportButton?.addEventListener("click", exportAtlas);
    refs.clearDataButton?.addEventListener("click", clearLocalData);
    refs.copyRepairPromptButton?.addEventListener("click", copyRepairPrompt);
    refs.cardSearchInput?.addEventListener("input", (event) => {
      searchQuery = event.target.value.trim().toLowerCase();
      renderCards();
    });
  }

  function showView(viewName) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
    document.querySelectorAll(".nav-button[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  }

  function renderTabs() {
    refs.tourTabs.innerHTML = "";
    tourDefinitions.forEach((tour) => refs.tourTabs.appendChild(makeTab(tour, activeTour, (id) => {
      activeTour = id;
      renderTabs();
      renderTours();
    })));

    refs.cardTabs.innerHTML = "";
    cardTypes.forEach((type) => refs.cardTabs.appendChild(makeTab(type, activeCardType, (id) => {
      activeCardType = id;
      renderTabs();
      renderCards();
    })));
  }

  function makeTab(item, activeId, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.className = item.id === activeId ? "active" : "";
    button.addEventListener("click", () => onClick(item.id));
    return button;
  }

  async function copyPrompt() {
    const text = refs.promptPreview.value;
    const copied = await copyText(text, refs.promptPreview);
    flashButton(refs.copyPromptButton, copied ? "コピー済み" : "手動コピー", copied ? "コピー" : "コピー");
    refs.copyPromptButton.classList.toggle("copy-failed", !copied);
    setStatus(copied ? "プロンプトをコピーしました" : "本文を選択しました。手動でコピーしてください", copied ? "good" : "warn");
  }

  async function copyRepairPrompt() {
    const repairText = `次のAtlas Bundle JSONにはData Healthの問題があります。診断や断定を避け、JSONとしてパース可能な形に修正してください。\n\n問題:\n${lastHealth.messages.join("\n")}\n\nAtlas JSON:\n${JSON.stringify(atlas, null, 2)}`;
    const copied = await copyText(repairText);
    flashButton(refs.copyRepairPromptButton, copied ? "コピー済み" : "手動コピー", "修正依頼プロンプトをコピー");
  }

  async function copyText(text, sourceElement) {
    if (sourceElement?.select) {
      sourceElement.focus();
      sourceElement.select();
      sourceElement.setSelectionRange?.(0, text.length);
      try {
        if (document.execCommand("copy")) return true;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) { copied = false; }
    textarea.remove();
    return copied;
  }

  function flashButton(button, label, original) {
    if (!button) return;
    button.textContent = label;
    window.setTimeout(() => { button.textContent = original; }, 1400);
  }

  function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadFromText(String(reader.result || ""), `${file.name} を読み込みました`);
    reader.onerror = () => setStatus("ファイルを読めませんでした", "bad");
    reader.readAsText(file);
  }

  async function loadSample() {
    try {
      const response = await fetch("data/sample-atlas.json", { cache: "no-store" });
      if (!response.ok) throw new Error("sample not found");
      const text = await response.text();
      refs.atlasTextInput.value = text;
      loadFromText(text, "サンプルを読み込みました");
    } catch (_) {
      setStatus("サンプルを読み込めませんでした", "bad");
    }
  }

  function loadFromText(text, successMessage) {
    try {
      const parsed = parseAtlasText(text);
      atlas = normalizeAtlas(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(atlas));
      lastHealth = checkHealth(atlas);
      if (!selectedId) selectedId = collectItems()[0]?.id || "";
      renderAll();
      setStatus(successMessage, lastHealth.ok ? "good" : "warn");
      showView("tours");
    } catch (error) {
      setStatus(error.message || "読み込みに失敗しました", "bad");
    }
  }

  function parseAtlasText(text) {
    const source = String(text || "").trim();
    if (!source) throw new Error("AIの返答またはJSONを貼り付けてください");
    const marked = source.match(/===\s*ATLAS_BUNDLE_JSON\s*===([\s\S]*?)===\s*END_ATLAS_BUNDLE_JSON\s*===/i);
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = marked?.[1] || fenced?.[1] || firstJsonObject(source);
    if (!candidate) throw new Error("Atlas JSON部分を見つけられませんでした");
    try {
      return JSON.parse(candidate.trim());
    } catch (error) {
      throw new Error(`JSONとして読めませんでした: ${error.message}`);
    }
  }

  function firstJsonObject(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return "";
    return text.slice(start, end + 1);
  }

  function normalizeAtlas(input) {
    const bundle = input && typeof input === "object" ? input : {};
    bundle.meta = bundle.meta || {};
    bundle.thought_nodes = array(bundle.thought_nodes).map((item) => ({ type: "surface", ...item, kind: "node" }));
    bundle.latent_beliefs = array(bundle.latent_beliefs).map((item) => ({ ...item, kind: "belief" }));
    bundle.tensions = array(bundle.tensions).map((item) => ({ ...item, kind: "tension" }));
    bundle.edges = array(bundle.edges);
    return bundle;
  }

  function checkHealth(bundle) {
    const messages = [];
    const items = collectItems(bundle);
    const ids = new Set();
    items.forEach((item) => {
      if (!item.id) messages.push(`idがないカードがあります: ${item.title || "untitled"}`);
      else if (ids.has(item.id)) messages.push(`idが重複しています: ${item.id}`);
      else ids.add(item.id);
      if (!item.title) messages.push(`${item.id || "unknown"}: title がありません`);
      if (item.kind !== "tension" && array(item.evidence).length === 0) messages.push(`${item.id || item.title}: evidence が空です`);
      if (item.kind !== "tension" && array(item.counter_evidence).length === 0) messages.push(`${item.id || item.title}: counter_evidence が空です`);
    });
    array(bundle.edges).forEach((edge, index) => {
      if (!ids.has(edge.source)) messages.push(`edge[${index}] source が存在しません: ${edge.source}`);
      if (!ids.has(edge.target)) messages.push(`edge[${index}] target が存在しません: ${edge.target}`);
    });
    array(bundle.tensions).forEach((tension) => {
      if (tension.from && !ids.has(tension.from)) messages.push(`${tension.id}: from が存在しません: ${tension.from}`);
      if (tension.to && !ids.has(tension.to)) messages.push(`${tension.id}: to が存在しません: ${tension.to}`);
    });
    const ok = messages.length === 0;
    return { ok, messages };
  }

  function renderAll() {
    renderHealth();
    renderTours();
    renderCards();
    renderDetail();
  }

  function renderEmpty() {
    refs.tourList.innerHTML = `<div class="empty-state">Atlasを読み込むとTourが表示されます。</div>`;
    refs.cardList.innerHTML = `<div class="empty-state">Atlasを読み込むとカードが表示されます。</div>`;
    refs.cardCount.textContent = "0件";
    renderHealth();
    renderDetail();
  }

  function renderHealth() {
    if (!atlas) {
      refs.healthBadge.textContent = "未読み込み";
      refs.healthBadge.className = "status-badge neutral";
      refs.healthSummary.textContent = "Atlas JSONを読み込むとチェック結果が表示されます。";
      refs.healthList.innerHTML = "";
      refs.copyRepairPromptButton.hidden = true;
      return;
    }
    refs.healthBadge.textContent = lastHealth.ok ? "OK" : "要確認";
    refs.healthBadge.className = `status-badge ${lastHealth.ok ? "good" : "warn"}`;
    refs.healthSummary.textContent = lastHealth.ok ? "基本的な参照関係と必須項目は問題なさそうです。" : `${lastHealth.messages.length}件の確認項目があります。`;
    refs.healthList.innerHTML = lastHealth.messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("");
    refs.copyRepairPromptButton.hidden = lastHealth.ok;
  }

  function renderTours() {
    const definition = tourDefinitions.find((tour) => tour.id === activeTour) || tourDefinitions[0];
    const ranked = collectItems().map((item) => ({ item, score: definition.score(item) })).filter((row) => row.score > 0.15).sort((a, b) => b.score - a.score).slice(0, 8);
    if (!ranked.length) {
      refs.tourList.innerHTML = `<div class="empty-state">${escapeHtml(definition.label)} Tourに出せるカードがまだありません。</div>`;
      return;
    }
    refs.tourList.innerHTML = "";
    const intro = document.createElement("div");
    intro.className = "tour-intro detail-muted";
    intro.textContent = definition.text;
    refs.tourList.appendChild(intro);
    ranked.forEach(({ item, score }) => refs.tourList.appendChild(makeCard(item, `${definition.label} score ${score.toFixed(2)}`)));
  }

  function renderCards() {
    const items = itemsForType(activeCardType).filter(matchesSearch);
    refs.cardCount.textContent = `${items.length}件`;
    refs.cardList.innerHTML = "";
    if (!items.length) {
      refs.cardList.innerHTML = `<div class="empty-state">表示できるカードがありません。</div>`;
      return;
    }
    items.forEach((item) => refs.cardList.appendChild(makeCard(item)));
  }

  function makeCard(item, extraMeta = "") {
    const node = refs.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.classList.toggle("selected", item.id === selectedId);
    node.querySelector(".card-kind").textContent = labelForKind(item.kind || inferKind(item));
    node.querySelector(".card-title").textContent = item.title || item.id || "Untitled";
    node.querySelector(".card-summary").textContent = item.summary || item.question || "説明はまだありません。";
    node.querySelector(".card-flags").textContent = flagsFor(item);
    node.querySelector(".card-meta").textContent = extraMeta || metaFor(item);
    node.addEventListener("click", () => {
      selectedId = item.id;
      renderCards();
      renderTours();
      renderDetail();
      showView("detail");
    });
    return node;
  }

  function renderDetail() {
    const item = collectItems().find((entry) => entry.id === selectedId);
    if (!item) {
      refs.detailHint.textContent = "カードを選ぶと詳細が表示されます。";
      refs.detailPanel.className = "detail-panel empty-state";
      refs.detailPanel.innerHTML = `<p>まだカードが選択されていません。</p>`;
      return;
    }
    refs.detailHint.textContent = "これは診断ではなく、編集しながら見直すための仮説です。";
    refs.detailPanel.className = "detail-panel";
    const related = relatedFor(item);
    refs.detailPanel.innerHTML = `
      <span class="card-kind">${escapeHtml(labelForKind(item.kind || inferKind(item)))}</span>
      <h3>${escapeHtml(item.title || item.id)}</h3>
      <p>${escapeHtml(item.summary || item.question || "")}</p>
      ${renderScores(item)}
      ${renderList("Keywords", item.keywords)}
      ${renderList("Evidence", item.evidence)}
      ${renderList("Counter evidence", item.counter_evidence)}
      ${item.interpretation ? `<h4>Interpretation</h4><p>${escapeHtml(item.interpretation)}</p>` : ""}
      ${item.question ? `<h4>Question</h4><p>${escapeHtml(item.question)}</p>` : ""}
      ${related.length ? renderRelated(related) : ""}
      <h4>違和感メモ</h4>
      <textarea id="detailNote" class="paste-input" placeholder="ここに自分の違和感や修正メモを書く">${escapeHtml(notes[item.id] || "")}</textarea>
      <button id="saveNoteButton" class="secondary-button" type="button">メモを保存</button>
    `;
    $("saveNoteButton")?.addEventListener("click", () => {
      notes[item.id] = $("detailNote").value;
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      flashButton($("saveNoteButton"), "保存しました", "メモを保存");
    });
  }

  function renderScores(item) {
    const keys = ["importance", "confidence", "shadow_level", "tension_level", "exploration_level"];
    return `<div class="score-grid">${keys.map((key) => `<div><span>${key.replace("_level", "")}</span><strong>${val(item[key]).toFixed(2)}</strong></div>`).join("")}</div>`;
  }

  function renderList(title, values) {
    const list = array(values);
    if (!list.length) return "";
    return `<h4>${escapeHtml(title)}</h4><ul>${list.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
  }

  function renderRelated(edges) {
    return `<h4>Related</h4><ul>${edges.map((edge) => `<li>${escapeHtml(edge.source)} → ${escapeHtml(edge.target)}: ${escapeHtml(edge.reason || edge.type || "related")}</li>`).join("")}</ul>`;
  }

  function relatedFor(item) {
    return array(atlas?.edges).filter((edge) => edge.source === item.id || edge.target === item.id);
  }

  function exportAtlas() {
    if (!atlas) {
      setStatus("書き出すAtlasがありません", "warn");
      return;
    }
    const blob = new Blob([JSON.stringify(atlas, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thought-atlas.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NOTES_KEY);
    atlas = null;
    notes = {};
    selectedId = "";
    refs.atlasTextInput.value = "";
    setStatus("この端末のAtlasを削除しました", "neutral");
    renderEmpty();
    showView("import");
  }

  function collectItems(source = atlas) {
    if (!source) return [];
    return [...array(source.thought_nodes), ...array(source.latent_beliefs), ...array(source.tensions)];
  }

  function itemsForType(type) {
    if (!atlas) return [];
    if (type === "beliefs") return array(atlas.latent_beliefs);
    if (type === "tensions") return array(atlas.tensions);
    return array(atlas.thought_nodes);
  }

  function matchesSearch(item) {
    if (!searchQuery) return true;
    return [item.id, item.title, item.summary, item.category, ...(array(item.keywords))].join(" ").toLowerCase().includes(searchQuery);
  }

  function metaFor(item) {
    if ((item.kind || inferKind(item)) === "tension") return `strength ${val(item.strength).toFixed(2)} / ${item.status || "active"}`;
    return `importance ${val(item.importance).toFixed(2)} / confidence ${val(item.confidence).toFixed(2)}`;
  }

  function flagsFor(item) {
    const flags = [];
    if (val(item.shadow_level) >= 0.6) flags.push("Shadow");
    if (val(item.tension_level) >= 0.6 || val(item.strength) >= 0.65) flags.push("Tension");
    if (val(item.exploration_level) >= 0.65) flags.push("Emerging");
    return flags.join(" · ");
  }

  function labelForKind(kind) {
    if (kind === "belief") return "Latent belief";
    if (kind === "tension") return "Tension";
    return "Thought node";
  }

  function inferKind(item) {
    if (item.from || item.to || item.strength) return "tension";
    if (item.interpretation) return "belief";
    return "node";
  }

  function keywordBoost(item, keywords) {
    const haystack = [item.title, item.summary, item.category, ...(array(item.keywords))].join(" ");
    return keywords.some((keyword) => haystack.includes(keyword)) ? 0.22 : 0;
  }

  function setStatus(message, tone) {
    if (!refs.parseStatus) return;
    refs.parseStatus.textContent = message;
    refs.parseStatus.className = `status-badge ${tone || "neutral"}`;
  }

  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"); }
    catch (_) { return {}; }
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function val(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  init();
})();
