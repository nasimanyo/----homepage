# 🏠 あつまり - 幼馴染予定管理アプリ

## 📋 機能一覧

| 機能 | 内容 |
|------|------|
| 🏠 ホーム | 最新情報フィード（リアルタイム更新） |
| 📅 予定合わせ | 候補日投票（○△✕方式） |
| 📌 情報 | メモ・行き先・リンク共有 |
| 👤 マイページ | プロフィール・ログアウト |
| 🛡 管理者パネル | 予定合わせ作成・お知らせ投稿（なしまん専用） |

---

## 🚀 セットアップ手順

### 1. Supabase プロジェクト作成

1. https://supabase.com でプロジェクトを新規作成
2. SQL Editor を開き、`supabase_schema.sql` の内容を全て貼り付けて実行
3. Settings > API から `Project URL` と `anon public` key をコピー

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
# .env.local を編集して Supabase の URL と KEY を入力
```

### 3. ローカルで動作確認

```bash
npm install
npm run dev
```

### 4. 管理者設定（重要）

アカウント登録後、Supabase SQL Editor で実行：

```sql
UPDATE profiles SET is_admin = true WHERE display_name = 'なしまん';
```

### 5. Vercel にデプロイ

```bash
npm install -g vercel
vercel
```

または GitHub に push して Vercel と連携し、環境変数（SUPABASE_URL, SUPABASE_ANON_KEY）を設定。

---

## ❓ よくある問題

- **メール認証で詰まる**: Supabase > Authentication > Settings で "Enable Email Confirmations" をオフに
- **管理者パネルが出ない**: profiles テーブルで is_admin = true か確認
- **リアルタイムが動かない**: Supabase > Database > Replication で announcements / votes / polls を有効化
