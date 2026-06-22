# Thought Atlas Mobile PWA

AI生成済みのAtlas JSONを読み込み、スマホでTourとカードとして読むための最小プロトタイプです。

このプロトタイプは診断アプリではありません。入力されたJSONを、ユーザーが見直せる「仮説の地図」として表示します。アプリ内にAI解析エンジンは持たず、データはブラウザのLocalStorageに保存します。

## MVP Scope

- 規定プロンプトのコピー
- ChatGPT / Claude / Gemini などのAI返答をコピペして読み込み
- AI出力テキストからAtlas JSONを抽出
- Atlas Bundle JSONファイルの補助インポート
- Data Healthの簡易チェック
- Data Health指摘から修正依頼プロンプトをコピー
- Career / Shadow / Recurring / Emerging Tour
- Node / Belief / Tension カード一覧
- カード検索
- 詳細表示
- 表示名、違和感メモ、違和感フラグ、非表示フラグ
- LocalStorage保存
- ローカル保存データの削除
- Atlas JSONエクスポート
- PWA manifest / service worker

## Atlas Bundle JSON

推奨導線はコピペです。

1. アプリ内のプロンプトをコピーする
2. ChatGPT / Claude / Gemini などへ貼る
3. ユーザーの会話履歴、メモ、日記などをプロンプト末尾に足す
4. AIの返答全文をImport画面へ貼り付ける
5. アプリがAtlas JSON部分を抽出して読み込む

アプリは以下のマーカー内のJSON、JSONコードフェンス、または本文中の最初のJSONオブジェクトを抽出します。

```text
=== ATLAS_BUNDLE_JSON ===
{ ... }
=== END_ATLAS_BUNDLE_JSON ===
```

ファイルとして扱う場合の推奨形式は1ファイルです。

Data Healthで問題が出た場合は、Import画面の「修正依頼プロンプトをコピー」を使い、同じAIに修正を依頼できます。

## Privacy

- このPWA自体はAI解析を行いません。
- 貼り付けたAI返答、Atlas JSON、編集メモを外部サーバーへ送信しません。
- 外部CDN、分析タグ、広告タグは使っていません。
- 読み込んだAtlasと編集内容は、同じブラウザのLocalStorageに保存されます。
- Import画面の「この端末のAtlasを削除」でLocalStorage上のAtlasを削除できます。
- ユーザーがChatGPT / Claude / Geminiなどへ素材を貼る部分は、そのAIサービスの利用規約・データ設定に従います。

```json
{
  "version": "atlas_bundle_v1",
  "meta": {
    "title": "My Thought Atlas",
    "note": "This is a hypothesis map, not a diagnosis."
  },
  "thought_nodes": [],
  "latent_beliefs": [],
  "tensions": [],
  "edges": []
}
```

既存の4JSONを使う場合は、上記の4配列へまとめてから読み込ませます。

## Run

静的ファイルなので、ローカルサーバーで起動します。

```bash
python3 -m http.server 5174 --bind 127.0.0.1 --directory atlas-mobile-pwa
```

その後、以下を開きます。

```text
http://127.0.0.1:5174/index.html
```

## Smoke Test

```bash
/Users/sugimotomasaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node atlas-mobile-pwa/scripts/smoke-test.mjs
```
