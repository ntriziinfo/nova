最新の調整は [小役CZ抽選とまとまったAT払い出し128](docs/role128-report.md) を参照してください。通常モード・規定GのCZ抽選を撤廃し、レア小役によるCZ抽選と共通800G天井に変更。設定1～5は各1,000台、設定6は3,000台、最大30,000G・累計差枚＋10,000ptで停止して検証。設定6の機械割は113.85%、累計＋10,000pt到達率は30.97%です。

AT開始時に500／750／1,000ptを25%／50%／25%で抽選し、途中の上乗せは別枠で加算します。平均総払い出しは約1,111～1,154pt。ATレベル・直接pt報酬チャレンジは廃止したまま、裏ゾーン獲得チャレンジと5G引き戻しは継続。BIG50pt・追加SET150pt。以前の [平均約500ptへの調整126](docs/start126-report.md)、[設定6調整127](docs/s6-127-report.md)、[共通AT125](docs/common125-report.md)、[ATレベル111](docs/at111-report.md) は旧仕様の記録です。

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
