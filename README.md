# NOVA

NOVAのゲーム本体とアセットを配信する静的サイト。

- 公開版: https://nova-eta-jet-30.vercel.app/jag.html
- 現行の抽選調整: [v173の変更内容・試算条件・設定別参考値](docs/fine-balance173-report.md)
- コードの構成と整理の検証: [コード整理記録](docs/code-organization.md)
- 変更前の確認事項: [AGENTS.md](AGENTS.md)

機械割に影響する変更は、変更内容と影響を提示し、ユーザーの確認後に適用する。
`docs/`には過去の試案・廃止仕様・当時の試算も残っている。古い文書の数値を現行設定と混同しない。

## 構成

| ファイル | 役割 |
|---|---|
| `jag.html` | 画面のHTML、依存スクリプトの読み込み順 |
| `nova-game.css` | HTMLから分離した画面の基本スタイル |
| `nova-game.js` | BET・停止・AUTO、保存、表示と音声の接続 |
| `nova-tuning.js` | 承認済みの設定別パラメータ |
| `nova-normal.js` / `nova-flow.js` | 通常時の抽選・前兆、CZの進行 |
| `nova-art.js` | AT・特化・初期pt・引き戻し等の抽選と状態 |
| `nova-progress.js` | 出陣予約・累計差枚チェックポイントの進行 |
| `nova-decrement.js` / `nova-balance.js` | 減算区間・既存の調整処理 |
| `nova-audio.js` / `nova-rush-confirm.js` | 音声再生基盤・確定音のタイミング |
| `nova-*-presentation.js` / `nova-initial-duo.js` / `nova-direct-award.js` | 各演出の表示 |
| `nova-bell-navi.js` / `nova-reel-motion.js` / `nova-clock.js` | 押し順表示・リール動作・バックグラウンド用タイマー |
| `nova-artwork.js` / `nova-cabinet.css` / `nova-mobile.*` | ランプ、筐体、スマホ向け表示・操作 |
| `nova-audit.js` / `nova-audit-ui.js` | 遊技の記録と閲覧 |

`nova-game.js`は従来と同じ位置で、同期スクリプトとして1回読み込む。
初期化順に依存するため、安易に`async`・`defer`・ES Modulesへ変更しない。
CSSの読み込み順も維持する。キャラランプの保存位置や音量設定をリセットしない。

## 検証

Node.js 20以上。基本チェックには外部パッケージ不要。

```sh
node scripts/check.mjs
node scripts/validate-config.mjs
node --test tests/*.test.mjs
```

`check`はHTML内・外部JSの構文、JS/CSSの参照先、ページ関数の重複、起動スクリプトの順序を確認する。
古い検査条件は整理済みで、残っていたBUG-001〜003も2026-10-01に修正。
[検査の説明](tests/README.md)と[今回の修正・検証記録](docs/bugfix-20261001.md)を参照する。

ソースを検査するテスト・音声整備ツールでは`readGameSource()`（`scripts/game-source.mjs`）を使う。
分離したCSS・JSを元の位置に展開する開発用ヘルパーで、ブラウザでは使わない。

## 管理アプリと配信

店舗管理、台選択、プレイセッション、収益記録は独立した[VERTEX](https://github.com/ntriziinfo/vertex)が担当する。
このリポジトリの`admin.html`・`machines.html`・`play.html`は`vercel.json`でVERTEXへ転送する。

Vercelは既存プロジェクトの静的ルートを配信し、`main`へのpushで公開版を更新する。
`research/`の試算を実装済みと見なさず、調整コードと承認済みの検証記録を確認する。
