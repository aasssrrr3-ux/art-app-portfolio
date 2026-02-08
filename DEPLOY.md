# デプロイ手順 (Updating the Production Site)

変更を本番環境（Vercelなど）に反映させるための手順です。

## 手順

ターミナルで以下のコマンドを順番に実行してください。

1. **変更をステージング（記録準備）**
   ```bash
   git add .
   ```

2. **変更をコミット（記録）**
   ※ メッセージは変更内容に合わせて書き換えてください
   ```bash
   git commit -m "Update loading logic and fix CSS warning"
   ```

3. **リモートリポジトリへプッシュ（送信）**
   ※ これによりVercelなどが自動的に検知してデプロイを開始します
   ```bash
   git push
   ```

## もしエラーが出た場合

- `git push` でエラーが出る場合は、リモートの状態を確認してください。
- Vercel CLI を使用している場合は、以下のコマンドで手動デプロイも可能です：
  ```bash
  vercel --prod
  ```
