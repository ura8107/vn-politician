#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import subprocess
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


NS = {"x": "http://www.w3.org/1999/xhtml"}

COLUMN_SPECS = [
    ("full_name", 55, 140),
    ("birth_date_text", 140, 215),
    ("gender", 215, 260),
    ("nationality", 260, 310),
    ("ethnicity", 310, 345),
    ("religion", 345, 395),
    ("home_town", 395, 472),
    ("residence", 472, 545),
    ("general_education", 545, 590),
    ("professional_qualification", 590, 736),
    ("political_theory", 736, 784),
    ("foreign_language", 784, 837),
    ("occupation_position", 837, 910),
    ("workplace", 910, 991),
    ("party_joined_on", 991, 1071),
    ("national_assembly_history", 1071, 1124),
    ("peoples_council_history", 1124, 1195),
]

OUTPUT_COLUMNS = [
    "source_pdf_name",
    "source_page",
    "source_row_number",
    "province_code",
    "province_name",
    "electoral_unit_number",
    "electoral_unit_description",
    "full_name",
    "full_name_ascii",
    "birth_date_text",
    "birth_year",
    "gender",
    "nationality",
    "ethnicity",
    "religion",
    "home_town",
    "residence",
    "general_education",
    "professional_qualification",
    "political_theory",
    "foreign_language",
    "occupation_position",
    "workplace",
    "party_joined_on",
    "national_assembly_history",
    "peoples_council_history",
    "notes",
    "raw_text",
    "source_data",
    "term_number",
    "term_label",
]


@dataclass
class Word:
    text: str
    x_center: float
    y_center: float
    y_min: float


