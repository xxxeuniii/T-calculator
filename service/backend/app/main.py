from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.stock import router as stock_router


app = FastAPI(title="T Calculator Valuation Data Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/health")
def api_health():
    return health()