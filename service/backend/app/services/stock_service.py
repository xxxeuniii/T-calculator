from datetime import datetime, date
from ..eastmoney_client import EastmoneyClient, EastmoneyError, normalize_stock_code


client = EastmoneyClient()


def get_stock_prediction_from_cagr(code: str) -> dict:
    """基于综合复合增速预测下一年股价"""
    try:
        identity = normalize_stock_code(code)

        # 复用 get_compound_growth 的逻辑获取数据
        quarterly_reports = client.fetch_main_indicators(identity, quarterly=True)
        annual_reports = client.fetch_main_indicators(identity, quarterly=False)
        latest_annual = client.select_latest_published_report(annual_reports, date.today())

        latest_date = datetime.strptime(latest_annual.get("REPORT_DATE", "").split()[0], "%Y-%m-%d").date() if latest_annual else date.today()
        current_year = latest_date.year + 1  # 动态年份
        years = list(range(latest_date.year, latest_date.year - 5, -1))
        annual_history = client.select_annual_history(annual_reports, years)

        def safe_float(value):
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        # 获取基准年营收和净利润，基准年来自最新已披露年报。
        revenue_base = 0.0
        net_profit_base = 0.0
        base_year = latest_date.year

        for row in annual_history:
            report_date = row.get("REPORT_DATE", "")
            if str(base_year) in report_date:
                revenue_base = safe_float(row.get("TOTALOPERATEREVE")) / 100000000
                net_profit_base = safe_float(row.get("PARENTNETPROFIT")) / 100000000
                break

        # 获取综合复合增速（从 compound_growth 数据中取 revenue_cagr 和 profit_cagr）
        revenue_history = []
        net_profit_history = []
        revenue_yoy_history = []
        profit_yoy_history = []

        for row in annual_history:
            rev = safe_float(row.get("TOTALOPERATEREVE"))
            profit = safe_float(row.get("PARENTNETPROFIT"))
            rev_yoy = safe_float(row.get("TOTALOPERATEREVETZ"))
            profit_yoy = safe_float(row.get("PARENTNETPROFITTZ"))
            if rev > 0:
                revenue_history.append(rev)
            if profit > 0:
                net_profit_history.append(profit)
            revenue_yoy_history.append(rev_yoy)
            profit_yoy_history.append(profit_yoy)

        def calculate_average(values):
            if not values:
                return None
            if len(values) <= 2:
                return sum(values) / len(values)
            min_val = min(values)
            max_val = max(values)
            diff_ratio = abs(max_val - min_val) / abs(min_val) if min_val != 0 else float('inf')
            if diff_ratio > 3:
                filtered = [v for v in values if v != min_val and v != max_val]
                if len(filtered) >= 1:
                    return sum(filtered) / len(filtered)
                return sum(values) / len(values)
            return sum(values) / len(values)

        avg_revenue_yoy = calculate_average(revenue_yoy_history)
        avg_net_profit_yoy = calculate_average(profit_yoy_history)

        # 综合复合增速：使用 CAGR 公式
        revenue_cagr = None
        if len(revenue_history) >= 2:
            years_diff = len(revenue_history) - 1
            revenue_cagr = ((revenue_history[-1] / revenue_history[0]) ** (1 / years_diff) - 1) * 100

        profit_cagr = None
        if len(net_profit_history) >= 2:
            years_diff = len(net_profit_history) - 1
            profit_cagr = ((net_profit_history[-1] / net_profit_history[0]) ** (1 / years_diff) - 1) * 100

        # 预测公式
        predicted_revenue = revenue_base * (1 + (revenue_cagr or 0) / 100) if revenue_base > 0 else 0
        predicted_net_profit = net_profit_base * (1 + (profit_cagr or 0) / 100) if net_profit_base > 0 else 0

        # 获取股价和股本数据
        quote = client.get_current_quote(code)
        total_market_value = safe_float(quote.get("total_market_value"))
        total_share = safe_float(quote.get("total_share"))
        current_price = safe_float(quote.get("current_price"))

        # 市销率估值: ((总市值/基准年营收)*预测年营收)/总股本
        ps_ratio = (total_market_value / 100000000) / revenue_base if revenue_base > 0 else None
        predicted_price_ps = None
        if ps_ratio is not None and predicted_revenue > 0 and total_share > 0:
            predicted_price_ps = (ps_ratio * predicted_revenue * 100000000) / total_share

        # 市盈率估值: (预测净利润 * 市盈率) / 总股本 = (预测净利润 * (股价/每股收益)) / 总股本
        eps_base = safe_float(latest_annual.get("BASICEPS")) if latest_annual else 0
        pe_ratio = current_price / eps_base if eps_base > 0 else None
        predicted_price_pe = None
        if pe_ratio is not None and predicted_net_profit > 0 and total_share > 0:
            predicted_price_pe = (predicted_net_profit * 100000000 * pe_ratio) / total_share

        return {
            "success": True,
            "data": {
                "stock_code": identity.secucode,
                "stock_name": quote.get("stock_name") or "",
                "base_year": base_year,
                "predicted_year": current_year,
                "revenue_base": round(revenue_base, 2),
                "net_profit_base": round(net_profit_base, 2),
                "revenue_cagr": round(revenue_cagr, 2) if revenue_cagr else None,
                "profit_cagr": round(profit_cagr, 2) if profit_cagr else None,
                "predicted_revenue": round(predicted_revenue, 2),
                "predicted_net_profit": round(predicted_net_profit, 2),
                "total_market_value": round(total_market_value / 100000000, 2),
                "total_share": round(total_share / 100000000, 2),
                "current_price": round(current_price, 2),
                "ps_ratio": round(ps_ratio, 2) if ps_ratio else None,
                "pe_ratio": round(pe_ratio, 2) if pe_ratio else None,
                "predicted_price_ps": round(predicted_price_ps, 2) if predicted_price_ps else None,
                "predicted_price_pe": round(predicted_price_pe, 2) if predicted_price_pe else None,
            }
        }
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取数据失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_stock_prediction(code: str) -> dict:
    try:
        identity = normalize_stock_code(code)
        
        quote = client.get_current_quote(code)
        assets = client.get_balance_sheet_assets(code)
        valuation = client.get_valuation_method(code)
        quarterly_reports = client.fetch_main_indicators(identity, quarterly=True)
        annual_reports = client.fetch_main_indicators(identity, quarterly=False)
        
        latest_annual = client.select_latest_published_report(annual_reports, date.today())
        
        latest_date = datetime.strptime(latest_annual.get("REPORT_DATE", "").split()[0], "%Y-%m-%d").date() if latest_annual else date.today()
        base_year = latest_date.year
        predicted_year = base_year + 1
        years = list(range(base_year, base_year - 5, -1))
        annual_history = client.select_annual_history(annual_reports, years)
        
        def safe_float(value):
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0
        
        total_market_value = safe_float(quote.get("total_market_value"))
        total_share = safe_float(quote.get("total_share"))
        current_price = safe_float(quote.get("current_price"))
        
        investment_real_estate = safe_float(assets.get("investment_real_estate"))
        construction_in_progress = safe_float(assets.get("construction_in_progress"))
        fixed_asset = safe_float(assets.get("fixed_asset"))
        total_assets = safe_float(assets.get("total_assets"))
        
        heavy_asset_sum = investment_real_estate + construction_in_progress + fixed_asset
        asset_ratio = (heavy_asset_sum / total_assets * 100) if total_assets > 0 else None
        is_heavy_asset = asset_ratio is not None and asset_ratio > 40
        
        revenue_base = 0.0
        net_profit_base = 0.0
        eps_base = 0.0
        
        for row in annual_history:
            report_date = row.get("REPORT_DATE", "")
            report_year = None
            if report_date:
                try:
                    report_year = datetime.strptime(report_date.split()[0], "%Y-%m-%d").date().year
                except ValueError:
                    report_year = None
            if report_year == base_year:
                revenue_base = safe_float(row.get("TOTALOPERATEREVE")) / 100000000
                net_profit_base = safe_float(row.get("PARENTNETPROFIT")) / 100000000
                eps_base = safe_float(row.get("BASICEPS"))
                break
        if latest_annual and (revenue_base <= 0 or net_profit_base <= 0 or eps_base <= 0):
            revenue_base = revenue_base or safe_float(latest_annual.get("TOTALOPERATEREVE")) / 100000000
            net_profit_base = net_profit_base or safe_float(latest_annual.get("PARENTNETPROFIT")) / 100000000
            eps_base = eps_base or safe_float(latest_annual.get("BASICEPS"))
        
        revenue_yoy_history = []
        profit_yoy_history = []
        for row in annual_history:
            rev_yoy = safe_float(row.get("TOTALOPERATEREVETZ"))
            profit_yoy = safe_float(row.get("PARENTNETPROFITTZ"))
            revenue_yoy_history.append(rev_yoy)
            profit_yoy_history.append(profit_yoy)
        
        latest_quarterly = client.select_latest_published_report(quarterly_reports, date.today())
        latest_rev_yoy = safe_float(latest_quarterly.get("TOTALOPERATEREVETZ")) if latest_quarterly else 0.0
        latest_profit_yoy = safe_float(latest_quarterly.get("PARENTNETPROFITTZ")) if latest_quarterly else 0.0
        
        def calculate_average(values):
            if not values:
                return 0.0
            if len(values) <= 2:
                return sum(values) / len(values)
            
            min_val = min(values)
            max_val = max(values)
            
            diff_ratio = abs(max_val - min_val) / abs(min_val) if min_val != 0 else float('inf')
            
            if diff_ratio > 3:
                filtered = [v for v in values if v != min_val and v != max_val]
                if len(filtered) >= 1:
                    return sum(filtered) / len(filtered)
                else:
                    return sum(values) / len(values)
            else:
                return sum(values) / len(values)
        
        avg_revenue_yoy = calculate_average(revenue_yoy_history)
        avg_net_profit_yoy = calculate_average(profit_yoy_history)
        
        predicted_revenue_growth = (avg_revenue_yoy * 5 + latest_rev_yoy) / 6
        predicted_profit_growth = (avg_net_profit_yoy * 5 + latest_profit_yoy) / 6
        
        predicted_revenue = revenue_base * (1 + predicted_revenue_growth / 100)
        predicted_net_profit = net_profit_base * (1 + predicted_profit_growth / 100)
        
        ps_ratio = (total_market_value / 100000000) / revenue_base if revenue_base > 0 else None
        pe_ratio = current_price / eps_base if eps_base > 0 else None
        
        predicted_price_ps = None
        predicted_price_pe = None
        
        if ps_ratio is not None and predicted_revenue > 0 and total_share > 0:
            predicted_price_ps = (ps_ratio * predicted_revenue * 100000000) / total_share
        
        if pe_ratio is not None and predicted_net_profit > 0 and total_share > 0:
            predicted_price_pe = (predicted_net_profit * 100000000 * pe_ratio) / total_share
        
        recommended_price = predicted_price_pe if is_heavy_asset else predicted_price_ps
        
        return {
            "success": True,
            "data": {
                "stock_code": quote.get("stock_code"),
                "stock_name": quote.get("stock_name"),
                "current_price": round(current_price, 2),
                "asset_type": "重资产" if is_heavy_asset else "轻资产",
                "valuation_method": "PE" if is_heavy_asset else "PS",
                "base_year": base_year,
                "predicted_year": predicted_year,
                "historical_years": years,
                "latest_report_date": latest_date.isoformat(),
                "total_market_value": round(total_market_value, 2),
                "total_share": round(total_share, 2),
                "revenue_base": round(revenue_base, 2),
                "net_profit_base": round(net_profit_base, 2),
                "eps_base": round(eps_base, 4),
                "predicted_revenue_growth": round(predicted_revenue_growth, 2),
                "predicted_profit_growth": round(predicted_profit_growth, 2),
                "predicted_revenue": round(predicted_revenue, 2),
                "predicted_net_profit": round(predicted_net_profit, 2),
                "ps_ratio": round(ps_ratio, 2) if ps_ratio else None,
                "pe_ratio": round(pe_ratio, 2) if pe_ratio else None,
                "predicted_price_ps": round(predicted_price_ps, 2) if predicted_price_ps else None,
                "predicted_price_pe": round(predicted_price_pe, 2) if predicted_price_pe else None,
                "recommended_price": round(recommended_price, 2) if recommended_price else None,
            }
        }
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取数据失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_stock_price(code: str) -> dict:
    try:
        identity = normalize_stock_code(code)
        quote = client.get_current_quote(code)
        return {"success": True, "data": quote}
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取股票报价失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_balance_sheet_assets(code: str) -> dict:
    try:
        assets = client.get_balance_sheet_assets(code)
        return {"success": True, "data": assets}
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取资产负债表失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_income_statement(code: str) -> dict:
    try:
        identity = normalize_stock_code(code)
        reports = client.fetch_main_indicators(identity, quarterly=True)
        latest_report = client.select_latest_published_report(reports, date.today())
        
        if not latest_report:
            raise EastmoneyError(f"no published financial report found for {identity.secucode}")
        
        def safe_float(value):
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0
        
        return {
            "success": True,
            "data": {
                "stock_code": identity.secucode,
                "report_date": latest_report.get("REPORT_DATE") or "",
                "report_type": latest_report.get("REPORT_TYPE") or "",
                "total_revenue": round(safe_float(latest_report.get("TOTALOPERATEREVE")) / 100000000, 2),
                "total_revenue_yoy": round(safe_float(latest_report.get("TOTALOPERATEREVETZ")), 2),
                "net_profit": round(safe_float(latest_report.get("PARENTNETPROFIT")) / 100000000, 2),
                "net_profit_yoy": round(safe_float(latest_report.get("PARENTNETPROFITTZ")), 2),
                "eps": round(safe_float(latest_report.get("EPSJB")), 2),
                "book_value_per_share": round(safe_float(latest_report.get("BPS")), 2),
            },
        }
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取利润表失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_valuation_method(code: str) -> dict:
    try:
        assets = client.get_balance_sheet_assets(code)
        investment_real_estate = assets.get("investment_real_estate", 0)
        construction_in_progress = assets.get("construction_in_progress", 0)
        fixed_asset = assets.get("fixed_asset", 0)
        total_assets = assets.get("total_assets", 0)

        heavy_asset_sum = investment_real_estate + construction_in_progress + fixed_asset
        asset_ratio = (heavy_asset_sum / total_assets * 100) if total_assets > 0 else None
        is_heavy_asset = asset_ratio is not None and asset_ratio > 40

        return {
            "success": True,
            "data": {
                "stock_code": assets.get("stock_code"),
                "asset_type": "重资产" if is_heavy_asset else "轻资产",
                "valuation_method": "PE" if is_heavy_asset else "PS",
                "valuation_method_name": "市盈率估值法" if is_heavy_asset else "市销率估值法",
                "investment_real_estate": investment_real_estate,
                "construction_in_progress": construction_in_progress,
                "fixed_asset": fixed_asset,
                "heavy_asset_sum": heavy_asset_sum,
                "total_assets": total_assets,
                "asset_ratio": round(asset_ratio, 2) if asset_ratio else None,
                "rule": "投资性房地产+在建工程+固定资产 > 总资产40% 使用市盈率(PE)估值法，否则使用市销率(PS)估值法",
            }
        }
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取数据失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_financial_data(code: str) -> dict:
    try:
        identity = normalize_stock_code(code)
        quarterly_reports = client.fetch_main_indicators(identity, quarterly=True)
        annual_reports = client.fetch_main_indicators(identity, quarterly=False)

        latest_quarterly = client.select_latest_published_report(quarterly_reports, date.today())
        latest_annual = client.select_latest_published_report(annual_reports, date.today())

        latest_date = datetime.strptime(latest_annual.get("REPORT_DATE", "").split()[0], "%Y-%m-%d").date() if latest_annual else date.today()
        years = list(range(latest_date.year, latest_date.year - 5, -1))
        annual_history = client.select_annual_history(annual_reports, years)

        def safe_float(value):
            if value is None or value == "" or value == "--":
                return 0.0
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        latest_data = {}
        if latest_quarterly:
            latest_data = {
                "report_date": latest_quarterly.get("REPORT_DATE", "").split()[0],
                "report_type": latest_quarterly.get("REPORT_TYPE", ""),
                "total_revenue": round(safe_float(latest_quarterly.get("TOTALOPERATEREVE")) / 100000000, 2),
                "total_revenue_yoy": round(safe_float(latest_quarterly.get("TOTALOPERATEREVETZ")), 2),
                "net_profit": round(safe_float(latest_quarterly.get("PARENTNETPROFIT")) / 100000000, 2),
                "net_profit_yoy": round(safe_float(latest_quarterly.get("PARENTNETPROFITTZ")), 2),
            }

        historical_data = []
        for row in annual_history:
            historical_data.append({
                "report_date": row.get("REPORT_DATE", "").split()[0],
                "report_type": row.get("REPORT_TYPE", ""),
                "total_revenue": round(safe_float(row.get("TOTALOPERATEREVE")) / 100000000, 2),
                "total_revenue_yoy": round(safe_float(row.get("TOTALOPERATEREVETZ")), 2),
                "net_profit": round(safe_float(row.get("PARENTNETPROFIT")) / 100000000, 2),
                "net_profit_yoy": round(safe_float(row.get("PARENTNETPROFITTZ")), 2),
            })

        return {
            "success": True,
            "data": {
                "stock_code": identity.secucode,
                "stock_name": latest_quarterly.get("SECURITY_NAME_ABBR") if latest_quarterly else "",
                "latest_report": latest_data,
                "historical_reports": historical_data,
            }
        }
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取财务数据失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}


