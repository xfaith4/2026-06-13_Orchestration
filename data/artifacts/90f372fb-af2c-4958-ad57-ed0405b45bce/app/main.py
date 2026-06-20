import logging
from app.initialization import ApplicationInitializer
from app.utils.filesystem import DataDirectory


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Global application initializer (singleton)
_app_initializer: ApplicationInitializer = None


def initialize_app(config: dict = None) -> ApplicationInitializer:
    """
    Initialize application on startup.
    
    This function should be called once during application startup,
    before any request handling begins.
    
    Args:
        config: Configuration dictionary for initialization
        
    Returns:
        ApplicationInitializer instance
        
    Raises:
        RuntimeError: If initialization fails
    """
    global _app_initializer
    
    config = config or {}
    _app_initializer = ApplicationInitializer(config)
    
    if not _app_initializer.initialize_all():
        raise RuntimeError(
            "Application initialization failed. Check logs for details."
        )
    
    logger.info("Application ready to handle requests")
    return _app_initializer


def get_initializer() -> ApplicationInitializer:
    """
    Retrieve the global application initializer.
    
    Returns:
        ApplicationInitializer instance
        
    Raises:
        RuntimeError: If application not initialized
    """
    if _app_initializer is None:
        raise RuntimeError(
            "Application not initialized. Call initialize_app() during startup."
        )
    return _app_initializer


def get_data_path(dir_type: DataDirectory) -> str:
    """
    Convenience function to retrieve data directory paths.
    
    Args:
        dir_type: DataDirectory enum value
        
    Returns:
        String path to requested directory
    """
    return get_initializer().get_data_directory(dir_type)


# Example startup sequence (adjust based on framework)
if __name__ == "__main__":
    try:
        # Initialize application
        config = {
            'data_base_path': '/data'
        }
        initializer = initialize_app(config)
        
        # Verify directories are accessible
        dirs = initializer.fs_initializer.get_all_directories()
        logger.info(f"Initialized directories: {list(dirs.keys())}")
        
        # Application would start here
        logger.info("Starting application...")
        
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}", exc_info=True)
        exit(1)
