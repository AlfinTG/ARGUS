import argparse
import logging
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Optional

from app.db.session import SessionLocal
from app.services.rules_engine import evaluate_rules, get_or_create_rule_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [ARGUS-WORKER] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("argus.worker")

# Global flag for graceful termination
_keep_running = True

def _handle_shutdown_signal(signum, frame):
    global _keep_running
    sig_name = signal.Signals(signum).name
    logger.info(f"Received {sig_name}. Initiating graceful shutdown after active cycle completes...")
    _keep_running = False

def run_worker_cycle(db, as_of_date: Optional[str] = None):
    """Execute a single statutory rules evaluation cycle."""
    config = get_or_create_rule_config(db)
    ref_date = as_of_date or config.simulation_date
    logger.info(f"Beginning evaluation cycle against reference date: {ref_date}")

    result = evaluate_rules(db=db, as_of_date_str=ref_date)
    logger.info(
        f"Cycle completed: Scanned {result.evaluated_applications} cases, "
        f"{result.evaluated_compliance} obligations, {result.evaluated_documents} documents. "
        f"Alerts spawned: {result.alerts_spawned}, Skipped duplicates: {result.skipped_duplicates}."
    )
    return result

def main():
    parser = argparse.ArgumentParser(
        description="ARGUS Autonomous Regulatory Rules & Deadline Worker Daemon"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Polling interval in seconds between evaluation cycles (default: 60)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Execute exactly one evaluation cycle and exit immediately",
    )
    parser.add_argument(
        "--as-of-date",
        type=str,
        default=None,
        help="Simulation reference date in YYYY-MM-DD format (defaults to config simulation_date)",
    )

    args = parser.parse_args()

    # Register OS signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, _handle_shutdown_signal)
    signal.signal(signal.SIGTERM, _handle_shutdown_signal)

    logger.info(
        f"ARGUS Background Worker Daemon started (interval={args.interval}s, "
        f"mode={'single-run' if args.once else 'continuous'})"
    )

    while _keep_running:
        db = SessionLocal()
        try:
            run_worker_cycle(db, as_of_date=args.as_of_date)
        except Exception as exc:
            logger.error(f"Error during worker evaluation cycle: {exc}", exc_info=True)
        finally:
            db.close()

        if args.once or not _keep_running:
            break

        # Sleep in short increments to allow rapid responsive shutdown on SIGINT/SIGTERM
        for _ in range(args.interval):
            if not _keep_running:
                break
            time.sleep(1)

    logger.info("ARGUS Background Worker Daemon terminated cleanly.")
    sys.exit(0)

if __name__ == "__main__":
    main()
