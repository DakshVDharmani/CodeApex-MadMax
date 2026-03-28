#!/usr/bin/env python3
"""
Test script for social media services
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_platform_detection():
    """Test platform detection function"""
    from main import detect_platform
    
    test_urls = [
        "https://www.instagram.com/p/C123456789/",
        "https://www.facebook.com/posts/123456789",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://twitter.com/user/status/123456"
    ]
    
    print("🧪 Testing Platform Detection")
    for url in test_urls:
        platform = detect_platform(url)
        print(f"URL: {url} -> Platform: {platform}")
    print()

async def test_services():
    """Test if services can be imported"""
    try:
        from services import process_instagram, process_facebook, ocr_service, audio_service
        print("✅ All services imported successfully")
        
        # Test OCR service
        if ocr_service.ocr:
            print("✅ OCR service initialized")
        else:
            print("❌ OCR service failed to initialize")
        
        # Test audio service
        if audio_service.model:
            print("✅ Audio service initialized")
        else:
            print("❌ Audio service failed to initialize")
            
    except ImportError as e:
        print(f"❌ Failed to import services: {e}")
    print()

async def main():
    """Main test function"""
    print("🚀 Testing Social Media Misinformation Detection System")
    print("=" * 60)
    
    await test_platform_detection()
    await test_services()
    
    print("🎯 Test completed!")
    print("\nTo install new dependencies:")
    print("pip install playwright>=1.40.0 paddleocr>=2.7.0 opencv-python>=4.8.0")
    print("\nTo install playwright browsers:")
    print("playwright install")

if __name__ == "__main__":
    asyncio.run(main())
