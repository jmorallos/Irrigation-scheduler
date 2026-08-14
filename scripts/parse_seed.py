"""
Regenerate src/db/seedRecords.js from Irrigation_Schedule_02.xlsx

Usage:
  python scripts/parse_seed.py [path/to/Irrigation_Schedule_02.xlsx]
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, time, timedelta
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XLSX = Path(
    r"c:\Users\jmorallos\Desktop\drive-download-20260813T114726Z-1-001\Irrigation_Schedule_02.xlsx"
)
OUTPUT = ROOT / "src" / "db" / "seedRecords.js"

DAY_MAP = {
    "M": "mon",
    "T": "tue",
    "W": "wed",
    "Th": "thu",
    "F": "fri",
    "Sa": "sat",
    "Su": "sun",
}

PROGRAM_DESCRIPTIONS = {
    "Fnt-Crt-Star": "Front, Court, and Star Jasmine",
    "Back": "Rear yard",
    "Bay": "Bay Laurel",
    "Tangerine": "Crossvine (cycle-and-soak)",
}


def parse_days(value: object) -> list[str]:
    text = str(value).strip()
    if not text or text == "nan":
        return []

    parts: list[str] = []
    index = 0
    tokens = ["Th", "Sa", "Su", "M", "T", "W", "F"]
    while index < len(text):
        matched = False
        for token in tokens:
            if text[index : index + len(token)] == token:
                parts.append(DAY_MAP[token])
                index += len(token)
                matched = True
                break
        if not matched:
            index += 1

    seen: set[str] = set()
    ordered: list[str] = []
    for day in parts:
        if day not in seen:
            seen.add(day)
            ordered.append(day)
    return ordered


def fmt_time(value: object) -> str | None:
    if pd.isna(value):
        return None
    if isinstance(value, str):
        hour, minute, *_ = value.split(":")
        return f"{int(hour):02d}:{minute[:2]}"
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    if isinstance(value, timedelta):
        total = int(value.total_seconds())
        hour, remainder = divmod(total, 3600)
        minute = remainder // 60
        return f"{hour:02d}:{minute:02d}"
    return str(value)


def parse_workbook(path: Path) -> list[dict]:
    xl = pd.ExcelFile(path)
    df = pd.read_excel(xl, "Irrigation Schedule", header=3)
    df = df.rename(
        columns={
            "Zone\nName": "zone_name",
            "Run\nTime (Min)": "run_min",
            "Run Total\n(Hour-Min)": "run_total",
        }
    )
    df = df.dropna(subset=["Program Name"])
    df = df[df["Program Name"].astype(str).str.strip() != ""]

    programs: dict[str, dict] = {}

    for _, row in df.iterrows():
        program_name = str(row["Program Name"]).strip()
        controller_program = str(row["Program"]).strip().upper()
        zone_num = int(row["Zone"])
        zone_name = str(row["zone_name"]).strip()
        zone_key = f"{zone_num}:{zone_name}"

        programs.setdefault(
            program_name,
            {
                "controller_program": controller_program,
                "name": program_name,
                "description": PROGRAM_DESCRIPTIONS.get(program_name, ""),
                "zones": {},
            },
        )
        programs[program_name]["zones"].setdefault(
            zone_key,
            {
                "valve": zone_num,
                "name": zone_name,
                "schedules": [],
            },
        )
        programs[program_name]["zones"][zone_key]["schedules"].append(
            {
                "start_time": fmt_time(row["Start Time"]),
                "duration_minutes": int(row["run_min"]),
                "days_of_week": parse_days(row["Days of Week"]),
                "status": "active"
                if str(row["Active"]).strip().lower() == "yes"
                else "inactive",
            }
        )

    records = []
    for program_name, program in programs.items():
        zones = list(program["zones"].values())
        zones.sort(key=lambda zone: zone["valve"])
        for zone in zones:
            zone["schedules"].sort(key=lambda sched: sched["start_time"])
            for index, schedule in enumerate(zone["schedules"], start=1):
                schedule["cycle"] = index
        records.append({
            "controller_program": program["controller_program"],
            "name": program["name"],
            "description": program["description"],
            "zones": zones,
        })

    records.sort(key=lambda record: (record["controller_program"], record["name"]))
    return records


def to_js(records: list[dict]) -> str:
    body = json.dumps(records, indent=2)
    return (
        "/**\n"
        " * Seed data derived from Irrigation_Schedule_02.xlsx\n"
        " *\n"
        " * Mapping:\n"
         " * Programs ordered by controller program letter (A, B, C, D).\n"
        " * - Zone     -> Excel valve + zone name (one zone per physical valve in a program)\n"
         " * - Schedule -> Excel row; cycle 1 = first run, cycle 2 = second run, etc.\n"
        " *\n"
        " * Days: M-W-F-Sa -> Mon/Wed/Fri/Sat, T-Th-Sa -> Tue/Thu/Sat\n"
        " *\n"
        " * Regenerate: python scripts/parse_seed.py\n"
        " */\n"
        f"export const SEED_RECORDS = {body};\n"
    )


def main() -> None:
    xlsx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    records = parse_workbook(xlsx_path)
    OUTPUT.write_text(to_js(records), encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    for program in records:
        schedule_count = sum(len(zone["schedules"]) for zone in program["zones"])
        print(
            f"  {program['name']}: {len(program['zones'])} zones, {schedule_count} schedules"
        )


if __name__ == "__main__":
    main()
