import json
import os
import re
from contextlib import closing
from typing import Any, Literal

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Trade Tool API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://127.0.0.1:8081", "http://106.53.77.119"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def connect():
    """Open the trade-tool PostgreSQL connection from server environment variables."""
    return psycopg2.connect(
        host=os.getenv("PG_HOST", "host.docker.internal"),
        port=int(os.getenv("PG_PORT", "5432")),
        database=os.getenv("PG_DATABASE", "stock_data"),
        user=os.getenv("PG_USER", "trade_agent"),
        password=os.environ["PG_PASSWORD"],
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def init_db():
    """Create tables owned by trade-tool when the service starts."""
    with closing(connect()) as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS trade_tool_attendance (
                attendance_date TEXT PRIMARY KEY,
                status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS trade_tool_history (
                history_id TEXT PRIMARY KEY,
                payload JSONB NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        cursor.execute(
            """
            DO $$
            BEGIN
                IF to_regclass('public.attendance_record') IS NOT NULL THEN
                    INSERT INTO trade_tool_attendance (attendance_date, status, updated_at)
                    SELECT attendance_date, status, updated_at FROM attendance_record
                    WHERE status IN ('present', 'absent')
                    ON CONFLICT (attendance_date) DO NOTHING;
                END IF;
                IF to_regclass('public.trade_history') IS NOT NULL THEN
                    INSERT INTO trade_tool_history (history_id, payload, created_at, updated_at)
                    SELECT history_id, payload, created_at, updated_at FROM trade_history
                    ON CONFLICT (history_id) DO NOTHING;
                END IF;
            END $$;
            """
        )
        connection.commit()


@app.on_event("startup")
def startup():
    """Initialize trade-tool database tables."""
    init_db()


class AttendancePayload(BaseModel):
    date: str
    status: Literal["present", "absent"] | None = None


class HistoryPayload(BaseModel):
    record: dict[str, Any]


@app.get("/api/health")
def health():
    """Report service and database health."""
    with closing(connect()) as connection, connection.cursor() as cursor:
        cursor.execute("SELECT 1 AS ok")
        cursor.fetchone()
    return {"success": True, "data": "ok"}


@app.get("/api/attendance/{month}")
def get_attendance(month: str):
    """Read one month of attendance records."""
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise HTTPException(status_code=400, detail="month must use YYYY-MM")
    with closing(connect()) as connection, connection.cursor() as cursor:
        cursor.execute(
            "SELECT attendance_date, status FROM trade_tool_attendance WHERE attendance_date LIKE %s ORDER BY attendance_date",
            (f"{month}-%",),
        )
        rows = cursor.fetchall()
    return {"success": True, "data": {row["attendance_date"]: row["status"] for row in rows}}


@app.post("/api/attendance")
def update_attendance(payload: AttendancePayload):
    """Create, update, or delete one attendance record."""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", payload.date):
        raise HTTPException(status_code=400, detail="date must use YYYY-MM-DD")
    with closing(connect()) as connection, connection.cursor() as cursor:
        if payload.status is None:
            cursor.execute("DELETE FROM trade_tool_attendance WHERE attendance_date = %s", (payload.date,))
        else:
            cursor.execute(
                """INSERT INTO trade_tool_attendance (attendance_date, status, updated_at)
                   VALUES (%s, %s, CURRENT_TIMESTAMP)
                   ON CONFLICT(attendance_date) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP""",
                (payload.date, payload.status),
            )
        connection.commit()
    return {"success": True, "data": payload.model_dump()}


@app.get("/api/trade-history")
def get_trade_history():
    """Read all trade calculator history from PostgreSQL."""
    with closing(connect()) as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM trade_tool_history ORDER BY created_at DESC, history_id DESC")
        rows = cursor.fetchall()
    return {"success": True, "data": [row["payload"] for row in rows]}


@app.post("/api/trade-history")
def save_trade_history(payload: HistoryPayload):
    """Create or update one trade calculator history record."""
    history_id = payload.record.get("id")
    if not history_id:
        raise HTTPException(status_code=400, detail="record.id is required")
    with closing(connect()) as connection, connection.cursor() as cursor:
        cursor.execute(
            """INSERT INTO trade_tool_history (history_id, payload, updated_at)
               VALUES (%s, %s::jsonb, CURRENT_TIMESTAMP)
               ON CONFLICT(history_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP""",
            (str(history_id), json.dumps(payload.record, ensure_ascii=False)),
        )
        connection.commit()
    return {"success": True, "data": payload.record}


@app.post("/api/trade-history/clear")
def clear_trade_history():
    """Delete all trade calculator history records."""
    with closing(connect()) as connection, connection.cursor() as cursor:
        cursor.execute("DELETE FROM trade_tool_history")
        connection.commit()
    return {"success": True, "data": []}
