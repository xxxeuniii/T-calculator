# Valuation Data Service

FastAPI service for collecting valuation source data from Eastmoney.

## Run

```powershell
cd service/backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8001
```

Or start both frontend and backend from the project root:

```powershell
.\start-all.bat
```

For a server, keep the backend bound to `0.0.0.0`:

```powershell
set BACKEND_HOST=0.0.0.0
set BACKEND_PORT=8001
.\start-all.bat
```

For production deployment, use Docker Compose from the project root:

```powershell
docker compose up -d --build
```

The frontend container serves `/t-calculator/` and proxies `/api/` to the backend container.

## API

```text
GET /api/v1/stocks/{code}/price
GET /api/v1/stocks/{code}/balance-sheet/assets
```

Stock code examples: `000001`, `000001.SZ`, `SH600519`.

Current small endpoints return:

- current quote data: stock name, current price, total share, total market value
- latest balance sheet asset fields: investment real estate, construction in progress, fixed asset, total assets
- missing asset fields are returned as `0.0`
