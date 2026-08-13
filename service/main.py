import json
import os
import re
import sqlite3
from contextlib import closing
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB_PATH = os.getenv("TRADE_TOOL_DB", os.path.join(os.path.dirname(__file__), "data", "trade-tool.db"))

app = FastAPI(title="Trade Tool API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://127.0.0.1:8081"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with closing(connect()) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS attendance_record (
                attendance_date TEXT PRIMARY KEY,
                status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS trade_history (
                history_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        connection.commit()


@app.on_event("startup")
def startup():
    init_db()


class AttendancePayload(BaseModel):
    date: str
    status: Literal["present", "absent"] | None = None


class HistoryPayload(BaseModel):
    record: dict[str, Any]


@app.get("/api/health")
def health():
    return {"success": True, "data": "ok"}


@app.get("/api/attendance/{month}")
def get_attendance(month: str):
    if not re.fullmatch(r"\d{4}-\d{2}", month):
        raise HTTPException(status_code=400, detail="month must use YYYY-MM")
    with closing(connect()) as connection:
        rows = connection.execute(
            "SELECT attendance_date, status FROM attendance_record WHERE attendance_date LIKE ? ORDER BY attendance_date",
            (f"{month}-%",),
        ).fetchall()
    return {"success": True, "data": {row["attendance_date"]: row["status"] for row in rows}}


@app.post("/api/attendance")
def update_attendance(payload: AttendancePayload):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", payload.date):
        raise HTTPException(status_code=400, detail="date must use YYYY-MM-DD")
    with closing(connect()) as connection:
        if payload.status is None:
            connection.execute("DELETE FROM attendance_record WHERE attendance_date = ?", (payload.date,))
        else:
            connection.execute(
                """INSERT INTO attendance_record (attendance_date, status, updated_at)
                   VALUES (?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(attendance_date) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP""",
                (payload.date, payload.status),
            )
        connection.commit()
    return {"success": True, "data": payload.model_dump()}


@app.get("/api/trade-history")
def get_trade_history():
    with closing(connect()) as connection:
        rows = connection.execute("SELECT payload FROM trade_history ORDER BY created_at DESC, history_id DESC").fetchall()
    return {"success": True, "data": [json.loads(row["payload"]) for row in rows]}


@app.post("/api/trade-history")
def save_trade_history(payload: HistoryPayload):
    history_id = payload.record.get("id")
    if not history_id:
        raise HTTPException(status_code=400, detail="record.id is required")
    with closing(connect()) as connection:
        connection.execute(
            """INSERT INTO trade_history (history_id, payload, created_at, updated_at)
               VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT(history_id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP""",
            (str(history_id), json.dumps(payload.record, ensure_ascii=False)),
        )
        connection.commit()
    return {"success": True, "data": payload.record}


@app.delete("/api/trade-history")
def clear_trade_history():
    with closing(connect()) as connection:
        connection.execute("DELETE FROM trade_history")
        connection.commit()
    return {"success": True, "data": []}
