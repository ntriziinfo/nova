最新の抽選変更は [引き戻し5G・全設定20%（v141）](docs/comeback141.md)。ベル・リプレイ・ハズレも毎G抽選し、レア役復活100%を含めた5G合計の復活率を全設定20%に統一しました。変更後の機械割は未再集計です。

表示変更は [直乗せリール全面表示133](docs/direct-award133.md)。直乗せの第三停止で獲得ptの透過画像をリール全面に表示し、次のBETで消去します。

[ATベル押し順ナビ132](docs/bell-navi132.md) は、黄色のランダム押し順ナビ・AUTO連動・画面左下「ナビ調整」に対応しています。

[AT初期pt獲得ゾーン131](docs/initial131-report.md) では、ATを獲得したBIG終了後は、準備3G→777揃い→キャラルーレット→初期pt獲得ゾーン5G→ATの順で進行します。

初期ptは300〜1,200ptを50pt刻みで内部抽選し、750ptを中心とする対称分布（平均750pt）です。初期ゾーンでは決定済みの額だけを演出で獲得します。AT中の通常上乗せは別枠です。ATレベル・直接pt報酬チャレンジは廃止したまま、裏ゾーン獲得チャレンジと5G引き戻しは継続。BIG50pt・追加SET150pt。

[小役CZ抽選128](docs/role128-report.md) の機械割・到達率は今回の待機・初期ゾーン導入前の参考値です。初期ptの平均維持だけでは機械割の維持を保証しません。今回、進行検証は全設定各30,000Gで実施しましたが、新仕様の機械割の推定や再調整は行っていません。

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
