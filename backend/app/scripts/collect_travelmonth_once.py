from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence

from app.db.session import get_session_factory
from app.services.travelmonth_live_collector import collect_regional_benefits_from_live_source


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Fetch the official TravelMonth regional benefit page once and upsert parsed records.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=15.0,
        help="HTTP timeout in seconds for the official TravelMonth page fetch.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    session_factory = get_session_factory()
    try:
        with session_factory() as db:
            result = collect_regional_benefits_from_live_source(db, timeout=args.timeout)
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False, sort_keys=True))
        return 1

    print(
        json.dumps(
            {
                "sourceName": result.source_name,
                "sourceCategory": result.source_category,
                "parsedCount": result.parsed_count,
                "createdOrUpdatedCount": result.created_or_updated_count,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main() or 0)