def normalize_space(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def make_ascii(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    stripped = stripped.replace("Đ", "D").replace("đ", "d")
    return normalize_space(stripped)


def extract_bbox_xml(pdf_path: Path) -> str:
    return subprocess.check_output(
        ["pdftotext", "-bbox-layout", str(pdf_path), "-"],
        text=True,
    )


def parse_page_context(
    pages: list[ET.Element],
) -> dict[int, dict[str, str | int | None]]:
    page_context: dict[int, dict[str, str | int | None]] = {}
    province_code: int | None = None
    province_name: str | None = None
    electoral_unit_number: int | None = None
    electoral_unit_description: str | None = None

    province_pattern = re.compile(r"^\s*(\d+)\s+[–-]\s+(.+?)\s*$")
    electoral_pattern = re.compile(r"^\s*Đơn vị bầu cử số\s+(\d+):\s*(.+?)\s*$")

    for page_number, page in enumerate(pages, 1):
        heading_lines: list[tuple[float, str]] = []
        for line in page.findall(".//x:line", NS):
            words = read_words(line)
            if not words:
                continue
            y_min = min(word.y_min for word in words)
            if y_min > 220:
                continue
            text = normalize_space(" ".join(word.text for word in words))
            if text:
                heading_lines.append((y_min, text))

        heading_lines.sort(key=lambda item: item[0])
        collecting_electoral = False

        for _, line in heading_lines:
            province_match = province_pattern.match(line)
            if province_match and province_match.group(2).startswith(
                ("THÀNH PHỐ", "TỈNH")
            ):
                province_code = int(province_match.group(1))
                province_name = province_match.group(2)
                collecting_electoral = False
                continue

            electoral_match = electoral_pattern.match(line)
            if electoral_match:
                electoral_unit_number = int(electoral_match.group(1))
                electoral_unit_description = electoral_match.group(2)
                collecting_electoral = True
                continue

            if collecting_electoral and not (
                line.startswith("TT Họ và tên")
                or line.startswith("Trình độ")
                or province_pattern.match(line)
            ):
                electoral_unit_description = normalize_space(
                    f"{electoral_unit_description} {line}"
                )
            else:
                collecting_electoral = False

        page_context[page_number] = {
            "province_code": province_code,
            "province_name": province_name,
            "electoral_unit_number": electoral_unit_number,
            "electoral_unit_description": electoral_unit_description,
        }

    return page_context


def read_words(line: ET.Element) -> list[Word]:
    words = []
    for word in line.findall("x:word", NS):
        text = html.unescape(word.text or "").strip()
        if not text:
            continue
        x_min = float(word.attrib["xMin"])
        x_max = float(word.attrib["xMax"])
        y_min = float(word.attrib["yMin"])
        y_max = float(word.attrib["yMax"])
        words.append(
            Word(
                text=text,
                x_center=(x_min + x_max) / 2,
                y_center=(y_min + y_max) / 2,
                y_min=y_min,
            )
        )
    return words


def assign_column(x_center: float) -> str | None:
    for name, x_min, x_max in COLUMN_SPECS:
        if x_min <= x_center < x_max:
            return name
    return None


def join_words(words: list[Word]) -> str:
    if not words:
        return ""
    words = sorted(words, key=lambda item: (round(item.y_center, 1), item.x_center))
    lines: list[list[Word]] = []
    for word in words:
        if not lines or abs(lines[-1][0].y_center - word.y_center) > 3:
            lines.append([word])
        else:
            lines[-1].append(word)
    line_texts = [" ".join(item.text for item in line) for line in lines]
    return normalize_space(" ".join(line_texts))


def extract_rows(pdf_path: Path) -> list[dict[str, str | int]]:
    xml_text = extract_bbox_xml(pdf_path)
    root = ET.fromstring(xml_text)
    pages = root.findall(".//x:page", NS)
    page_context = parse_page_context(pages)

    rows: list[dict[str, str | int]] = []
    source_row_number = 0

    for page_number, page in enumerate(pages, 1):
        row_markers: list[tuple[int, float]] = []
        row_words: dict[int, dict[str, list[Word]]] = {}

        for block in page.findall(".//x:block", NS):
            lines = block.findall("x:line", NS)
            block_words = [word for line in lines for word in read_words(line)]
            if not block_words:
                continue

            block_text = normalize_space(" ".join(word.text for word in block_words))
            x_center = sum(word.x_center for word in block_words) / len(block_words)
            y_center = sum(word.y_center for word in block_words) / len(block_words)

            if x_center < 55 and re.fullmatch(r"\d+", block_text):
                row_number = int(block_text)
                row_markers.append((row_number, y_center))
                row_words.setdefault(row_number, {name: [] for name, _, _ in COLUMN_SPECS})

        if not row_markers:
            continue

        for line in page.findall(".//x:line", NS):
            for word in read_words(line):
                if word.x_center < 55:
                    continue
                closest_row, row_center = min(
                    row_markers,
                    key=lambda marker: abs(marker[1] - word.y_center),
                )
                distance = abs(row_center - word.y_center)
                if distance > 140:
                    continue
                column = assign_column(word.x_center)
                if column is None:
                    continue
                row_words[closest_row][column].append(word)

        for pdf_row_number, _ in sorted(row_markers, key=lambda item: item[1]):
            source_row_number += 1
            context = page_context[page_number]
            record: dict[str, str | int] = {
                "source_pdf_name": pdf_path.name,
                "source_page": page_number,
                "source_row_number": source_row_number,
                "province_code": context["province_code"] or "",
                "province_name": context["province_name"] or "",
                "electoral_unit_number": context["electoral_unit_number"] or "",
                "electoral_unit_description": context["electoral_unit_description"] or "",
                "notes": "",
                "term_number": 16,
                "term_label": "Vietnam National Assembly Term 16",
            }

            for column_name, _, _ in COLUMN_SPECS:
                record[column_name] = join_words(row_words[pdf_row_number][column_name])

            record["full_name_ascii"] = make_ascii(str(record["full_name"]))

            birth_date = str(record["birth_date_text"])
            birth_year_match = re.search(r"(\d{4})$", birth_date)
            record["birth_year"] = int(birth_year_match.group(1)) if birth_year_match else ""

            raw_payload = {
                "pdf_row_number": pdf_row_number,
                "province_code": context["province_code"],
                "province_name": context["province_name"],
                "electoral_unit_number": context["electoral_unit_number"],
                "electoral_unit_description": context["electoral_unit_description"],
            }
            record["raw_text"] = normalize_space(
                " | ".join(
                    str(record[column])
                    for column, _, _ in COLUMN_SPECS
                    if str(record[column]).strip()
                )
            )
            record["source_data"] = json.dumps(raw_payload, ensure_ascii=False)
            rows.append(record)

    return rows


def write_csv(output_path: Path, rows: list[dict[str, str | int]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    rows = extract_rows(args.input)
    write_csv(args.output, rows)
    print(f"Wrote {len(rows)} rows to {args.output}")


if __name__ == "__main__":
    main()
