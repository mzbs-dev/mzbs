import logging
from datetime import datetime
import os
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Configure logging with rotation
log_file = os.path.join(logs_dir, f'app_{datetime.now().strftime("%Y%m%d")}.log')
max_bytes = 10 * 1024 * 1024  # 10MB per file
backup_count = 5  # Keep 5 backup files

# Create rotating file handler
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=max_bytes,
    backupCount=backup_count,
    encoding='utf-8'
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        file_handler,
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Clean up old log files
def cleanup_old_logs(max_files=5):
    """Delete old log files keeping only the most recent ones"""
    try:
        log_files = [f for f in os.listdir(logs_dir) if f.startswith('app_') and f.endswith('.log')]
        log_files.sort(reverse=True)  # Sort newest first
        
        # Count files to be deleted
        files_to_delete = log_files[max_files:]
        if files_to_delete:
            logger.info(f"Found {len(files_to_delete)} old log files to clean up")
            
            # Remove excess files
            for old_file in files_to_delete:
                file_path = os.path.join(logs_dir, old_file)
                os.remove(file_path)
                logger.info(f"Deleted old log file: {old_file}")
                
            logger.info("Log cleanup completed successfully")
        else:
            logger.info("No old log files to clean up")
            
    except Exception as e:
        logger.error(f"Error during log cleanup: {str(e)}")
        raise

# Call cleanup on startup
cleanup_old_logs()