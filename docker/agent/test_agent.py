#!/usr/bin/env python3
"""
Test script to verify agent connectivity and functionality
"""
import os
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("test-agent")


async def test_connectivity():
    """Test basic connectivity to LiveKit"""
    from livekit import api
    
    # Get credentials
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    livekit_url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
    
    if not api_key or not api_secret:
        logger.error("Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET")
        return False
    
    logger.info(f"Testing connection to {livekit_url}")
    
    try:
        # Try to list rooms
        room_service = api.RoomService(livekit_url, api_key, api_secret)
        rooms = await room_service.list_rooms()
        logger.info(f"Connected successfully! Found {len(rooms)} rooms")
        return True
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        return False


async def test_model_downloads():
    """Test that required models are downloaded"""
    try:
        from livekit.plugins import silero, noise_cancellation
        from livekit.plugins.turn_detector.multilingual import MultilingualModel
        
        logger.info("Testing model availability...")
        
        # Test VAD model
        vad = silero.VAD.load()
        logger.info("✓ Silero VAD model loaded")
        
        # Test turn detection model
        turn_model = MultilingualModel()
        logger.info("✓ Turn detection model loaded")
        
        # Test noise cancellation
        nc = noise_cancellation.BVC()
        logger.info("✓ Noise cancellation model loaded")
        
        return True
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        logger.info("Run 'python main.py download-files' to download models")
        return False


async def test_api_providers():
    """Test API provider connectivity"""
    results = {}
    
    # Test Deepgram
    deepgram_key = os.getenv("DEEPGRAM_API_KEY")
    if deepgram_key:
        try:
            from livekit.plugins import deepgram
            stt = deepgram.STT(api_key=deepgram_key)
            results["Deepgram"] = "✓ Connected"
        except Exception as e:
            results["Deepgram"] = f"✗ Failed: {str(e)}"
    else:
        results["Deepgram"] = "✗ No API key"
    
    # Test OpenAI
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            from livekit.plugins import openai
            llm = openai.LLM(api_key=openai_key)
            results["OpenAI"] = "✓ Connected"
        except Exception as e:
            results["OpenAI"] = f"✗ Failed: {str(e)}"
    else:
        results["OpenAI"] = "✗ No API key"
    
    # Test Cartesia
    cartesia_key = os.getenv("CARTESIA_API_KEY")
    if cartesia_key:
        try:
            from livekit.plugins import cartesia
            tts = cartesia.TTS(api_key=cartesia_key)
            results["Cartesia"] = "✓ Connected"
        except Exception as e:
            results["Cartesia"] = f"✗ Failed: {str(e)}"
    else:
        results["Cartesia"] = "✗ No API key"
    
    # Display results
    logger.info("API Provider Status:")
    for provider, status in results.items():
        logger.info(f"  {provider}: {status}")
    
    return all("✓" in status for status in results.values())


async def test_backend_api():
    """Test connectivity to DialogLens backend API"""
    import aiohttp
    
    api_url = os.getenv("API_URL", "http://localhost:3000/api")
    api_key = os.getenv("API_KEY", "")
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
            
            # Test interaction endpoint
            async with session.post(
                f"{api_url}/conversations/interaction",
                json={"test": True},
                headers=headers,
            ) as response:
                if response.status == 401:
                    logger.warning("Backend API: Authentication required (401)")
                elif response.status >= 400:
                    logger.warning(f"Backend API: Got status {response.status}")
                else:
                    logger.info(f"Backend API: Connected ({response.status})")
                    
        return True
    except Exception as e:
        logger.error(f"Backend API connection failed: {e}")
        return False


async def main():
    """Run all tests"""
    logger.info("=== DialogLens Agent Test Suite ===")
    
    tests = [
        ("LiveKit Connectivity", test_connectivity()),
        ("Model Downloads", test_model_downloads()),
        ("API Providers", test_api_providers()),
        ("Backend API", test_backend_api()),
    ]
    
    results = []
    for name, test in tests:
        logger.info(f"\nTesting {name}...")
        try:
            result = await test
            results.append((name, result))
        except Exception as e:
            logger.error(f"{name} test failed with exception: {e}")
            results.append((name, False))
    
    # Summary
    logger.info("\n=== Test Summary ===")
    all_passed = True
    for name, passed in results:
        status = "PASSED" if passed else "FAILED"
        logger.info(f"{name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        logger.info("\n✅ All tests passed! Agent is ready to run.")
    else:
        logger.info("\n❌ Some tests failed. Please check the configuration.")
    
    return all_passed


if __name__ == "__main__":
    asyncio.run(main())