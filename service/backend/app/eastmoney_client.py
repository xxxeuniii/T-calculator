from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import re
import time
from typing import Any
from urllib.parse import quote

import requests


EASTMONEY_QUOTE_URL = "http://push2.eastmoney.com/api/qt/stock/get"
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


def calculate_valuation_method(assets: dict[str, float | None]) -> dict[str, Any]:
    def safe_float(value: Any) -> float:
        if value is None or value == "" or value == "--":
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    investment_real_estate = safe_float(assets.get("investment_real_estate"))
    construction_in_progress = safe_float(assets.get("construction_in_progress"))
    fixed_asset = safe_float(assets.get("fixed_asset"))
    total_assets = safe_float(assets.get("total_assets"))
    heavy_asset_sum = investment_real_estate + construction_in_progress + fixed_asset

    if total_assets <= 0:
        return {
            "heavy_asset_sum": heavy_asset_sum,
            "asset_ratio": None,
            "method": "UNKNOWN",
            "method_name": "无法判断",
            "rule": "(固定资产+在建工程+固定资产)/总资产，>40% 使用市盈率估值法，≤40% 使用市销率估值法",
        }

    asset_ratio = heavy_asset_sum / total_assets * 100
    use_pe = asset_ratio > 40
    return {
        "heavy_asset_sum": round(heavy_asset_sum, 4),
        "asset_ratio": round(asset_ratio, 4),
        "method": "PE" if use_pe else "PS",
        "method_name": "市盈率估值法" if use_pe else "市销率估值法",
        "rule": "(固定资产+在建工程+固定资产)/总资产，>40% 使用市盈率估值法，≤40% 使用市销率估值法",
    }


def calculate_composite_revenue_growth(
    historical_reports: list[dict[str, Any]],
    latest_report: dict[str, Any],
) -> dict[str, Any]:
    annual_growths = [
        row["total_revenue_yoy"]
        for row in historical_reports
        if isinstance(row.get("total_revenue_yoy"), (int, float))
    ]
    latest_yoy = latest_report.get("total_revenue_yoy")
    growths_for_composite = list(annual_growths)
    if isinstance(latest_yoy, (int, float)):
        growths_for_composite.append(latest_yoy)

    historical_avg = sum(annual_growths) / len(annual_growths) if annual_growths else None
    composite = sum(growths_for_composite) / len(growths_for_composite) if growths_for_composite else None

    revenues = [
        row["total_revenue"]
        for row in sorted(historical_reports, key=lambda item: item.get("year") or 0)
        if isinstance(row.get("total_revenue"), (int, float)) and row["total_revenue"] > 0
    ]
    cagr = None
    if len(revenues) >= 2:
        years = len(revenues) - 1
        cagr = ((revenues[-1] / revenues[0]) ** (1 / years) - 1) * 100

    return {
        "historical_revenue_growths": annual_growths,
        "historical_average_revenue_growth": round(historical_avg, 4) if historical_avg is not None else None,
        "latest_revenue_yoy": latest_yoy,
        "five_year_revenue_cagr": round(cagr, 4) if cagr is not None else None,
        "composite_revenue_growth": round(composite, 4) if composite is not None else None,
        "rule": "缁煎悎澶嶅悎钀ユ敹澧為€?= 杩戜簲骞村勾鎶ヨ惀鏀跺悓姣斿閫熶笌鏈€鏂版姤鍛婅惀鏀跺悓姣斿閫熺殑绠楁湳骞冲潎",
    }


