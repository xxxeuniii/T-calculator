from datetime import date

from app.eastmoney_client import report_years_for_latest_report


def test_quarter_report_uses_previous_five_full_years() -> None:
    assert report_years_for_latest_report(date(2026, 3, 31)) == [2025, 2024, 2023, 2022, 2021]


def test_annual_report_uses_report_year_as_latest_full_year() -> None:
    assert report_years_for_latest_report(date(2025, 12, 31)) == [2025, 2024, 2023, 2022, 2021]
