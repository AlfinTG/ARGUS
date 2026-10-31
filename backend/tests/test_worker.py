import os
import subprocess
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.db.init_db import init_db
from app.worker import run_worker_cycle

def test_worker_cycle_direct(db_session):
    """Test calling the worker cycle function directly with an isolated test session."""
    # First execution on test database
    res1 = run_worker_cycle(db_session, as_of_date="2026-10-26")
    assert res1.evaluated_applications >= 5
    assert res1.evaluated_compliance >= 2
    assert res1.evaluated_documents >= 3
    assert res1.alerts_spawned > 0
    assert res1.skipped_duplicates == 0

    first_spawned = res1.alerts_spawned

    # Re-run on the same date: idempotency test
    res2 = run_worker_cycle(db_session, as_of_date="2026-10-26")
    assert res2.alerts_spawned == 0
    assert res2.skipped_duplicates == first_spawned

def test_worker_cli_execution(tmp_path):
    """Test executing the worker CLI with --once argument via subprocess on an isolated SQLite database."""
    test_db_file = tmp_path / "test_worker_cli.db"
    db_url = f"sqlite:///{test_db_file}"

    # Initialize tables and seed data in the temporary sqlite database
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        init_db(session)
    finally:
        session.close()
        engine.dispose()

    # Pass DATABASE_URL in subprocess environment to isolate from PostgreSQL / CI
    env = {**os.environ, "DATABASE_URL": db_url}
    result = subprocess.run(
        [sys.executable, "-m", "app.worker", "--once", "--as-of-date", "2026-10-26"],
        capture_output=True,
        text=True,
        timeout=15,
        env=env,
    )
    assert result.returncode == 0
    assert "ARGUS Background Worker Daemon started" in result.stderr or "ARGUS Background Worker Daemon started" in result.stdout
    assert "Cycle completed" in result.stderr or "Cycle completed" in result.stdout
    assert "terminated cleanly" in result.stderr or "terminated cleanly" in result.stdout
