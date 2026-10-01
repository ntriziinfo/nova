# 素材配信と自動デプロイ

GitHub LFSの利用枠超過により、VercelのGit連携デプロイは2026-10-01にclone時点で失敗していた。
既存の公開リポジトリ `ntriziinfo/nova` のリリースへ、追跡済み素材だけを無変換でまとめる方式に変更する。
追加のサービス契約や課金枠の変更は行わない。Git履歴とLFSの元データも維持する。

## ビルド

- Vercelのプロジェクト設定 `gitLFS` をfalseにし、cloneではポインタのみ取得する。
- `vercel.json` のビルドで `scripts/prepare-deploy.mjs` を実行する。
- `deploy-assets.json` に固定したリリースURLからアーカイブを取得し、サイズ・SHA-256・収録パスを検査して展開する。
- 全311ファイルのサイズ・SHA-256も検査する。素材追加や差し替えに対してリリースが古い場合は公開を止める。
- ローカルに一致する素材が揃っている場合、ダウンロードは行わない。
- 最後に構文・参照先・ルート設定を検査する。失敗したビルドは本番へ切り替わらない。

## 素材更新時

1. 素材を通常どおりLFSで追加・更新し、全ての実体をローカルへ揃える。
2. 新しいタグ名と出力名で以下を実行する（同名アーカイブ・リリースは上書きしない）。

```sh
python scripts/package-deploy-assets.py --tag nova-assets-YYYYMMDD-N --output ../nova-assets-YYYYMMDD-N.tar.gz
```

3. 対応する素材変更のコミットを指定し、同じリポジトリのGitHub Releaseへアーカイブをアップロードする。`--notes-file`を使い、`--latest=false`にする。
4. アップロード完了後、生成された `deploy-assets.json` と素材変更をcommit/pushする。コードだけの更新なら再梱包は不要。
5. Git連携デプロイのREADYと、公開URLのコード・画像・音声・動画を確認する。

アーカイブは作業フォルダの外に置き、Gitへ直接追加しない。アーカイブ取得に失敗した場合は以前の公開版を維持する。

### 小容量音源の例外

`assets/media/nova/audiostock_932814.mp3`（242,415 bytes）は `.gitattributes` で個別にLFS対象から外し、原本を無変換のままGitへ格納する。既存の約1 GBの素材アーカイブは更新せず、Git cloneでこの音源も配信できる。原本と公開ファイルのSHA-256は `docs/cz-bgm-20261001.md` に記録する。その他のLFS素材の検査は従来どおり行う。

## 根拠

[GitHub Releasesの容量・帯域](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases#storage-and-bandwidth-quotas)：添付1個は2GiB未満、リリース総容量・帯域には上限を設けていない。
[VercelのGit LFS設定](https://vercel.com/docs/project-configuration/git-settings)：有効時にLFSオブジェクトを取得する。
