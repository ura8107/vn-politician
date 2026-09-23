# 魚拓 / Source archive

本サイトのデータ元となる公式資料の保存コピー（魚拓）です。

## 収録ファイル

- `Cong-Bo-Danh-Sach-Ch.pdf` (4.9 MB, MD5 `2090d67a2434f583ec49dcafc1dfb93b`)
  - 『DANH SÁCH NHỮNG NGƯỜI TRÚNG CỬ ĐẠI BIỂU QUỐC HỘI KHÓA XVI』
  - 取得元: https://file3.qdnd.vn/data/documents/0/2026/03/21/upload_1021/cong%20bo%20chinh%20thuc%20500%20nguoi%20trung%20cu%20dbqh.pdf
  - 根拠: Nghị quyết số 232/NQ-HĐBCQG ngày 21/3/2026 (Hội đồng bầu cử quốc gia / National Election Council)
- `quochoi-khoa-xvi-list-vietnam.vn.html` (690 KB)
  - 解説・一覧記事のスナップショット
  - 取得元: https://www.vietnam.vn/toan-bo-danh-sach-500-dai-bieu-quoc-hoi-khoa-xvi

## 取得日

2026-09-23

## 用途

- `scripts/extract_assembly_members.py` の入力 → `data/import/assembly_members.csv` を再生成
- 抽出スクリプトの省ヘッダー検出バグ（10番目以降の省番号と省名が PDF 上で別行になる）を修正して全 500 名（34 省）の所属を正確に復元