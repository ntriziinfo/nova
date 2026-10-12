# 宗介の開始・上乗せボイス（2026-10-12）

| 提供音源 | 再生タイミング | ゲーム内ファイル |
|---|---|---|
| スーパーノヴァチャレンジ.wav | 上位チャレンジの実際の1G目BET。HOLDで10Gのままでも繰り返さない | `assets/media/nova/sosuke-upper-challenge-entry.wav` |
| 引き戻しチャレンジ.wav | 引き戻し5Gの1G目BET。直前ゲームの第三停止では再生しない | `assets/media/nova/sosuke-comeback-entry.wav` |
| スーパーノヴァラッシュ突入.wav | 上位チャレンジ成功ゲームの第三停止で上位ATへ切り替わる時 | `assets/media/nova/sosuke-upper-at-entry.wav` |
| 上乗せ.wav | BIG中、AT権獲得済みのネビュラ揃いで特化ストックを獲得した時 | `assets/media/nova/sosuke-bonus-stock.wav` |

通常の初当たりBIGは1回目のネビュラ揃いで従来のノヴァラッシュ確定BGM＋SEを再生し、2回目以降が「上乗せ」になる。既にAT権を保証しているBIGやAT中BIGは、最初のネビュラから追加ストックの「上乗せ」。逆押しに失敗して揃わなかった場合は再生しない。特化ゾーンのネビュラ揃いは既存の再生を維持する。

全4本はボイスカテゴリへ登録し、共通のボイス音量・マスター音量・ミュートを適用する。原本は変更せず配信用コピーを約−14 LUFSに合わせた。真のピークは−3.01 dBTP以下。再生は1回のみ。既存152音源の原本・配信用データ・計測記録を変更していない。原本の対応とSHA-256は `assets/media/nova/sosuke-event-voices.sources.json`、配信用データの計測は `audio-normalization.json` を参照。

抽選モデル、乱数消費、払い出し、上乗せpt、ストック、ゲーム進行の変更はない。開始ボイスの再生済みフラグは未精算スピンの保存対象に含める。

検証：対象82テスト、HTML/JS・アセット・Vercel設定チェックが成功。無音ブラウザのPC・スマホ画面で、開始BET、上位成功の第三停止、BIGのネビュラ1・2・3回目、押し順失敗を確認済み。検証スクリプトと結果は `research/sosuke-events-20261012/`。
