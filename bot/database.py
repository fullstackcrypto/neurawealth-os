"""
NeuraWealth OS Telegram Bot — SQLite Database Handler
=====================================================
Manages users, portfolios, price alerts, and subscription state.
All public methods are synchronous but safe to call from async code
via ``asyncio.to_thread`` (used internally by the bot).
"""

from __future__ import annotations

import logging
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator, Optional

from config import DATABASE_PATH

logger = logging.getLogger(__name__)


class Database:
    """Thread-safe SQLite wrapper for NeuraWealth bot data."""

    def __init__(self, db_path: str = DATABASE_PATH) -> None:
        self._db_path = db_path
        self._local = threading.local()
        self._init_schema()

    # ── Connection management ─────────────────────────────────────────────

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(self._db_path)
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA foreign_keys=ON")
        return self._local.conn

    @contextmanager
    def _cursor(self) -> Generator[sqlite3.Cursor, None, None]:
        conn = self._get_conn()
        cur = conn.cursor()
        try:
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()

    # ── Schema ────────────────────────────────────────────────────────────

    def _init_schema(self) -> None:
        with self._cursor() as cur:
            cur.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    user_id         INTEGER PRIMARY KEY,
                    username        TEXT,
                    first_name      TEXT,
                    tier            TEXT    NOT NULL DEFAULT 'free',
                    joined_at       TEXT    NOT NULL DEFAULT (datetime('now')),
                    welcome_step    INTEGER NOT NULL DEFAULT 0,
                    is_active       INTEGER NOT NULL DEFAULT 1,
                    stripe_customer TEXT,
                    last_seen       TEXT    NOT NULL DEFAULT (datetime('now'))
                );

                CREATE TABLE IF NOT EXISTS portfolios (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id     INTEGER NOT NULL,
                    coin_id     TEXT    NOT NULL,
                    symbol      TEXT    NOT NULL,
                    amount      REAL    NOT NULL DEFAULT 0,
                    added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (user_id) REFERENCES users(user_id),
                    UNIQUE(user_id, coin_id)
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id     INTEGER NOT NULL,
                    coin_id     TEXT    NOT NULL,
                    symbol      TEXT    NOT NULL,
                    target_price REAL   NOT NULL,
                    direction   TEXT    NOT NULL DEFAULT 'above',
                    is_active   INTEGER NOT NULL DEFAULT 1,
                    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
                    triggered_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                );

                CREATE TABLE IF NOT EXISTS signal_log (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    coin_id     TEXT    NOT NULL,
                    signal_type TEXT    NOT NULL,
                    confidence  REAL    NOT NULL,
                    price       REAL    NOT NULL,
                    reasoning   TEXT,
                    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
                );
                """
            )
        logger.info("Database schema initialised at %s", self._db_path)

    # ── User CRUD ─────────────────────────────────────────────────────────

    def upsert_user(
        self,
        user_id: int,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
    ) -> dict[str, Any]:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (user_id, username, first_name)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    username   = COALESCE(excluded.username, users.username),
                    first_name = COALESCE(excluded.first_name, users.first_name),
                    last_seen  = datetime('now'),
                    is_active  = 1
                """,
                (user_id, username, first_name),
            )
            cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else {}

    def get_user(self, user_id: int) -> Optional[dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_user_tier(self, user_id: int) -> str:
        user = self.get_user(user_id)
        return user["tier"] if user else "free"

    def set_user_tier(self, user_id: int, tier: str) -> None:
        with self._cursor() as cur:
            cur.execute(
                "UPDATE users SET tier = ? WHERE user_id = ?", (tier, user_id)
            )

    def get_all_active_users(self) -> list[dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM users WHERE is_active = 1")
            return [dict(r) for r in cur.fetchall()]

    def get_premium_users(self) -> list[dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                "SELECT * FROM users WHERE is_active = 1 AND tier IN ('premium', 'enterprise')"
            )
            return [dict(r) for r in cur.fetchall()]

    def update_welcome_step(self, user_id: int, step: int) -> None:
        with self._cursor() as cur:
            cur.execute(
                "UPDATE users SET welcome_step = ? WHERE user_id = ?",
                (step, user_id),
            )

    def get_welcome_step(self, user_id: int) -> int:
        user = self.get_user(user_id)
        return user["welcome_step"] if user else 0

    # ── Portfolio CRUD ────────────────────────────────────────────────────

    def add_to_portfolio(
        self, user_id: int, coin_id: str, symbol: str, amount: float
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO portfolios (user_id, coin_id, symbol, amount)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, coin_id) DO UPDATE SET
                    amount = portfolios.amount + excluded.amount
                """,
                (user_id, coin_id, symbol.upper(), amount),
            )

    def remove_from_portfolio(self, user_id: int, coin_id: str) -> bool:
        with self._cursor() as cur:
            cur.execute(
                "DELETE FROM portfolios WHERE user_id = ? AND coin_id = ?",
                (user_id, coin_id),
            )
            return cur.rowcount > 0

    def get_portfolio(self, user_id: int) -> list[dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                "SELECT * FROM portfolios WHERE user_id = ? ORDER BY added_at",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Alert CRUD ────────────────────────────────────────────────────────

    def create_alert(
        self,
        user_id: int,
        coin_id: str,
        symbol: str,
        target_price: float,
        direction: str = "above",
    ) -> int:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO alerts (user_id, coin_id, symbol, target_price, direction)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, coin_id, symbol.upper(), target_price, direction),
            )
            return cur.lastrowid  # type: ignore[return-value]

    def get_active_alerts(
        self, user_id: Optional[int] = None
    ) -> list[dict[str, Any]]:
        with self._cursor() as cur:
            if user_id is not None:
                cur.execute(
                    "SELECT * FROM alerts WHERE user_id = ? AND is_active = 1",
                    (user_id,),
                )
            else:
                cur.execute("SELECT * FROM alerts WHERE is_active = 1")
            return [dict(r) for r in cur.fetchall()]

    def trigger_alert(self, alert_id: int) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                UPDATE alerts
                SET is_active = 0, triggered_at = datetime('now')
                WHERE id = ?
                """,
                (alert_id,),
            )

    def delete_alert(self, alert_id: int, user_id: int) -> bool:
        with self._cursor() as cur:
            cur.execute(
                "DELETE FROM alerts WHERE id = ? AND user_id = ?",
                (alert_id, user_id),
            )
            return cur.rowcount > 0

    # ── Signal Log ────────────────────────────────────────────────────────

    def log_signal(
        self,
        coin_id: str,
        signal_type: str,
        confidence: float,
        price: float,
        reasoning: str,
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO signal_log (coin_id, signal_type, confidence, price, reasoning)
                VALUES (?, ?, ?, ?, ?)
                """,
                (coin_id, signal_type, confidence, price, reasoning),
            )

    def get_recent_signals(self, hours: int = 24) -> list[dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT * FROM signal_log
                WHERE created_at >= datetime('now', ? || ' hours')
                ORDER BY created_at DESC
                """,
                (f"-{hours}",),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Stats ─────────────────────────────────────────────────────────────

    def get_stats(self) -> dict[str, int]:
        with self._cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
            total = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM users WHERE is_active = 1 AND tier IN ('premium','enterprise')"
            )
            premium = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM alerts WHERE is_active = 1")
            alerts = cur.fetchone()[0]
            return {
                "total_users": total,
                "premium_users": premium,
                "active_alerts": alerts,
            }
