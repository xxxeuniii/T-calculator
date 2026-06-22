# Valuation Data Service

FastAPI service for collecting valuation source data from Eastmoney.

## Run

```powershell
cd service/backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Or start both frontend and backend from the project root:

```powershell
.\start-all.bat
```

For a server, keep the backend bound to `0.0.0.0`:

```powershell
set BACKEND_HOST=0.0.0.0
set BACKEND_PORT=8000
.\start-all.bat
```

For production deployment, use Docker Compose from the project root:

```powershell
docker compose up -d --build
```

The frontend container serves `/t-calculator/` and proxies `/api/` to the backend container.

## API

```text
GET /api/v1/stocks/{code}/valuation-source
GET /api/v1/stocks/{code}/valuation-source?as_of=2026-06-22
```

Stock code examples: `000001`, `000001.SZ`, `SH600519`.

The response contains:

- basic quote data: stock name, industry, close price, total share, total market value
- latest published report data chosen by `as_of`
- latest balance sheet asset fields when Eastmoney exposes them
- last full fiscal year EPS and revenue
- five full years of annual history used by the valuation model
