"""
Main entrypoint that runs both the API server and the scheduler.
"""

import logging
import uvicorn

from src.api.main import app
from src.scheduler import create_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    force=True  # Clear any existing handlers to avoid duplicates
)

logger = logging.getLogger(__name__)


def main():
    # Start the scheduler
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("Scheduler started")

    # Run the API server
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
