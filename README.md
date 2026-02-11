# 美容サロン予約管理チャットボット

Google Sheetsと連動した階層型チャットボットシステム

## 📋 必要なファイル

このフォルダには以下のファイルが含まれています：

- `hierarchical-chatbot.jsx` - チャットボット本体
- `.gitignore` - Gitで無視するファイルのリスト
- `.env.example` - 環境変数のテンプレート
- `README.md` - このファイル
- `SETUP_GUIDE.md` - 詳細なセットアップガイド

## 🚀 クイックスタート

### 1. `.env` ファイルを作成

`.env.example` をコピーして `.env` にリネーム：

```bash
# Macの場合
cp .env.example .env

# Windowsの場合
copy .env.example .env
```

または、手動で：
1. `.env.example` を開く
2. 「名前を付けて保存」→ `.env` として保存
3. `YOUR_GOOGLE_API_KEY_HERE` を実際のAPIキーに置き換え

### 2. APIキーを設定

`.env` ファイルを開いて編集：

```env
REACT_APP_GOOGLE_API_KEY=あなたの実際のAPIキー
REACT_APP_SPREADSHEET_ID=1Wl0Za3-lkHX7bkO4T7VeVf3-qRw_SUQJnFUUjlDazmQ
```

### 3. 依存関係をインストール

```bash
npm install react react-dom
```

### 4. 開発サーバーを起動

```bash
npm start
```

ブラウザで `http://localhost:3000` を開く

## 📁 プロジェクト構成

```
salon-chatbot/
├── hierarchical-chatbot.jsx  # チャットボット本体
├── .env                       # 環境変数（作成が必要）
├── .env.example              # 環境変数テンプレート
├── .gitignore                # Git除外設定
├── package.json              # npm設定（作成が必要）
└── README.md                 # このファイル
```

## 🔐 セキュリティ

### 重要な注意事項

- ✅ `.env` ファイルは絶対にGitHubにアップしない
- ✅ `.gitignore` に `.env` が含まれていることを確認
- ✅ APIキーは環境変数で管理

### コミット前の確認

```bash
# .env が含まれていないことを確認
git status

# .env が表示されたらNG！
# .gitignore を確認してください
```

## 📊 スプレッドシート構造

スプレッドシートは以下の階層構造：

```
A列（レベル0）: A, B, C, D
  ↓
B列（レベル1）: 1, 2, 3, 4
  ↓
C列（レベル2）: ①, ②, ③
  ↓
D列（レベル3）: I, II, III
```

列が増えても自動対応！

## 🎯 機能

- ✅ Google Sheetsから階層データ自動読み込み
- ✅ 無限階層に対応
- ✅ パンくずリスト表示
- ✅ 緊急対応フォーム
- ✅ チケット管理（緊急/一般）
- ✅ レスポンシブデザイン

## 🔧 トラブルシューティング

### APIキーエラー

```
Error: The caller does not have permission
```

→ スプレッドシートを「リンクを知っている全員」に公開してください

### データが読み込めない

```
Error: API key not valid
```

→ HTTPリファラー設定を確認してください
→ 開発時は `http://localhost:3000/*` を追加

### .env が git status に表示される

```bash
# .gitignore を確認
cat .gitignore

# .env が含まれていなければ追加
echo ".env" >> .gitignore
```

## 📚 詳細ドキュメント

- `SETUP_GUIDE.md` - 詳細なセットアップ手順
- `API_KEY_GUIDE.md` - APIキー作成ガイド
- `GITHUB_HISTORY_CLEANUP.md` - Git履歴クリーンアップ

## ❓ サポート

問題が発生した場合：

1. `SETUP_GUIDE.md` を確認
2. ブラウザのコンソールでエラーを確認
3. `.env` ファイルの設定を確認

## 📝 ライセンス

このプロジェクトは自由に使用・改変できます。
