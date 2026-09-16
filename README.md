最新の調整は [設定6の機械割114%への調整127](docs/s6-127-report.md) を参照してください。設定6だけ通常時の初当たりを軽くし、3,000台・最大30,000Gで検証。設定1～5とAT中の性能は維持しています。

ATの共通仕様は [AT開始時の枠抽選・平均約500ptへの調整126](docs/start126-report.md) を参照してください。AT開始時に150／500／1,000／2,000ptを抽選し、途中の上乗せは別枠で加算します。ATレベル・直接pt報酬チャレンジは廃止したまま、裏ゾーン獲得チャレンジと5G引き戻しは継続。BIG50pt・追加SET150pt。以前の [共通AT125](docs/common125-report.md)、[ATレベル111](docs/at111-report.md) は旧仕様の記録です。

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
