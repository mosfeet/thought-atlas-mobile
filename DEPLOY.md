# Thought Atlas Mobile を友人のスマホで使ってもらう手順

このアプリは静的PWAです。サーバー側でAI解析や保存は行いません。

## 推奨: GitHub Pages

1. GitHubで新しいリポジトリを作る
   - 例: `thought-atlas-mobile`
   - PublicでもPrivateでも可

2. このローカルリポジトリにremoteを追加する

```bash
git remote add origin https://github.com/YOUR_NAME/thought-atlas-mobile.git
```

3. アプリ本体だけをcommitしてpushする

```bash
git add .gitignore DEPLOY.md atlas-mobile-pwa
git commit -m "Add Thought Atlas Mobile PWA"
git push -u origin main
```

4. GitHubのリポジトリ画面でPagesを有効化する
   - Settings
   - Pages
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`

5. 数分後に以下のURLで開けます

```text
https://YOUR_NAME.github.io/thought-atlas-mobile/atlas-mobile-pwa/
```

友人にはこのURLを送ってください。

## 友人への説明文

このURLを開いて、以下の順で使ってください。

1. `コピー` を押してプロンプトをコピー
2. 自分のChatGPT / Claude / Geminiに貼る
3. プロンプト末尾に、自分のメモや会話履歴を貼る
4. AIの返答全文をアプリに貼る
5. `貼り付け内容を読み込む` を押す
6. Tour / Cardsを見る
7. 終わったら必要に応じて `この端末のAtlasを削除`

## Privacy

- このPWA自体はAI解析を行いません。
- 貼り付けたAI返答、Atlas JSON、編集メモを外部サーバーへ送信しません。
- 外部CDN、分析タグ、広告タグは使っていません。
- 読み込んだAtlasと編集内容は、同じブラウザのLocalStorageに保存されます。
- ユーザーがChatGPT / Claude / Geminiなどへ素材を貼る部分は、そのAIサービスの利用規約・データ設定に従います。
