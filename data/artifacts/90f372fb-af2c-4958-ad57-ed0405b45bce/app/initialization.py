import logging
from typing import Optional
from app.utils.filesystem import FileSystemInitializer, DataDirectory


class ApplicationInitializer:
    """
    Orchestrates all application initialization tasks including file system setup.
    
    This module is responsible for ensuring the application environment is
    properly configured before the main application starts processing requests.
    """
    
    def __init__(self, config: Optional[dict] = None):
        """
        Initialize ApplicationInitializer with configuration.
        
        Args:
            config: Dictionary with initialization parameters
                   Expected keys: 'data_base_path' (default: /data)
        """
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        self.fs_initializer = None
    
    def initialize_all(self) -> bool:
        """
        Run all initialization procedures.
        
        Returns:
            True if all initialization steps succeeded, False otherwise
        """
        try:
            self.logger.info("Starting application initialization")
            
            # Initialize file system
            self._initialize_filesystem()
            
            # Additional initialization steps can be added here
            # - Database setup
            # - Cache initialization
            # - Configuration validation
            # - Service health checks
            
            self.logger.info("Application initialization completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Application initialization failed: {str(e)}")
            return False
    
    def _initialize_filesystem(self) -> None:
        """
        Initialize file system directory structure.
        
        Raises:
            RuntimeError: If file system initialization fails
        """
        data_path = self.config.get('data_base_path', '/data')
        
        self.fs_initializer = FileSystemInitializer(
            base_path=data_path,
            logger=self.logger
        )
        
        status = self.fs_initializer.initialize()
        
        if not all(status.values()):
            failed_dirs = [k for k, v in status.items() if not v]
            raise RuntimeError(
                f"Failed to initialize directories: {failed_dirs}"
            )
    
    def get_data_directory(self, dir_type: DataDirectory) -> str:
        """
        Retrieve path for a specific data directory type.
        
        Args:
            dir_type: DataDirectory enum value
            
        Returns:
            String path to the requested directory
            
        Raises:
            RuntimeError: If file system not initialized
        """
        if not self.fs_initializer:
            raise RuntimeError(
                "File system not initialized. Call initialize_all() first."
            )
        return str(self.fs_initializer.get_directory_path(dir_type))
