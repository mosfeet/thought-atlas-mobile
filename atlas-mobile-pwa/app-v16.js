(() => {
  "use strict";

  const STORAGE_KEY = "thought-atlas-mobile:bundle";
  const PROMPT = `あなたは、ユーザー本人が後で見直して編集できる「キャリア探索用の会話文脈の整理カード」を作る補助者です。これは診断・心理プロファイル・性格分類ではありません。

目的
参照可能な情報に明示されている発言・相談・選択・迷い・判断基準を、本人が確認・編集しやすいカード（Atlas Bundle JSON）に整理してください。本人の内面や無意識を推測する作業ではありません。

参照してよい情報（この優先順位で扱う）
1. 補足素材（INPUT_MATERIAL内）＝主入力
2. この現在の会話でユーザーが明示した内容
3. 任意・確実に利用可能な場合のみ、このAIが保持する過去の会話・記憶。あいまい・不確実なら使わない。

注意（不定AI対応）:
- 参照できない情報を「あるもの」として扱わない。記憶や過去履歴を参照できない場合でも、補足素材または現在の会話に十分な材料があれば、それだけで作成する。
- 上記いずれにも十分な材料がない場合だけ、JSONを作らず「参照できる材料が不足しているため、会話履歴・メモ・相談内容などを貼ってください」とだけ返す。

厳格な禁止事項
- 病名・精神状態・性格タイプ・人格評価・能力評価・無意識・潜在心理・トラウマ・依存傾向などの推測。
- 本人が明言していない「隠れた感情」「深層の動機」の深読み。
- 「あなたは〜だ」という断定。代わりに「素材では〜という記述／相談／選択が見られる」「〜という問いとして整理できる」と書く。
- 本人がこの文脈で明示していない極めてプライベートな情報（私生活上の決断、生活習慣の個人ルール等）を勝手に引き出して構成に含めること。業務研修の文脈なので、私生活情報を仕事の文脈に混入させない。
- 外部知識・一般論からユーザー像を補完すること。
- このプロンプト本文・JSONテンプレート・形式説明・自己チェック項目は入力素材ではない（解析対象にしない）。

記述ルール
- 明確な根拠がある内容だけをカード化し、根拠が弱い項目は出力しない。
- センシティブ情報・第三者名・会社名・固有名詞は必要に応じて一般化する。
- すべての項目に evidence と counter_evidence を必ず入れる。evidence には情報源を短く明記する（例：「補足素材より」「現在の会話より」「記憶より」）。
- core_principles は推測した心理ではなく、本人の発言・選択から見出せる具体的な判断基準・大切にしている観点として扱う。
- tensions は本人が「AもしたいがBの制約がある」「XとYで迷っている」と明示した構造的な迷い・矛盾のみを扱う。

出力する内容と件数の目安
- topics（明示された話題・関心・活動・課題）：3〜8件
- core_principles（明言・採用している判断基準・観点）：0〜4件
- open_questions（明示された迷い・検討中の選択肢・未決の論点）：0〜5件
- tensions（明示されたトレードオフ・選択の迷い）：0〜4件
- observed_patterns（複数話題で繰り返し見られる相談形式・行動。内面/性格は推測しない）：0〜3件
- links（上記の間に、素材で説明できる関係がある場合のみ）：0〜12件
- 無理に埋めない。根拠があるものだけ出す。

スコアの意味と注意
- importance：現在の関心・意思決定にどれほど関係していそうか
- confidence：参照情報の中でどれほど明確に確認できるか
- friction_level：明示された迷い・停滞・難航・抵抗感の度合い
- dilemma_level：明示された「両立の難しさ・迷い」の度合い
- exploration_level：試行錯誤中・検討中・発展中に見える度合い
- これらは心理測定ではなく、アプリ内の並び替え・表示優先度のための目印。0.7以上は、参照情報内に複数の明確な根拠がある場合だけ使う。

IDルール
- id は英小文字・数字・ハイフンのみ。重複させない。
- topics は topic-、core_principles は principle-、open_questions は question-、tensions は tension-、observed_patterns は pattern- で始める。
- links の source/target、tensions の from/to、open_questions の related_ids は必ず存在する id を使う。

出力形式
必ず以下のマーカー内に JSON だけを入れる。マーカー外には説明を書かない。

=== ATLAS_BUNDLE_JSON ===
{
  "version": "atlas_bundle_v2_career",
  "meta": {
    "title": "Career Exploration Atlas",
    "note": "編集可能な会話文脈の整理カードであり、診断・心理プロファイルではありません。"
  },
  "topics": [
    {
      "id": "topic-short-id",
      "title": "話題名",
      "summary": "参照情報に明示されている内容を短く整理する。",
      "category": "仕事/学習/生活/身体/関係性/創作/お金/趣味/価値観/その他",
      "importance": 0.0,
      "confidence": 0.0,
      "friction_level": 0.0,
      "dilemma_level": 0.0,
      "exploration_level": 0.0,
      "keywords": ["keyword"],
      "evidence": ["情報源と具体的な根拠"],
      "counter_evidence": ["例外、まだ分からない点、判断を控える理由"]
    }
  ],
  "core_principles": [],
  "observed_patterns": [],
  "open_questions": [],
  "tensions": [],
  "links": []
}
=== END_ATLAS_BUNDLE_JSON ===

最後の自己チェック（JSONを出す前に確認）
- JSONとして正しくパースできるか（引用符は半角 ", 末尾カンマなし）。
- id の重複がないか。links/tensions/related_ids の参照idが実在するか。
- 診断・病名・性格タイプ・能力評価・人格評価・無意識・潜在心理の推測が含まれていないか。
- 本人が明示していない私生活情報を構成に含めていないか。
- evidence と counter_evidence が空になっていないか。evidence に情報源が書かれているか。
- 参照できない情報を使っていないか。断定表現が強すぎないか。

=== INPUT_MATERIAL_START ===
[任意：会話履歴・メモ・相談内容を貼る。研修ではここに本人が意図的に貼った素材を主入力とする。空でもよい]
=== INPUT_MATERIAL_END ===`;

  const state = { atlas: null, cards: [], selected: null, cardFilter: "all", tourFilter: "career", query: "" };
  const $ = (id) => document.getElementById(id);
  const refs = {
    atlasTextInput: $("atlasTextInput"), cardCount: $("cardCount"), cardSearchInput: $("cardSearchInput"), clearDataButton: $("clearDataButton"),
    copyPromptButton: $("copyPromptButton"), copyRepairPromptButton: $("copyRepairPromptButton"), detailHint: $("detailHint"), detailPanel: $("detailPanel"),
    exportButton: $("exportButton"), fileInput: $("fileInput"), healthBadge: $("healthBadge"), healthList: $("healthList"), healthSummary: $("healthSummary"),
    loadSampleButton: $("loadSampleButton"), parseStatus: $("parseStatus"), parseTextButton: $("parseTextButton"), promptPreview: $("promptPreview"),
    tourList: $("tourList"), tourTabs: $("tourTabs"), cardList: $("cardList"), cardTabs: $("cardTabs"), cardTemplate: $("cardTemplate")
  };

  const cardTabs = [{ id: "all", label: "All" }, { id: "node", label: "Topics" }, { id: "belief", label: "Principles" }, { id: "tension", label: "Questions" }];
  const tourTabs = [{ id: "career", label: "Career" }, { id: "shadow", label: "Friction" }, { id: "recurring", label: "Recurring" }, { id: "emerging", label: "Emerging" }];

  document.addEventListener("DOMContentLoaded", init);

  function init() { refs.promptPreview.value = PROMPT; bind(); renderTabs(); restore(); }
  function bind() {
    document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    refs.copyPromptButton.addEventListener("click", copyPrompt);
    refs.parseTextButton.addEventListener("click", () => importText(refs.atlasTextInput.value, "paste"));
    refs.fileInput.addEventListener("change", importFile);
    refs.loadSampleButton.addEventListener("click", loadSample);
    refs.clearDataButton.addEventListener("click", clearData);
    refs.exportButton.addEventListener("click", exportAtlas);
    refs.copyRepairPromptButton.addEventListener("click", copyRepairPrompt);
    refs.cardSearchInput.addEventListener("input", () => { state.query = refs.cardSearchInput.value.trim().toLowerCase(); renderCards(); });
  }

  async function copyPrompt() { const ok = await copyText(PROMPT); if (!ok) { refs.promptPreview.focus(); refs.promptPreview.select(); } flash(refs.copyPromptButton, ok ? "コピー済み" : "手動コピー"); setStatus(ok ? "good" : "warn", ok ? "コピー済み" : "全選択しました"); }
  async function copyText(text) { if (navigator.clipboard && window.isSecureContext) { try { await navigator.clipboard.writeText(text); return true; } catch {} } const area = document.createElement("textarea"); area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.left = "-9999px"; document.body.append(area); area.select(); let ok = false; try { ok = document.execCommand("copy"); } catch { ok = false; } area.remove(); return ok; }
  function flash(button, label) { const original = button.textContent; button.textContent = label; setTimeout(() => { button.textContent = original; }, 1400); }
  function setStatus(kind, text) { refs.parseStatus.className = `status-badge ${kind}`; refs.parseStatus.textContent = text; }

  function importText(text, source) { try { const parsed = extractJson(text); loadAtlas(parsed, source); setStatus("good", "読み込み完了"); } catch (error) { setStatus("warn", "JSONを確認してください"); refs.healthBadge.className = "status-badge warn"; refs.healthBadge.textContent = "Parse error"; refs.healthSummary.textContent = error.message; } }
  async function importFile(event) { const file = event.target.files?.[0]; if (!file) return; importText(await file.text(), file.name); event.target.value = ""; }
  async function loadSample() { try { const response = await fetch("data/sample-atlas.json", { cache: "no-store" }); loadAtlas(await response.json(), "sample-atlas.json"); setStatus("good", "サンプル読込済み"); } catch (error) { setStatus("warn", error.message); } }

  function extractJson(text) {
    const source = String(text || "").trim();
    if (!source) throw new Error("AIの返答またはJSONを貼ってください。");
    const marked = source.match(/=== ATLAS_BUNDLE_JSON ===\s*([\s\S]*?)\s*=== END_ATLAS_BUNDLE_JSON ===/);
    if (marked) return parseJsonLoose(marked[1]);
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return parseJsonLoose(fenced[1]);
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start >= 0 && end > start) return parseJsonLoose(source.slice(start, end + 1));
    throw new Error("JSONオブジェクトが見つかりません。");
  }

  function parseJsonLoose(raw) {
    const text = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("JSONオブジェクトが見つかりません。");
    const jsonText = text.slice(start, end + 1).replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(jsonText); } catch (error) { throw new Error(`JSONの構文を確認してください: ${error.message}`); }
  }

  function normalizeAtlas(input, sourceName) {
    const v2 = input.version === "atlas_bundle_v2_career" || Array.isArray(input.topics);
    const nodes = v2 ? arr(input.topics).map((x) => norm({ ...x, kind: "node", source_type: "topic" })) : arr(input.thought_nodes || input.nodes).map((x) => norm({ ...x, kind: "node" }));
    const beliefs = v2 ? [...arr(input.core_principles).map((x) => norm({ ...x, kind: "belief", source_type: "core_principle", interpretation: x.structural_note || x.interpretation })), ...arr(input.observed_patterns).map((x) => norm({ ...x, kind: "belief", source_type: "observed_pattern", interpretation: x.review_prompt || x.interpretation }))] : arr(input.latent_beliefs || input.beliefs).map((x) => norm({ ...x, kind: "belief" }));
    const openQuestions = arr(input.open_questions).map((x) => norm({ ...x, kind: "tension", source_type: "open_question", from: x.related_ids?.[0], to: x.related_ids?.[1], strength: x.strength ?? Math.max(num(x.dilemma_level), num(x.friction_level)), status: x.status || "active" }));
    const tensions = v2 ? [...openQuestions, ...arr(input.tensions).map((x) => norm({ ...x, kind: "tension" }))] : arr(input.tensions).map((x) => norm({ ...x, kind: "tension" }));
    return { version: input.version || "atlas_bundle_v1", meta: { title: input.meta?.title || input.title || "Imported Atlas", note: input.meta?.note || "This is a hypothesis map, not a diagnosis.", source_name: sourceName, imported_at: new Date().toISOString() }, thought_nodes: nodes, latent_beliefs: beliefs, tensions, edges: v2 ? arr(input.links || input.edges) : arr(input.edges), user_edits: input.user_edits || {} };
  }

  function norm(item) { return { ...item, shadow_level: item.shadow_level ?? item.friction_level ?? 0, tension_level: item.tension_level ?? item.dilemma_level ?? 0, exploration_level: item.exploration_level ?? 0, importance: item.importance ?? 0, confidence: item.confidence ?? 0 }; }
  function arr(value) { return Array.isArray(value) ? value : []; }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function loadAtlas(input, sourceName) { state.atlas = normalizeAtlas(input, sourceName); state.cards = collectCards(state.atlas); state.selected = state.cards[0] || null; localStorage.setItem(STORAGE_KEY, JSON.stringify(state.atlas)); renderHealth(checkHealth(state.atlas)); renderAll(); showView("tours"); }
  function collectCards(atlas) { return [...arr(atlas.thought_nodes).map((x) => ({ ...x, kind: "node" })), ...arr(atlas.latent_beliefs).map((x) => ({ ...x, kind: "belief" })), ...arr(atlas.tensions).map((x) => ({ ...x, kind: "tension" }))]; }
  function checkHealth(atlas) { const messages = []; const ids = new Set(); collectCards(atlas).forEach((item) => { if (!item.id) messages.push("idがないカードがあります。"); if (item.id && ids.has(item.id)) messages.push(`重複id: ${item.id}`); if (item.id) ids.add(item.id); if (!item.title) messages.push(`${item.id || "unknown"} にtitleがありません。`); if (!item.summary) messages.push(`${item.id || item.title || "unknown"} にsummaryがありません。`); if (!arr(item.evidence).length) messages.push(`${item.id || item.title || "unknown"} にevidenceがありません。`); if (!arr(item.counter_evidence).length && item.kind !== "tension") messages.push(`${item.id || item.title || "unknown"} にcounter_evidenceがありません。`); }); arr(atlas.edges).forEach((edge) => { if (!ids.has(edge.source)) messages.push(`edge.source ${edge.source} が存在しません。`); if (!ids.has(edge.target)) messages.push(`edge.target ${edge.target} が存在しません。`); }); arr(atlas.tensions).forEach((tension) => { if (tension.from && !ids.has(tension.from)) messages.push(`tension.from ${tension.from} が存在しません。`); if (tension.to && !ids.has(tension.to)) messages.push(`tension.to ${tension.to} が存在しません。`); }); return messages; }
  function renderHealth(messages) { refs.healthList.innerHTML = ""; refs.copyRepairPromptButton.hidden = !messages.length; refs.healthBadge.className = `status-badge ${messages.length ? "warn" : "good"}`; refs.healthBadge.textContent = messages.length ? `${messages.length}件` : "OK"; refs.healthSummary.textContent = messages.length ? "修正候補があります。" : "基本チェックを通過しました。"; messages.forEach((message) => { const li = document.createElement("li"); li.textContent = message; refs.healthList.append(li); }); }
  function renderTabs() { refs.cardTabs.innerHTML = ""; cardTabs.forEach((tab) => refs.cardTabs.append(tabButton(tab, state.cardFilter, (id) => { state.cardFilter = id; renderTabs(); renderCards(); }))); refs.tourTabs.innerHTML = ""; tourTabs.forEach((tab) => refs.tourTabs.append(tabButton(tab, state.tourFilter, (id) => { state.tourFilter = id; renderTabs(); renderTours(); }))); }
  function tabButton(tab, active, onClick) { const button = document.createElement("button"); button.type = "button"; button.textContent = tab.label; button.className = tab.id === active ? "active" : ""; button.addEventListener("click", () => onClick(tab.id)); return button; }
  function renderAll() { renderTabs(); renderTours(); renderCards(); renderDetail(); }
  function renderTours() { refs.tourList.innerHTML = ""; const items = [...state.cards].sort((a, b) => score(b, state.tourFilter) - score(a, state.tourFilter)).slice(0, 8); if (!items.length) return empty(refs.tourList, "Atlasを読み込むとTourが表示されます。"); items.forEach((item, index) => refs.tourList.append(cardEl(item, `${index + 1} / score ${score(item, state.tourFilter).toFixed(2)}`))); }
  function renderCards() { refs.cardList.innerHTML = ""; let items = state.cards.filter((item) => state.cardFilter === "all" || item.kind === state.cardFilter); if (state.query) items = items.filter((item) => [item.title, item.summary, ...(item.keywords || [])].join(" ").toLowerCase().includes(state.query)); refs.cardCount.textContent = `${items.length}件`; if (!items.length) return empty(refs.cardList, "カードがありません。"); items.forEach((item) => refs.cardList.append(cardEl(item, kindLabel(item.kind)))); }
  function cardEl(item, meta) { const el = refs.cardTemplate.content.firstElementChild.cloneNode(true); el.querySelector(".card-kind").textContent = item.source_type ? `${kindLabel(item.kind)} / ${item.source_type}` : kindLabel(item.kind); el.querySelector(".card-title").textContent = item.title || item.id || "Untitled"; el.querySelector(".card-summary").textContent = item.summary || ""; el.querySelector(".card-flags").textContent = (item.keywords || []).slice(0, 4).join(" / "); el.querySelector(".card-meta").textContent = meta; el.addEventListener("click", () => { state.selected = item; renderDetail(); showView("detail"); }); return el; }
  function renderDetail() { const item = state.selected; if (!item) { refs.detailPanel.className = "detail-panel empty-state"; refs.detailPanel.innerHTML = "<p>まだカードが選択されていません。</p>"; return; } refs.detailPanel.className = "detail-panel"; refs.detailHint.textContent = item.id || ""; refs.detailPanel.innerHTML = `<span class="card-kind">${esc(kindLabel(item.kind))}</span><h3>${esc(item.title || "Untitled")}</h3><p>${esc(item.summary || "")}</p><dl class="score-grid"><div><dt>importance</dt><dd>${fmt(item.importance)}</dd></div><div><dt>confidence</dt><dd>${fmt(item.confidence)}</dd></div><div><dt>friction</dt><dd>${fmt(item.shadow_level)}</dd></div><div><dt>dilemma</dt><dd>${fmt(item.tension_level)}</dd></div><div><dt>explore</dt><dd>${fmt(item.exploration_level)}</dd></div></dl>${list("Evidence", item.evidence)}${list("Counter evidence", item.counter_evidence)}${item.question ? `<h4>Question</h4><p>${esc(item.question)}</p>` : ""}${item.interpretation ? `<h4>Review note</h4><p>${esc(item.interpretation)}</p>` : ""}`; }
  function list(title, items) { return arr(items).length ? `<h4>${esc(title)}</h4><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""; }
  function fmt(value) { return num(value).toFixed(2); }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function kindLabel(kind) { return kind === "node" ? "Topic" : kind === "belief" ? "Principle" : "Question"; }
  function score(item, mode) { if (mode === "shadow") return num(item.shadow_level) * 0.6 + num(item.tension_level) * 0.2 + num(item.importance) * 0.2; if (mode === "recurring") return num(item.importance) * 0.45 + num(item.confidence) * 0.45 + num(item.tension_level) * 0.1; if (mode === "emerging") return num(item.exploration_level) * 0.55 + (1 - num(item.confidence)) * 0.2 + num(item.importance) * 0.25; return num(item.importance) * 0.45 + num(item.exploration_level) * 0.3 + num(item.tension_level) * 0.25; }
  function empty(root, text) { const p = document.createElement("p"); p.className = "empty-state"; p.textContent = text; root.append(p); }
  function showView(id) { document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${id}`)); document.querySelectorAll(".nav-button").forEach((b) => b.classList.toggle("active", b.dataset.view === id)); }
  function restore() { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { try { loadAtlas(JSON.parse(saved), "local-storage"); } catch { localStorage.removeItem(STORAGE_KEY); } } else { renderAll(); } }
  function clearData() { localStorage.removeItem(STORAGE_KEY); state.atlas = null; state.cards = []; state.selected = null; refs.atlasTextInput.value = ""; renderHealth([]); renderAll(); setStatus("neutral", "削除済み"); }
  function exportAtlas() { if (!state.atlas) return; const blob = new Blob([JSON.stringify(state.atlas, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "thought-atlas.json"; a.click(); URL.revokeObjectURL(a.href); }
  async function copyRepairPrompt() { await copyText(`Atlas JSONを修正してください。v2なら topics, core_principles, observed_patterns, open_questions, tensions, links を配列にし、参照idを実在idに揃えてください。`); flash(refs.copyRepairPromptButton, "コピー済み"); }
})();