def get_compound_growth(code: str) -> dict:
    try:
        identity = normalize_stock_code(code)
        quarterly_reports = client.fetch_main_indicators(identity, quarterly=True)
        annual_reports = client.fetch_main_indicators(identity, quarterly=False)

        latest_quarterly = client.select_latest_published_report(quarterly_reports, date.today())
        latest_annual = client.select_latest_published_report(annual_reports, date.today())

        latest_date = datetime.strptime(latest_annual.get("REPORT_DATE", "").split()[0], "%Y-%m-%d").date() if latest_annual else date.today()
        current_year = latest_date.year + 1
        years = list(range(latest_date.year, latest_date.year - 5, -1))
        annual_history = client.select_annual_history(annual_reports, years)

        revenue_history = []
        net_profit_history = []
        revenue_yoy_history = []
        profit_yoy_history = []

        for row in annual_history:
            rev = float(row.get("TOTALOPERATEREVE", 0))
            profit = float(row.get("PARENTNETPROFIT", 0))
            rev_yoy = float(row.get("TOTALOPERATEREVETZ", 0))
            profit_yoy = float(row.get("PARENTNETPROFITTZ", 0))
            if rev > 0:
                revenue_history.append(rev)
            if profit > 0:
                net_profit_history.append(profit)
            revenue_yoy_history.append(rev_yoy)
            profit_yoy_history.append(profit_yoy)

        latest_rev_yoy = float(latest_quarterly.get("TOTALOPERATEREVETZ", 0)) if latest_quarterly else None
        latest_profit_yoy = float(latest_quarterly.get("PARENTNETPROFITTZ", 0)) if latest_quarterly else None

        avg_revenue_amount = sum(revenue_history) / len(revenue_history) / 100000000 if revenue_history else None
        avg_net_profit_amount = sum(net_profit_history) / len(net_profit_history) / 100000000 if net_profit_history else None

        def calculate_average(values):
            if not values:
                return None
            if len(values) <= 2:
                return sum(values) / len(values)
            
            min_val = min(values)
            max_val = max(values)
            
            diff_ratio = abs(max_val - min_val) / abs(min_val) if min_val != 0 else float('inf')
            
            if diff_ratio > 3:
                filtered = [v for v in values if v != min_val and v != max_val]
                if len(filtered) >= 1:
                    return sum(filtered) / len(filtered)
                else:
                    return sum(values) / len(values)
            else:
                return sum(values) / len(values)

        avg_revenue_yoy = calculate_average(revenue_yoy_history)
        avg_net_profit_yoy = calculate_average(profit_yoy_history)

        revenue_cagr = None
        if len(revenue_history) >= 2:
            years_diff = len(revenue_history) - 1
            revenue_cagr = ((revenue_history[-1] / revenue_history[0]) ** (1 / years_diff) - 1) * 100

        profit_cagr = None
        if len(net_profit_history) >= 2:
            years_diff = len(net_profit_history) - 1
            profit_cagr = ((net_profit_history[-1] / net_profit_history[0]) ** (1 / years_diff) - 1) * 100

        predicted_revenue_growth = None
        predicted_profit_growth = None
        if avg_revenue_yoy is not None and latest_rev_yoy is not None:
            predicted_revenue_growth = (avg_revenue_yoy * 5 + latest_rev_yoy) / 6
        if avg_net_profit_yoy is not None and latest_profit_yoy is not None:
            predicted_profit_growth = (avg_net_profit_yoy * 5 + latest_profit_yoy) / 6

        return {
            "success": True,
            "data": {
                "current_year": current_year,
                "avg_revenue_amount": round(avg_revenue_amount, 2) if avg_revenue_amount else None,
                "avg_net_profit_amount": round(avg_net_profit_amount, 2) if avg_net_profit_amount else None,
                "avg_revenue_yoy": round(avg_revenue_yoy, 2) if avg_revenue_yoy else None,
                "revenue_cagr": round(revenue_cagr, 2) if revenue_cagr else None,
                "avg_net_profit_yoy": round(avg_net_profit_yoy, 2) if avg_net_profit_yoy else None,
                "profit_cagr": round(profit_cagr, 2) if profit_cagr else None,
                "predicted_revenue_growth": round(predicted_revenue_growth, 2) if predicted_revenue_growth else None,
                "predicted_profit_growth": round(predicted_profit_growth, 2) if predicted_profit_growth else None,
            }
        }
    except ValueError as exc:
        return {"success": False, "detail": f"无效的股票代码: {str(exc)}"}
    except EastmoneyError as exc:
        return {"success": False, "detail": f"从东方财富获取数据失败: {str(exc)}"}
    except Exception as exc:
        return {"success": False, "detail": f"服务器内部错误: {str(exc)}"}
