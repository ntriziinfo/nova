# 可逆圧縮による本番配信

本番ビルドは従来どおり `prepare-deploy.mjs` で正本素材を検証・復元してから、`build-lossless-static.mjs` で Vercel Build Output API の静的出力を生成する。Git上の正本素材、ゲームJS、抽選、乱数、払い出し、演出タイマーは変更しない。

WAVはFLACへ変換し、復号後のPCM SHA256が一致して小さくなる場合だけ採用する。PNGはWebPのlossless/exact/metadata-allで透明画素と色プロファイルを保持し、復号後RGBA SHA256が一致して小さくなる場合だけ採用する。動画・既存MP3・既存WebPは変換しない。復号データが一致しなかった出陣報酬音と、Windows Chromeのシーク後終了確認で相性が出た長尺プレミアムBGMは元WAVを維持する。

静的出力のURLとファイル名は従来のまま。`.vercel/output/config.json` のcontentType overrideだけで圧縮された内容のMIMEを指定する。既存セーブのorigin・キー、管理画面への転送、ゲームへの別名ルート、RTPのCORS/no-storeも維持する。実行時の変換処理や追加Functionsはない。

正本に欠損・LFSポインタがあればビルドを失敗させる。コーデック変換または復号比較に失敗した素材は元形式を配信し、結果を `nova-compression-status.json` に記録する。配信レポートには全素材の元/配信SHA256、容量、圧縮方式、ゲームファイルのSHA256を含む。

Linuxビルドではffmpeg-static 5.2.0と、公式配布SHA256を固定したlibwebp 1.6.0を使用する。ローカル検証ではFFMPEG_BINARY/CWEBP_BINARY指定、または同一の元/変換後SHA256が確認できる圧縮キャッシュを利用できる。キャッシュは公開ビルドの必須条件ではない。

既存の機械割入力ファイルは一切変更しないため、機械割証跡の差し替えや再試算は行わない。
