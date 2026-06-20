import os
import logging
from pathlib import Path
from typing import List, Dict
from enum import Enum


class DataDirectory(Enum):
    """Enumeration of required data directories."""
    PLANS = "plans"
    ROADMAPS = "roadmaps"
    RUNS = "runs"
    INDEX = "index"


class FileSystemInitializer:
    """
    Manages initialization of file system directory structure with idempotency.
    
    Responsibilities:
    - Create required directory structure on startup
    - Validate permissions and accessibility
    - Log initialization status
    - Handle errors gracefully with recovery suggestions
    """
    
    def __init__(self, base_path: str = "/data", logger: logging.Logger = None):
        """
        Initialize FileSystemInitializer.
        
        Args:
            base_path: Root directory for all data storage (default: /data)
            logger: Logger instance for initialization events
        """
        self.base_path = Path(base_path)
        self.logger = logger or self._get_default_logger()
        self.required_dirs = [
            self.base_path / DataDirectory.PLANS.value,
            self.base_path / DataDirectory.ROADMAPS.value,
            self.base_path / DataDirectory.RUNS.value,
            self.base_path / DataDirectory.INDEX.value,
        ]
        self.initialization_status = {}
    
    @staticmethod
    def _get_default_logger() -> logging.Logger:
        """Create a default logger if none provided."""
        logger = logging.getLogger(__name__)
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            logger.setLevel(logging.INFO)
        return logger
    
    def initialize(self) -> Dict[str, bool]:
        """
        Idempotent initialization of directory structure.
        
        Creates all required directories if they don't exist.
        Safe to call multiple times - existing directories are skipped.
        
        Returns:
            Dictionary mapping directory names to success status
            
        Raises:
            RuntimeError: If critical directories cannot be created
        """
        self.logger.info(f"Starting file system initialization at {self.base_path}")
        
        try:
            # Create base directory if it doesn't exist
            self._ensure_base_directory()
            
            # Create all required subdirectories
            for directory in self.required_dirs:
                self._ensure_directory(directory)
            
            # Validate permissions
            self._validate_permissions()
            
            self.logger.info(
                f"File system initialization completed successfully. "
                f"Status: {self.initialization_status}"
            )
            return self.initialization_status
            
        except Exception as e:
            self.logger.error(f"File system initialization failed: {str(e)}")
            raise RuntimeError(
                f"Failed to initialize file system: {str(e)}. "
                f"Ensure {self.base_path} is writable and has sufficient permissions."
            ) from e
    
    def _ensure_base_directory(self) -> None:
        """
        Create base directory with appropriate error handling.
        
        Raises:
            RuntimeError: If base directory cannot be created
        """
        try:
            self.base_path.mkdir(parents=True, exist_ok=True)
            self.initialization_status[str(self.base_path)] = True
            self.logger.debug(f"Base directory ready: {self.base_path}")
        except PermissionError as e:
            raise RuntimeError(
                f"Permission denied creating base directory {self.base_path}. "
                f"Verify user has write permissions."
            ) from e
        except Exception as e:
            raise RuntimeError(
                f"Failed to create base directory {self.base_path}: {str(e)}"
            ) from e
    
    def _ensure_directory(self, directory: Path) -> None:
        """
        Create a single directory with idempotency.
        
        Args:
            directory: Path object representing directory to create
        """
        try:
            directory.mkdir(parents=True, exist_ok=True)
            self.initialization_status[str(directory)] = True
            self.logger.debug(f"Directory ensured: {directory}")
        except PermissionError as e:
            self.logger.error(f"Permission denied for {directory}: {str(e)}")
            self.initialization_status[str(directory)] = False
            raise
        except Exception as e:
            self.logger.error(f"Failed to create {directory}: {str(e)}")
            self.initialization_status[str(directory)] = False
            raise
    
    def _validate_permissions(self) -> None:
        """
        Validate read/write permissions on all directories.
        
        Raises:
            RuntimeError: If any directory is not accessible
        """
        for directory in self.required_dirs:
            if not directory.exists():
                raise RuntimeError(f"Directory does not exist: {directory}")
            
            if not os.access(directory, os.R_OK | os.W_OK):
                raise RuntimeError(
                    f"Insufficient permissions for {directory}. "
                    f"Read/write access required."
                )
        
        self.logger.info(
            f"Permission validation successful for all {len(self.required_dirs)} directories"
        )
    
    def get_directory_path(self, dir_type: DataDirectory) -> Path:
        """
        Retrieve path for a specific directory type.
        
        Args:
            dir_type: DataDirectory enum value
            
        Returns:
            Path object for the requested directory
            
        Raises:
            ValueError: If directory type is invalid
        """
        for directory in self.required_dirs:
            if directory.name == dir_type.value:
                return directory
        raise ValueError(f"Unknown directory type: {dir_type}")
    
    def get_all_directories(self) -> Dict[str, Path]:
        """
        Retrieve all configured directories.
        
        Returns:
            Dictionary mapping directory names to Path objects
        """
        return {
            directory.name: directory
            for directory in self.required_dirs
        }
    
    def cleanup_for_testing(self) -> None:
        """
        Remove all initialized directories (USE WITH CAUTION).
        
        Only intended for testing environments. Logs warning before deletion.
        """
        self.logger.warning(
            f"CLEANUP: Removing file system structure at {self.base_path}"
        )
        import shutil
        try:
            shutil.rmtree(self.base_path)
            self.logger.warning("Cleanup completed")
        except Exception as e:
            self.logger.error(f"Cleanup failed: {str(e)}")
            raise
