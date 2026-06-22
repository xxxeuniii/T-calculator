from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from urllib.parse import quote

import requests


EASTMONEY_QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get"
EASTMONEY_F10_URL = "https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/ZYZBAjaxNew"
EASTMONEY_DATACENTER_URL = "https://datacenter.eastmoney.com/securities/api/data/v1/get"


class EastmoneyError(RuntimeError):
    pass


@dataclass(frozen=True)
class StockIdentity:
    code: str
    secucode: str
    eastmoney_code: str
    secid: str


def normalize_stock_code(code: str) -> StockIdentity:
    raw = code.strip().upper()
    if not raw:
        raise ValueError("stock code is required")

    if raw.endswith(".SZ"):
        digits = raw[:-3]
        return StockIdentity(digits, f"{digits}.SZ", f"SZ{digits}", f"0.{digits}")
    if raw.endswith(".SH"):
        digits = raw[:-3]
        return StockIdentity(digits, f"{digits}.SH", f"SH{digits}", f"1.{digits}")
    if raw.startswith("SZ") and len(raw) == 8:
        digits = raw[2:]
        return StockIdentity(digits, f"{digits}.SZ", raw, f"0.{digits}")
    if raw.startswith("SH") and len(raw) == 8:
        digits = raw[2:]
        return StockIdentity(digits, f"{digits}.SH", raw, f"1.{digits}")
    if len(raw) == 6 and raw.isdigit():
        market = "SH" if raw.startswith(("5", "6", "9")) else "SZ"
        secid_market = "1" if market == "SH" else "0"
        return StockIdentity(raw, f"{raw}.{market}", f"{market}{raw}", f"{secid_market}.{raw}")

    raise ValueError("unsupported stock code, use formats like 000001, 000001.SZ, or SH600519")


def parse_eastmoney_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            pass
    return None


def report_years_for_latest_report(latest_report_date: date, years: int = 5) -> list[int]:
    end_year = latest_report_date.year if latest_report_date.month == 12 else latest_report_date.year - 1
    return list(range(end_year, end_year - years, -1))


