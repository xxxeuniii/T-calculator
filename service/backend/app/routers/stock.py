from fastapi import APIRouter, HTTPException
from ..services.stock_service import (
    get_stock_price,
    get_balance_sheet_assets,
    get_income_statement,
    get_valuation_method,
    get_financial_data,
    get_compound_growth,
    get_stock_prediction,
)

router = APIRouter(prefix="/api/v1/stocks", tags=["stocks"])


@router.get("/{code}/price")
def stock_price(code: str):
    result = get_stock_price(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result


@router.get("/{code}/balance-sheet/assets")
def balance_sheet_assets(code: str):
    result = get_balance_sheet_assets(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result


@router.get("/{code}/income-statement")
def income_statement(code: str):
    result = get_income_statement(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result


@router.get("/{code}/valuation-method")
def valuation_method(code: str):
    result = get_valuation_method(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result


@router.get("/{code}/financial-data")
def financial_data(code: str):
    result = get_financial_data(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result


@router.get("/{code}/compound-growth")
def compound_growth(code: str):
    result = get_compound_growth(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result


@router.get("/{code}/prediction")
def stock_prediction(code: str):
    result = get_stock_prediction(code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["detail"])
    return result
