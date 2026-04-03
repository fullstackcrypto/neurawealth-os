"""
NeuraWealth OS Telegram Bot — SQLite Database Handler
=====================================================
Manages users, portfolios, price alerts, signal tracking with accuracy,
referral system, and free-trial state.

All public methods are synchronous but safe to call from async code
via ``asyncio.to_thread`` (used internally by the bot).
"""

from __future__ import annotations

import hashlib
import logging
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator, Optional

from config import DATABASE_PATH, FREE_TRIAL_DAYS, REFERRAL_BONUS_DAYS

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
                    last_seen       TEXT    NOT NULL DEFAULT (datetime('now')),
                    trial_started   TEXT,
                    trial_notified  INTEGER NOT NULL DEFAULT 0,
                    referral_code   TEXT    UNIQUE,
                    referred_by     INTEGER,
                    referral_count  INTEGER NOT NULL DEFAULT 0
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
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    coin_id         TEXT    NOT NULL,
                    symbol          TEXT    NOT NULL DEFAULT '',
                    signal_type     TEXT    NOT NULL,
                    confidence      REAL    NOT NULL,
                    price           REAL    NOT NULL,
                    target_price    REAL,
                    stop_loss       REAL,
                    reasoning       TEXT,
                    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
                    checked_at      TEXT,
                    outcome_price   REAL,
                    outcome         TEXT,
                    pnl_percent     REAL
                );

                CREATE TABLE IF NOT EXISTS referrals (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    referrer_id     INTEGER NOT NULL,
                    referred_id     INTEGER NOT NULL,
                    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
                    bonus_applied   INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (referrer_id) REFERENCES users(user_id),
                    FOREIGN KEY (referred_id) REFERENCES users(user_id),
                    UNIQUE(referred_id)
                );
                """
            )
            # Migration: add columns if they don't exist (safe for existing DBs)
            for col, default in [
                ("trial_started", "NULL"),
                ("trial_notified", "0"),
                ("referral_code", "NULL"),
                ("referred_by", "NULL"),
                ("referral_count", "0"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT DEFAULT {default}")
                except sqlite3.OperationalError:
                    pass  # column already exists

            for col, default in [
                ("symbol", "''"),
                ("target_price", "NULL"),
                ("stop_loss", "NULL"),
                ("checked_at", "NULL"),
                ("outcome_price", "NULL"),
                ("outcome", "NULL"),
                ("pnl_percent", "NULL"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE signal_log ADD COLUMN {col} TEXT DEFAULT {default}")
                except sqlite3.OperationalError:
                    pass

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
                "SELECT * FROM users WHERE is_active = 1 AND tier IN ('premium', 'enterprise', 'trial')"
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

    # ── Free Trial ────────────────────────────────────────────────────────

    def start_trial(self, user_id: int) -> None:
        """Activate a free trial for the user."""
        with self._cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET tier = 'trial', trial_started = datetime('now'), trial_notified = 0
                WHERE user_id = ?
                """,
                (user_id,),
            )

    def get_expired_trials(self) -> list[dict[str, Any]]:
        """Return trial users whose trial has expired."""
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT * FROM users
                WHERE tier = 'trial'
                  AND trial_started IS NOT NULL
                  AND datetime(trial_started, ? || ' days') <= datetime('now')
                """,
                (f"+{FREE_TRIAL_DAYS}",),
            )
            return [dict(r) for r in cur.fetchall()]

    def expire_trial(self, user_id: int) -> None:
        """Downgrade a trial user back to free."""
        with self._cursor() as cur:
            cur.execute(
                "UPDATE users SET tier = 'free', trial_notified = 1 WHERE user_id = ?",
                (user_id,),
            )

    # ── Referral System ───────────────────────────────────────────────────

    def generate_referral_code(self, user_id: int) -> str:
        """Generate or return existing referral code for a user."""
        user = self.get_user(user_id)
        if user and user.get("referral_code"):
            return user["referral_code"]
        code = hashlib.md5(f"nw_{user_id}".encode()).hexdigest()[:8]
        with self._cursor() as cur:
            cur.execute(
                "UPDATE users SET referral_code = ? WHERE user_id = ?",
                (code, user_id),
            )
        return code

    def get_user_by_referral_code(self, code: str) -> Optional[dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM users WHERE referral_code = ?", (code,))
            row = cur.fetchone()
            return dict(row) if row else None

    def record_referral(self, referrer_id: int, referred_id: int) -> bool:
        """Record a referral. Returns True if new, False if duplicate."""
        try:
            with self._cursor() as cur:
                cur.execute(
                    "INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)",
                    (referrer_id, referred_id),
                )
                cur.execute(
                    "UPDATE users SET referral_count = referral_count + 1 WHERE user_id = ?",
                    (referrer_id,),
                )
                cur.execute(
                    "UPDATE users SET referred_by = ? WHERE user_id = ?",
                    (referrer_id, referred_id),
                )
            return True
        except sqlite3.IntegrityError:
            return False

    def get_referral_count(self, user_id: int) -> int:
        user = self.get_user(user_id)
        return user["referral_count"] if user else 0

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

    # ── Signal Log (Enhanced with Accuracy Tracking) ─────────────────────

    def log_signal(
        self,
        coin_id: str,
        signal_type: str,
        confidence: float,
        price: float,
        reasoning: str,
        symbol: str = "",
        target_price: Optional[float] = None,
        stop_loss: Optional[float] = None,
    ) -> int:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO signal_log
                    (coin_id, symbol, signal_type, confidence, price, target_price, stop_loss, reasoning)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (coin_id, symbol, signal_type, confidence, price, target_price, stop_loss, reasoning),
            )
            return cur.lastrowid  # type: ignore[return-value]

    def get_unchecked_signals(self, min_age_hours: int = 24) -> list[dict[str, Any]]:
        """Get signals older than min_age_hours that haven't been checked yet."""
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT * FROM signal_log
                WHERE checked_at IS NULL
                  AND signal_type IN ('BUY', 'SELL')
                  AND created_at <= datetime('now', ? || ' hours')
                ORDER BY created_at ASC
                """,
                (f"-{min_age_hours}",),
            )
            return [dict(r) for r in cur.fetchall()]

    def update_signal_outcome(
        self,
        signal_id: int,
        outcome_price: float,
        outcome: str,
        pnl_percent: float,
    ) -> None:
        """Record the outcome of a signal after 24h."""
        with self._cursor() as cur:
            cur.execute(
                """
                UPDATE signal_log
                SET checked_at = datetime('now'),
                    outcome_price = ?,
                    outcome = ?,
                    pnl_percent = ?
                WHERE id = ?
                """,
                (outcome_price, outcome, pnl_percent, signal_id),
            )

    def get_accuracy_stats(self, days: int = 7) -> dict[str, Any]:
        """Get accuracy statistics for the given time window."""
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN outcome = 'correct' THEN 1 ELSE 0 END) as correct,
                    SUM(CASE WHEN outcome = 'incorrect' THEN 1 ELSE 0 END) as incorrect,
                    AVG(CASE WHEN outcome = 'correct' THEN pnl_percent ELSE NULL END) as avg_gain,
                    AVG(CASE WHEN outcome = 'incorrect' THEN pnl_percent ELSE NULL END) as avg_loss,
                    MAX(pnl_percent) as best_pnl,
                    MIN(pnl_percent) as worst_pnl
                FROM signal_log
                WHERE checked_at IS NOT NULL
                  AND signal_type IN ('BUY', 'SELL')
                  AND created_at >= datetime('now', ? || ' days')
                """,
                (f"-{days}",),
            )
            row = cur.fetchone()
            if row:
                total = row["total"] or 0
                correct = row["correct"] or 0
                return {
                    "total": total,
                    "correct": correct,
                    "incorrect": row["incorrect"] or 0,
                    "accuracy": (correct / total * 100) if total > 0 else 0.0,
                    "avg_gain": row["avg_gain"] or 0.0,
                    "avg_loss": row["avg_loss"] or 0.0,
                    "best_pnl": row["best_pnl"] or 0.0,
                    "worst_pnl": row["worst_pnl"] or 0.0,
                }
            return {"total": 0, "correct": 0, "incorrect": 0, "accuracy": 0.0,
                    "avg_gain": 0.0, "avg_loss": 0.0, "best_pnl": 0.0, "worst_pnl": 0.0}

    def get_best_worst_signals(self, days: int = 7) -> dict[str, Any]:
        """Get the best and worst performing signals in the window."""
        result: dict[str, Any] = {"best": None, "worst": None}
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT * FROM signal_log
                WHERE checked_at IS NOT NULL AND signal_type IN ('BUY', 'SELL')
                  AND created_at >= datetime('now', ? || ' days')
                ORDER BY pnl_percent DESC LIMIT 1
                """,
                (f"-{days}",),
            )
            row = cur.fetchone()
            if row:
                result["best"] = dict(row)

            cur.execute(
                """
                SELECT * FROM signal_log
                WHERE checked_at IS NOT NULL AND signal_type IN ('BUY', 'SELL')
                  AND created_at >= datetime('now', ? || ' days')
                ORDER BY pnl_percent ASC LIMIT 1
                """,
                (f"-{days}",),
            )
            row = cur.fetchone()
            if row:
                result["worst"] = dict(row)
        return result

    def get_total_signals(self) -> int:
        with self._cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM signal_log")
            return cur.fetchone()[0]

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
                "SELECT COUNT(*) FROM users WHERE is_active = 1 AND tier IN ('premium','enterprise','trial')"
            )
            premium = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM alerts WHERE is_active = 1")
            alerts = cur.fetchone()[0]
            return {
                "total_users": total,
                "premium_users": premium,
                "active_alerts": alerts,
            }