def _as_float(value: Any) -> float | None:
    if value in (None, "", "-", "--"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _date_key(row: dict[str, Any]) -> date:
    return parse_eastmoney_date(row.get("REPORT_DATE")) or date.min


def _first_number(row: dict[str, Any] | None, keys: tuple[str, ...]) -> float | None:
    if not row:
        return None
    for key in keys:
        value = _as_float(row.get(key))
        if value is not None:
            return value
    return None


class EastmoneyClient:
    def __init__(self, timeout: int = 12) -> None:
        self.session = requests.Session()
        self.timeout = timeout
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
                ),
                "Accept": "application/json,text/plain,*/*",
            }
        )

    def get_valuation_source_data(self, code: str, as_of: date | None = None) -> dict[str, Any]:
        identity = normalize_stock_code(code)
        as_of = as_of or date.today()

        quote = self.fetch_quote(identity)
        all_reports = self.fetch_main_indicators(identity, quarterly=True)
        annual_reports = self.fetch_main_indicators(identity, quarterly=False)
        balance_rows = self.fetch_datacenter_report(identity, "RPT_DMSK_FN_BALANCE", page_size=120)

        latest_report = self.select_latest_published_report(all_reports, as_of)
        if not latest_report:
            raise EastmoneyError(f"no published financial report found for {identity.secucode}")

        latest_report_date = parse_eastmoney_date(latest_report.get("REPORT_DATE"))
        if not latest_report_date:
            raise EastmoneyError(f"latest report has invalid REPORT_DATE for {identity.secucode}")

        years = report_years_for_latest_report(latest_report_date)
        annual_history = self.select_annual_history(annual_reports, years)
        last_year_report = annual_history[0] if annual_history else None
        latest_balance = self.find_report_by_date(balance_rows, latest_report_date)

        return {
            "stock_code": identity.secucode,
            "as_of": as_of.isoformat(),
            "basic": self.map_quote(quote, identity),
            "last_year": self.map_last_year(last_year_report),
            "latest_report": self.map_latest_report(latest_report, latest_balance),
            "historical_years": years,
            "historical_reports": [self.map_annual_report(row) for row in annual_history],
            "source": {
                "quote": "push2.eastmoney.com/api/qt/stock/get",
                "main_indicators": "emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/ZYZBAjaxNew",
                "balance_sheet": "datacenter.eastmoney.com/securities/api/data/v1/get RPT_DMSK_FN_BALANCE",
            },
        }

    def fetch_quote(self, identity: StockIdentity) -> dict[str, Any]:
        params = {
            "secid": identity.secid,
            "fields": "f57,f58,f43,f84,f116,f127",
        }
        response = self.session.get(
            EASTMONEY_QUOTE_URL,
            params=params,
            headers={"Referer": "https://quote.eastmoney.com/"},
            timeout=self.timeout,
        )
        payload = self._json(response)
        if payload.get("rc") != 0 or not payload.get("data"):
            raise EastmoneyError(f"quote request failed for {identity.secucode}: {payload}")
        return payload["data"]

    def fetch_main_indicators(self, identity: StockIdentity, quarterly: bool) -> list[dict[str, Any]]:
        params = {
            "type": "0" if quarterly else "1",
            "code": identity.eastmoney_code,
        }
        response = self.session.get(
            EASTMONEY_F10_URL,
            params=params,
            headers={"Referer": "https://emweb.securities.eastmoney.com/"},
            timeout=self.timeout,
        )
        payload = self._json(response)
        data = payload.get("data")
        if not isinstance(data, list):
            raise EastmoneyError(f"main indicators request failed for {identity.secucode}: {payload}")
        return sorted(data, key=_date_key, reverse=True)

    def fetch_datacenter_report(
        self,
        identity: StockIdentity,
        report_name: str,
        page_size: int = 100,
    ) -> list[dict[str, Any]]:
        filter_text = quote(f'(SECUCODE="{identity.secucode}")', safe="()=")
        url = (
            f"{EASTMONEY_DATACENTER_URL}?reportName={report_name}&columns=ALL"
            f"&filter={filter_text}&pageNumber=1&pageSize={page_size}"
            "&sortColumns=REPORT_DATE&sortTypes=-1"
        )
        response = self.session.get(
            url,
            headers={"Referer": "https://data.eastmoney.com/"},
            timeout=self.timeout,
        )
        payload = self._json(response)
        if not payload.get("success"):
            raise EastmoneyError(f"{report_name} request failed for {identity.secucode}: {payload}")
        result = payload.get("result") or {}
        data = result.get("data") or []
        return sorted(data, key=_date_key, reverse=True)

    @staticmethod
    def select_latest_published_report(rows: list[dict[str, Any]], as_of: date) -> dict[str, Any] | None:
        for row in rows:
            notice_date = parse_eastmoney_date(row.get("NOTICE_DATE"))
            report_date = parse_eastmoney_date(row.get("REPORT_DATE"))
            if report_date and report_date <= as_of and (notice_date is None or notice_date <= as_of):
                return row
        return None

    @staticmethod
    def select_annual_history(rows: list[dict[str, Any]], years: list[int]) -> list[dict[str, Any]]:
        by_year: dict[int, dict[str, Any]] = {}
        for row in rows:
            report_date = parse_eastmoney_date(row.get("REPORT_DATE"))
            if report_date and report_date.month == 12 and report_date.year in years:
                by_year.setdefault(report_date.year, row)
        return [by_year[year] for year in years if year in by_year]

    @staticmethod
    def find_report_by_date(rows: list[dict[str, Any]], report_date: date) -> dict[str, Any] | None:
        for row in rows:
            if parse_eastmoney_date(row.get("REPORT_DATE")) == report_date:
                return row
        return None

    @staticmethod
    def map_quote(row: dict[str, Any], identity: StockIdentity) -> dict[str, Any]:
        return {
            "stock_code": identity.secucode,
            "stock_name": row.get("f58"),
            "industry": row.get("f127"),
            "close_price": (_as_float(row.get("f43")) or 0) / 100,
            "total_share": _as_float(row.get("f84")),
            "total_market_value": _as_float(row.get("f116")),
        }

    @staticmethod
    def map_last_year(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None
        return {
            "report_date": row.get("REPORT_DATE"),
            "eps": _as_float(row.get("EPSJB")),
            "total_revenue": _as_float(row.get("TOTALOPERATEREVE")),
            "net_profit": _as_float(row.get("PARENTNETPROFIT")),
        }

    @staticmethod
    def map_latest_report(main_row: dict[str, Any], balance_row: dict[str, Any] | None) -> dict[str, Any]:
        return {
            "report_date": main_row.get("REPORT_DATE"),
            "report_type": main_row.get("REPORT_TYPE"),
            "notice_date": main_row.get("NOTICE_DATE"),
            "eps": _as_float(main_row.get("EPSJB")),
            "total_revenue": _as_float(main_row.get("TOTALOPERATEREVE")),
            "total_revenue_yoy": _as_float(main_row.get("TOTALOPERATEREVETZ")),
            "net_profit": _as_float(main_row.get("PARENTNETPROFIT")),
            "net_profit_yoy": _as_float(main_row.get("PARENTNETPROFITTZ")),
            "deduct_net_profit": _as_float(main_row.get("KCFJCXSYJLR")),
            "deduct_net_profit_yoy": _as_float(main_row.get("KCFJCXSYJLRTZ")),
            "assets": {
                "investment_real_estate": _first_number(
                    balance_row,
                    ("INVEST_REALESTATE", "INVESTMENT_REALESTATE", "INVEST_REAL_ESTATE", "INVEST_PROPERTY"),
                ),
                "construction_in_progress": _first_number(
                    balance_row,
                    ("CIP", "CONSTRUCTION_IN_PROGRESS", "CONSTRUCT_IN_PROCESS", "CONSTRUCTION_PROJECT"),
                ),
                "fixed_asset": _first_number(balance_row, ("FIXED_ASSET", "FIXED_ASSETS")),
                "total_assets": _first_number(balance_row, ("TOTAL_ASSETS",)),
            },
            "raw_balance_keys": list(balance_row.keys()) if balance_row else [],
        }

    @staticmethod
    def map_annual_report(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "year": int(row["REPORT_YEAR"]) if str(row.get("REPORT_YEAR", "")).isdigit() else None,
            "report_date": row.get("REPORT_DATE"),
            "eps": _as_float(row.get("EPSJB")),
            "total_revenue": _as_float(row.get("TOTALOPERATEREVE")),
            "total_revenue_yoy": _as_float(row.get("TOTALOPERATEREVETZ")),
            "net_profit": _as_float(row.get("PARENTNETPROFIT")),
            "net_profit_yoy": _as_float(row.get("PARENTNETPROFITTZ")),
            "deduct_net_profit": _as_float(row.get("KCFJCXSYJLR")),
            "deduct_net_profit_yoy": _as_float(row.get("KCFJCXSYJLRTZ")),
        }

    @staticmethod
    def _json(response: requests.Response) -> dict[str, Any]:
        try:
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            raise EastmoneyError(f"eastmoney response is not valid JSON: {exc}") from exc
        if not isinstance(payload, dict):
            raise EastmoneyError(f"eastmoney response is not an object: {payload!r}")
        return payload