class EastmoneyClient:
    def __init__(self, timeout: int = 20) -> None:
        self.session = requests.Session()
        self.session.trust_env = False
        self.timeout = timeout
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "application/json,text/plain,*/*",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Referer": "https://quote.eastmoney.com/",
                "Origin": "https://quote.eastmoney.com",
            }
        )

    def get_valuation_source_data(self, code: str, as_of: date | None = None) -> dict[str, Any]:
        identity = normalize_stock_code(code)
        as_of = as_of or date.today()

        quote = self.fetch_quote(identity)
        all_reports = self.fetch_main_indicators(identity, quarterly=True)
        annual_reports = self.fetch_main_indicators(identity, quarterly=False)
        balance_rows, balance_source = self.fetch_balance_rows(identity)

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
        basic = self.map_quote(quote, identity)
        latest_report_data = self.map_latest_report(latest_report, latest_balance)
        annual_history_data = [self.map_annual_report(row) for row in annual_history]
        last_year_data = self.map_last_year(last_year_report)
        valuation_method = calculate_valuation_method(latest_report_data["assets"])
        composite_growth = calculate_composite_revenue_growth(annual_history_data, latest_report_data)

        return {
            "stock_code": identity.secucode,
            "as_of": as_of.isoformat(),
            "basic": basic,
            "last_year": last_year_data,
            "latest_report": latest_report_data,
            "historical_years": years,
            "historical_reports": annual_history_data,
            "valuation_method": valuation_method,
            "composite_growth": composite_growth,
            "valuation_inputs": {
                "total_market_value": basic.get("total_market_value"),
                "latest_eps": latest_report_data.get("eps"),
                "last_year_eps": last_year_data.get("eps") if last_year_data else None,
                "total_share": basic.get("total_share"),
                "close_price": basic.get("close_price"),
            },
            "source": {
                "quote": "push2.eastmoney.com/api/qt/stock/get",
                "main_indicators": "emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/ZYZBAjaxNew",
                "balance_sheet": balance_source,
            },
        }

    def fetch_balance_rows(self, identity: StockIdentity) -> tuple[list[dict[str, Any]], str]:
        for report_name in ("RPT_F10_FINANCE_GBALANCE", "RPT_DMSK_FN_BALANCE"):
            try:
                rows = self.fetch_datacenter_report(identity, report_name, page_size=120)
                if rows:
                    return rows, f"datacenter.eastmoney.com/securities/api/data/v1/get {report_name}"
            except EastmoneyError:
                continue
        return [], "none"

    def get_current_quote(self, code: str) -> dict[str, Any]:
        identity = normalize_stock_code(code)
        quote = self.fetch_quote(identity)
        basic = self.map_quote(quote, identity)
        return {
            "stock_code": basic["stock_code"],
            "stock_name": basic["stock_name"],
            "current_price": basic["close_price"],
            "industry": basic["industry"],
            "total_share": basic["total_share"],
            "total_market_value": basic["total_market_value"],
            "source": basic["source"],
        }

    def get_balance_sheet_assets(self, code: str) -> dict[str, Any]:
        identity = normalize_stock_code(code)
        rows, source = self.fetch_balance_rows(identity)
        latest = rows[0] if rows else None

        def safe_float(value: Any, keys: tuple[str, ...]) -> float:
            if not latest:
                return 0.0
            for key in keys:
                val = _as_float(latest.get(key))
                if val is not None:
                    return val
            return 0.0

        return {
            "stock_code": identity.secucode,
            "stock_name": latest.get("SECURITY_NAME_ABBR") if latest else "未知股票",
            "report_date": latest.get("REPORT_DATE") if latest else "",
            "investment_real_estate": safe_float(
                latest,
                ("INVEST_REALESTATE", "INVESTMENT_REALESTATE", "INVEST_REAL_ESTATE", "INVEST_PROPERTY"),
            ),
            "construction_in_progress": safe_float(
                latest,
                ("CIP", "CONSTRUCTION_IN_PROGRESS", "CONSTRUCT_IN_PROCESS", "CONSTRUCTION_PROJECT"),
            ),
            "fixed_asset": safe_float(latest, ("FIXED_ASSET", "FIXED_ASSETS")),
            "total_assets": safe_float(latest, ("TOTAL_ASSETS",)),
            "source": source,
        }

    def fetch_quote(self, identity: StockIdentity) -> dict[str, Any]:
        params = {
            "secid": identity.secid,
            "fields": "f57,f58,f43,f84,f116,f127",
        }
        try:
            response = self._get(
                EASTMONEY_QUOTE_URL,
                params=params,
                headers={"Referer": "https://quote.eastmoney.com/"},
            )
            payload = self._json(response)
            if payload.get("rc") == 0 and payload.get("data"):
                data = payload["data"]
                data["_source"] = "eastmoney.stock.get"
                return data
        except EastmoneyError:
            pass

        return self.fetch_quote_from_list(identity)

    def fetch_quote_from_list(self, identity: StockIdentity) -> dict[str, Any]:
        for page_number in range(1, 70):
            params = {
                "pn": page_number,
                "pz": 100,
                "fid": "f12",
                "fs": "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23",
                "fields": "f12,f13,f14,f2,f20,f100",
            }
            response = self._get(
                "http://push2.eastmoney.com/api/qt/clist/get",
                params=params,
                headers={"Referer": "https://quote.eastmoney.com/"},
            )
            payload = self._json(response)
            rows = ((payload.get("data") or {}).get("diff") or {})
            if isinstance(rows, dict):
                iterable = rows.values()
            elif isinstance(rows, list):
                iterable = rows
            else:
                iterable = []
            for row in iterable:
                if isinstance(row, dict) and str(row.get("f12")) == identity.code:
                    price = (_as_float(row.get("f2")) or 0) / 100
                    total_market_value = _as_float(row.get("f20"))
                    total_share = total_market_value / price if total_market_value and price else None
                    return {
                        "f57": row.get("f12"),
                        "f58": row.get("f14"),
                        "f43": row.get("f2"),
                        "f84": total_share,
                        "f116": total_market_value,
                        "f127": row.get("f100"),
                        "_source": "eastmoney.clist.get",
                    }
        raise EastmoneyError(f"quote request failed for {identity.secucode}")

    def fetch_main_indicators(self, identity: StockIdentity, quarterly: bool) -> list[dict[str, Any]]:
        params = {
            "type": "0" if quarterly else "1",
            "code": identity.eastmoney_code,
        }
        response = self._get(
            EASTMONEY_F10_URL,
            params=params,
            headers={"Referer": "https://emweb.securities.eastmoney.com/"},
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
        response = self._get(url, headers={"Referer": "https://data.eastmoney.com/"})
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
        def safe_float(value: Any) -> float:
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value) / 100 if value is not None else 0.0
            except (TypeError, ValueError):
                return 0.0

        return {
            "stock_code": identity.secucode,
            "stock_name": row.get("f58") or "未知股票",
            "industry": row.get("f127") or "未知行业",
            "close_price": safe_float(row.get("f43")),
            "total_share": safe_float(row.get("f84")),
            "total_market_value": safe_float(row.get("f116")),
            "source": row.get("_source") or "eastmoney",
        }

    @staticmethod
    def map_last_year(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None

        def safe_float(value: Any) -> float:
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        return {
            "report_date": row.get("REPORT_DATE") or "",
            "eps": safe_float(row.get("EPSJB")),
            "book_value_per_share": safe_float(row.get("BPS")),
            "total_revenue": safe_float(row.get("TOTALOPERATEREVE")),
            "net_profit": safe_float(row.get("PARENTNETPROFIT")),
        }

    @staticmethod
    def map_latest_report(main_row: dict[str, Any], balance_row: dict[str, Any] | None) -> dict[str, Any]:
        def safe_float(value: Any) -> float:
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        return {
            "report_date": main_row.get("REPORT_DATE") or "",
            "report_type": main_row.get("REPORT_TYPE") or "",
            "notice_date": main_row.get("NOTICE_DATE") or "",
            "eps": safe_float(main_row.get("EPSJB")),
            "book_value_per_share": safe_float(main_row.get("BPS")),
            "total_revenue": safe_float(main_row.get("TOTALOPERATEREVE")),
            "total_revenue_yoy": safe_float(main_row.get("TOTALOPERATEREVETZ")),
            "net_profit": safe_float(main_row.get("PARENTNETPROFIT")),
            "net_profit_yoy": safe_float(main_row.get("PARENTNETPROFITTZ")),
            "deduct_net_profit": safe_float(main_row.get("KCFJCXSYJLR")),
            "deduct_net_profit_yoy": safe_float(main_row.get("KCFJCXSYJLRTZ")),
            "assets": {
                "investment_real_estate": safe_float(
                    balance_row,
                    ("INVEST_REALESTATE", "INVESTMENT_REALESTATE", "INVEST_REAL_ESTATE", "INVEST_PROPERTY"),
                ),
                "construction_in_progress": safe_float(
                    balance_row,
                    ("CIP", "CONSTRUCTION_IN_PROGRESS", "CONSTRUCT_IN_PROCESS", "CONSTRUCTION_PROJECT"),
                ),
                "fixed_asset": safe_float(balance_row, ("FIXED_ASSET", "FIXED_ASSETS")),
                "total_assets": safe_float(balance_row, ("TOTAL_ASSETS",)),
            },
            "raw_balance_keys": list(balance_row.keys()) if balance_row else [],
        }

    @staticmethod
    def map_annual_report(row: dict[str, Any]) -> dict[str, Any]:
        def safe_float(value: Any) -> float:
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        return {
            "year": int(row["REPORT_YEAR"]) if str(row.get("REPORT_YEAR", "")).isdigit() else None,
            "report_date": row.get("REPORT_DATE") or "",
            "eps": safe_float(row.get("EPSJB")),
            "book_value_per_share": safe_float(row.get("BPS")),
            "total_revenue": safe_float(row.get("TOTALOPERATEREVE")),
            "total_revenue_yoy": safe_float(row.get("TOTALOPERATEREVETZ")),
            "net_profit": safe_float(row.get("PARENTNETPROFIT")),
            "net_profit_yoy": safe_float(row.get("PARENTNETPROFITTZ")),
            "deduct_net_profit": safe_float(row.get("KCFJCXSYJLR")),
            "deduct_net_profit_yoy": safe_float(row.get("KCFJCXSYJLRTZ")),
        }

    @staticmethod
    def _json(response: requests.Response) -> dict[str, Any]:
        try:
            response.raise_for_status()
            response.encoding = "utf-8"
            payload = response.json()
        except Exception as exc:
            raise EastmoneyError(f"eastmoney response is not valid JSON: {exc}") from exc
        if not isinstance(payload, dict):
            raise EastmoneyError(f"eastmoney response is not an object: {payload!r}")
        return payload

    def _get(self, url: str, **kwargs: Any) -> requests.Response:
        last_error: requests.RequestException | None = None
        max_retries = 5  # 增加重试次数
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=self.timeout, **kwargs)
                response.raise_for_status()
                return response
            except requests.exceptions.ConnectionError as exc:
                last_error = exc
                if attempt < max_retries - 1:
                    import time
                    time.sleep(1 * (attempt + 1))  # 指数退避
                continue
            except requests.exceptions.Timeout as exc:
                last_error = exc
                if attempt < max_retries - 1:
                    import time
                    time.sleep(1 * (attempt + 1))
                continue
            except requests.exceptions.HTTPError as exc:
                last_error = exc
                break
        raise EastmoneyError(f"eastmoney request failed after {max_retries} retries: {last_error}") from last_error
