"""
Image Handler Utility
Handles image processing, conversion, and validation
"""

import logging
import base64
import io
from typing import Tuple, Optional, Union
from PIL import Image, ImageOps
import numpy as np

logger = logging.getLogger(__name__)


class ImageHandler:
    """Utility class for handling image operations"""
    
    def __init__(self):
        # Supported image formats
        self.supported_formats = {
            'JPEG', 'JPG', 'PNG', 'GIF', 'BMP', 'TIFF', 'WEBP'
        }
        
        # Maximum image size (width, height)
        self.max_size = (4096, 4096)
        
        # Maximum file size in bytes (10MB)
        self.max_file_size = 10 * 1024 * 1024
    
    def base64_to_image(self, base64_string: str) -> Image.Image:
        """
        Convert base64 string to PIL Image
        
        Args:
            base64_string: Base64 encoded image string
            
        Returns:
            PIL Image object
        """
        try:
            # Remove data URL prefix if present
            if 'base64,' in base64_string:
                base64_string = base64_string.split('base64,')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(base64_string)
            
            # Create PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            logger.info(f"Successfully converted base64 to image: {image.size}, mode: {image.mode}")
            return image
            
        except Exception as e:
            logger.error(f"Failed to convert base64 to image: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def image_to_base64(self, image: Image.Image, format: str = 'JPEG') -> str:
        """
        Convert PIL Image to base64 string
        
        Args:
            image: PIL Image object
            format: Output format (JPEG, PNG, etc.)
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Validate format
            format = format.upper()
            if format not in self.supported_formats:
                format = 'JPEG'
            
            # Convert image to bytes
            buffer = io.BytesIO()
            
            # Handle transparency for JPEG
            if format == 'JPEG' and image.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            image.save(buffer, format=format)
            image_bytes = buffer.getvalue()
            
            # Encode to base64
            base64_string = base64.b64encode(image_bytes).decode('utf-8')
            
            logger.info(f"Successfully converted image to base64: {len(base64_string)} characters")
            return base64_string
            
        except Exception as e:
            logger.error(f"Failed to convert image to base64: {str(e)}")
            raise ValueError(f"Image conversion failed: {str(e)}")
    
    def resize_image(self, image: Image.Image, max_size: Tuple[int, int] = None) -> Image.Image:
        """
        Resize image while maintaining aspect ratio
        
        Args:
            image: PIL Image object
            max_size: Maximum size (width, height)
            
        Returns:
            Resized PIL Image
        """
        try:
            if max_size is None:
                max_size = self.max_size
            
            # Check if resizing is needed
            if image.size[0] <= max_size[0] and image.size[1] <= max_size[1]:
                return image
            
            # Calculate new size maintaining aspect ratio
            ratio = min(max_size[0] / image.size[0], max_size[1] / image.size[1])
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            
            # Resize image
            resized_image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            logger.info(f"Resized image from {image.size} to {resized_image.size}")
            return resized_image
            
        except Exception as e:
            logger.error(f"Failed to resize image: {str(e)}")
            raise ValueError(f"Image resizing failed: {str(e)}")
    
    def validate_image(self, image: Image.Image) -> bool:
        """
        Validate image properties
        
        Args:
            image: PIL Image object
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Check image mode
            if image.mode not in ['RGB', 'RGBA', 'L', 'LA', 'P']:
                logger.warning(f"Unsupported image mode: {image.mode}")
                return False
            
            # Check image size
            if image.size[0] > self.max_size[0] or image.size[1] > self.max_size[1]:
                logger.warning(f"Image too large: {image.size}")
                return False
            
            # Check if image is empty
            if image.size[0] == 0 or image.size[1] == 0:
                logger.warning("Empty image detected")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            return False
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for analysis
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed PIL Image
        """
        try:
            # Auto-orient image based on EXIF data
            image = ImageOps.exif_transpose(image)
            
            # Convert to RGB
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if necessary
            image = self.resize_image(image)
            
            logger.info(f"Image preprocessed successfully: {image.size}, mode: {image.mode}")
            return image
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise ValueError(f"Image preprocessing failed: {str(e)}")
    
    def extract_metadata(self, image: Image.Image) -> dict:
        """
        Extract metadata from image
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary containing image metadata
        """
        try:
            metadata = {
                'size': image.size,
                'mode': image.mode,
                'format': image.format,
                'has_transparency': image.mode in ('RGBA', 'LA') or 'transparency' in image.info
            }
            
            # Add EXIF data if available
            if hasattr(image, '_getexif') and image._getexif():
                metadata['exif'] = bool(image._getexif())
            
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to extract image metadata: {str(e)}")
            return {'error': str(e)}
    
    def create_thumbnail(self, image: Image.Image, size: Tuple[int, int] = (150, 150)) -> Image.Image:
        """
        Create thumbnail from image
        
        Args:
            image: PIL Image object
            size: Thumbnail size
            
        Returns:
            Thumbnail PIL Image
        """
        try:
            # Create thumbnail
            thumbnail = image.copy()
            thumbnail.thumbnail(size, Image.Resampling.LANCZOS)
            
            logger.info(f"Created thumbnail: {thumbnail.size}")
            return thumbnail
            
        except Exception as e:
            logger.error(f"Failed to create thumbnail: {str(e)}")
            raise ValueError(f"Thumbnail creation failed: {str(e)}")
    
    def image_to_array(self, image: Image.Image) -> np.ndarray:
        """
        Convert PIL Image to numpy array
        
        Args:
            image: PIL Image object
            
        Returns:
            Numpy array
        """
        try:
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            array = np.array(image)
            
            logger.info(f"Converted image to array: {array.shape}")
            return array
            
        except Exception as e:
            logger.error(f"Failed to convert image to array: {str(e)}")
            raise ValueError(f"Array conversion failed: {str(e)}")
    
    def optimize_for_web(self, image: Image.Image, quality: int = 85) -> bytes:
        """
        Optimize image for web usage
        
        Args:
            image: PIL Image object
            quality: JPEG quality (1-100)
            
        Returns:
            Optimized image bytes
        """
        try:
            # Convert to RGB
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Optimize and save
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=quality, optimize=True)
            
            optimized_bytes = buffer.getvalue()
            
            logger.info(f"Optimized image: {len(optimized_bytes)} bytes")
            return optimized_bytes
            
        except Exception as e:
            logger.error(f"Failed to optimize image: {str(e)}")
            raise ValueError(f"Image optimization failed: {str(e)}")
