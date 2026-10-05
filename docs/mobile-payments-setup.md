# スマホ版300円買い切り課金の設定

対象: 9board/9board.github.io。PC無料版は変更しません。Firebaseプロジェクトは既存ログインと同じ `board-53117`、Functionsのリージョンは `asia-northeast1` です。

## 反映順序

**Firebase・Webhookを先に設定し、テストした後でGitHubの変更をmainへマージしてください。** API未配置のままフロントを公開すると、スマホ版は購入確認エラーで閉じた状態になります。mainへのマージ前に下記をすべて完了してください。

1. Firebase Consoleで `board-53117` を選び、Cloud Functionsを利用できるBlazeプランへ変更します。Firestore Databaseが未作成なら作成します。既存のデータベースがあればそのまま使用してください。Functionsの利用料はStripeの決済手数料とは別です。
2. Authentication → Sign-in methodでGoogleが有効であること、Settings → Authorized domainsに `9board.jp` があることを確認します。所有者のGoogleアカウントで既存スマホ版に一度ログインし、Authentication → Users → そのユーザーのUIDをコピーします。メールアドレスではなくUIDを使います。
3. Firestoreの既存Rulesを保存し、`functions/firestore.rules.example` を参考に `mobileEntitlements`、`mobileCheckoutAttempts`、`mobilePaymentReceipts` を**クライアントから読み書き不可**にします。既存機能のルールは残してください。広い `{document=**}` の許可があると個別のdenyは無効なので、許可を既存の必要なコレクションだけに限定してください。Rules Playgroundで未ログイン・一般ユーザー・所有者すべてのクライアント書き込みが拒否されることを確認してください。Admin SDKはRulesを介さず保存できます。ルールは自動上書きしない構成です。
4. このPRのブランチを取得し、リポジトリ直下のターミナルで以下を実行します。Node.js 22とFirebase CLIが必要です。

```sh
npm install -g firebase-tools
firebase login
npm ci --prefix functions
npm test --prefix functions
firebase functions:secrets:set STRIPE_SECRET_KEY --project board-53117
firebase functions:secrets:set MOBILE_OWNER_UID --project board-53117
```

`STRIPE_SECRET_KEY`にはStripeの本番Secret key（`sk_live_...`）を対話入力します。Price ID `price_1UNAmf7o8soUSFOdilOYF1nd` と同じStripeアカウント・モードを使用してください。`MOBILE_OWNER_UID`には手順2のUIDを入力します。所有者免除を無効にする場合は実在しない値 `disabled` を設定します。UIDはサーバーのSecret Managerだけに保存されます。Firebaseのサービスアカウント鍵は不要です。Functionsは実行環境の資格情報を使用します。

5. Stripe Dashboard → Developers / Workbench → Webhooks → Add destinationで以下を登録します。

   - 種類: Webhook endpoint、対象: Your account（Connectアカウントではありません）
   - URL: `https://asia-northeast1-board-53117.cloudfunctions.net/mobileStripeWebhook`
   - イベント: `checkout.session.completed` と `checkout.session.async_payment_succeeded`

   保存後、そのエンドポイントのSigning secret（`whsec_...`）を表示し、以下のコマンドへ対話入力します。Stripe CLIのSecretとDashboardの本番Secretは別物です。

```sh
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project board-53117
firebase deploy --only functions:mobile-payments --project board-53117
```

6. デプロイ結果のURLが上記と一致することを確認します。別URLになった場合は `Billiards_layout_mobile/plus-services.js` の `apiBase` とStripe登録URLを合わせてください。公開HTTP関数ですが、購入APIはFirebase ID tokenを検証し、WebhookはStripe署名を検証します。

7. GitHubのPRをmainにマージします。既存のGitHub Pages公開方式で反映されます。GitHub Secretsの追加はこの手動デプロイ方式では不要です。Stripe/Firebaseの秘密鍵をHTML、JavaScript、リポジトリ、PRコメントに貼らないでください。

## テスト

本番PriceはStripeテストモードで使えません。まず独立した検証用FirebaseプロジェクトとStripeテストモードで300円JPY・買い切りのPriceを作り、Functionsの `.env.<検証プロジェクトID>` に `MOBILE_PRICE_ID=price_テスト用ID` を設定します。このファイルはGit対象外です。検証用フロントのFirebase設定・apiBaseとサーバーのorigin/mobileUrlも検証用HTTPSサイトに合わせ、本番データを使わずテストします。本番公開サイトへテストSecret keyを設定しないでください。

- 未ログイン: Googleログインだけが表示され、スマホ機能を操作できない。
- 一般ユーザー: 未購入なら300円購入を表示。キャンセルして戻ると閉じたまま。
- `?payment=success` を手入力: 購入権限は付かず、確認待ちになる。
- Stripeテストカード `4242 4242 4242 4242`（将来の有効期限・任意のCVC）: Webhook受信後に利用可能。Firestoreの `mobileEntitlements/<UID>` に `purchased: true` がある。
- Webhookを一時停止して購入: 成功ページに戻っても閉じたまま。Webhookを再送すると解放。
- 同じイベントを再送: 購入日時とレシートが重複しない。Firestore障害時はHTTP 500でStripeに再送を要求。
- ログアウト後、同じGoogleアカウントで再ログイン: 再購入せず利用可能。別アカウントは購入画面。
- 所有者UID: 購入せず解放。それ以外のUIDは免除されない。
- 複数タブから同時購入: 同一UIDのCheckout作成をStripeのidempotency keyで共通化。
- PC無料版の配置・スコア・対戦記録が従来通り使える。

最後に本番で一般アカウントの300円決済を1回行い、StripeのWebhook配信がHTTP 200であること、再ログインで復元されることを確認してください。本番決済は実課金です。

## 運用上の範囲

購入権限はFirebase UIDに紐づきます。アカウント削除・作り直しでUIDが変わると権限は引き継がれません。返金時の自動権限取消はこの実装には含みません。必要な場合は返金処理に合わせ、管理者がFirestoreの該当UIDの `purchased` をfalseへ変更します。Stripeの支払履歴とUIDを確認してから実施してください。

スマホ版は現在GitHub Pages上の公開HTML/JavaScriptで、データ保存も既存通り端末内です。この実装は購入権限の偽造をサーバー側で防ぎ、通常の画面利用を制限しますが、公開されたアプリコードをコピー・改変したオフライン利用まで防止できません。それも防ぐ場合はアプリ本体の認証付き配信と機能・データ処理のサーバー移管が必要です。既存の「クラウド保存・端末間同期・Android共有」は引き続き接続準備中で、この課金追加で新たに実装するものではありません。

Secret更新後はFunctionsを再デプロイします。Webhookの失敗はStripeの配信履歴とFirebase Functionsログで確認できます。デプロイに失敗した場合はフロントをマージせず、既存版を保ってください。

参考: [FirebaseのSecret設定](https://firebase.google.com/docs/functions/config-env)、[Stripeの決済完了検証](https://docs.stripe.com/checkout/fulfillment)、[Stripe署名検証](https://docs.stripe.com/webhooks/signature)。
