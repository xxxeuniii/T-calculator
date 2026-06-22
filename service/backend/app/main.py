from __future__ import annotations

from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .eastmoney_client import EastmoneyClient, EastmoneyError


app = FastAPI(title="T Calculator Valuation Data Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = EastmoneyClient()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return health()


@app.get("/api/v1/stocks/{code}/valuation-source")
def valuation_source(
    code: str,
    as_of: date | None = Query(default=None, description="Use YYYY-MM-DD to test report window logic."),
) -> dict[str, object]:
    try:
        return {"success": True, "data": client.get_valuation_source_data(code, as_of=as_of)}
    except (ValueError, EastmoneyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
