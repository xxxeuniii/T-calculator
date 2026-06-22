from pydantic import BaseModel
from typing import Optional


class PriceResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    detail: Optional[str] = None


class BalanceSheetAssets(BaseModel):
    stock_code: str
    investment_real_estate: float
    construction_in_progress: float
    fixed_asset: float
    total_assets: float


class BalanceSheetResponse(BaseModel):
    success: bool
    data: Optional[BalanceSheetAssets] = None
    detail: Optional[str] = None


class IncomeStatement(BaseModel):
    stock_code: str
    report_date: str
    report_type: str
    total_revenue: float
    total_revenue_yoy: float
    net_profit: float
    net_profit_yoy: float
    eps: float
    book_value_per_share: float


class IncomeStatementResponse(BaseModel):
    success: bool
    data: Optional[IncomeStatement] = None
    detail: Optional[str] = None


class ValuationMethod(BaseModel):
    stock_code: str
    asset_type: str
    valuation_method: str
    valuation_method_name: str
    investment_real_estate: float
    construction_in_progress: float
    fixed_asset: float
    heavy_asset_sum: float
    total_assets: float
    asset_ratio: float
    rule: str


class ValuationMethodResponse(BaseModel):
    success: bool
    data: Optional[ValuationMethod] = None
    detail: Optional[str] = None


class FinancialReport(BaseModel):
    report_date: str
    total_revenue: float
    total_revenue_yoy: float
    net_profit: float
    net_profit_yoy: float


class FinancialDataResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    detail: Optional[str] = None


class CompoundGrowth(BaseModel):
    current_year: int
    avg_revenue_yoy: Optional[float]
    revenue_cagr: Optional[float]
    avg_net_profit_yoy: Optional[float]
    profit_cagr: Optional[float]
    predicted_revenue_growth: Optional[float]
    predicted_profit_growth: Optional[float]


class CompoundGrowthResponse(BaseModel):
    success: bool
    data: Optional[CompoundGrowth] = None
    detail: Optional[str] = None