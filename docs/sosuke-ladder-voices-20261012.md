# 宗介ゾーンの抽選BETボイス（2026-10-12）

宗介ゾーンの初期額表示後、各段階の通過を抽選するゲームのBETで1本だけ再生する。

| 提供音源 | 通過時 | 非通過時 | ゲーム内ファイル |
|---|---:|---:|---|
| この世すべての不利益は.wav | 15% | 0% | `assets/media/nova/sosuke-ladder-pass-injustice.wav` |
| あつ.wav | 15% | 0% | `assets/media/nova/sosuke-ladder-pass-hot.wav` |
| 愛を知ると.wav | 70%の1/3 | 1/3 | `assets/media/nova/sosuke-ladder-bet-love.wav` |
| 気合で.wav | 70%の1/3 | 1/3 | `assets/media/nova/sosuke-ladder-bet-spirit.wav` |
| しまって.wav | 70%の1/3 | 1/3 | `assets/media/nova/sosuke-ladder-bet-shimatte.wav` |

通過は抽選済みの `ladderIndex` の増加で判定する。50→50ptや500→500ptの段階も通過として扱い、最終段階の成功も対象。初期額表示、ルーレット、初期pt決定、ボーナス、リザルトの回転は対象外。ギルの既存ボイス配分は変更しない。

ボイス選択は `crypto.getRandomValues` による演出専用乱数。`Math.random`、通過率、抽選済みの役・獲得pt・ストックを変更しない。再生済みフラグをスピンの `resolved` に保持し、再呼び出しや保存復元で重複再生しない。デバッグ一括試算とSPEED消化は既存ボイスと同じく省略する。

全5本をボイスカテゴリに登録し、共通音量・マスター・ミュートを適用。原本は保存してSHA-256で照合し、ローカルの配信用コピーのみ約−14 LUFSに統一。実測−14.09〜−14.00 LUFS、ピーク−1.99 dBTP以下。元の長さを維持し、既存157音源の原本・配信用データ・計測値は不変。

原本対応：`assets/media/nova/sosuke-ladder-voices.sources.json`。計測記録：`audio-normalization.json`。

検証：関連20テスト成功。通過・非通過各3,000個の等間隔乱数で配分を確認し、同額段階・最終段階・保存復元・ゲーム乱数不使用も検証。HTML/JS・アセット・Vercel設定チェック成功。無音ブラウザで全5音源・同額通過・スマホ非通過・AUTOの8条件を確認。記録：`research/sosuke-ladder-voice-20261012/`。
