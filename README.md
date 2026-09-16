最新仕様は [共通AT・30,000G試算125](docs/common125-report.md) を参照してください。ATレベルと直接pt報酬チャレンジを廃止し、裏ゾーン獲得チャレンジを継続しています。BIG50pt・AT初期300pt。以前の [ATレベル5段階111](docs/at111-report.md) と [払い出しpt管理](PAYOUT-MANAGEMENT.md) は旧仕様の記録です。通常モードは [モード・前兆109](docs/modes109-report.md) を基礎に、最新レポートの補正を適用しています。

# NOVA

このリポジトリは、RISINGを土台にしたNOVAゲーム本体とアセットのみを公開します。

店舗管理、台選択、プレイセッション、収益記録は独立した
[VERTEX](https://github.com/ntriziinfo/vertex) が担当します。

- ゲーム本体: `jag.html`
- 独自仕様: ボーナス後に抽選される32GのRISINGモード
- 管理画面: `https://vertex-inky-ten.vercel.app/admin.html`
- 台選択: `https://vertex-inky-ten.vercel.app/machines.html`
- プレイ入口: `https://vertex-inky-ten.vercel.app/play.html`

`admin.html`、`machines.html`、`play.html` へのアクセスはVercel設定で
VERTEXへ恒久転送されます。旧管理APIと旧管理サーバーは含みません。
