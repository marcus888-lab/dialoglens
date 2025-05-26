import asyncio
import logging
import os
from typing import Optional
import json

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions, JobContext, WorkerOptions, cli
from livekit.plugins import (
    deepgram,
    openai,
    cartesia,
    silero,
    noise_cancellation,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel
import aiohttp

load_dotenv()

logger = logging.getLogger("dialogLens-agent")


class DialogLensAssistant(Agent):
    """AI Assistant for DialogLens customer support"""
    
    def __init__(self, api_url: str, api_key: str, room_name: str) -> None:
        super().__init__(
            instructions="""You are a helpful AI assistant for DialogLens, a conversation 
            transcription and analysis platform. You help users with:
            - Understanding DialogLens features
            - Technical support
            - Account and billing questions
            - Best practices for using the platform
            
            Be friendly, professional, and concise in your responses."""
        )
        self.api_url = api_url
        self.api_key = api_key
        self.room_name = room_name
        self.conversation_history = []
        
    async def process_interaction(self, speaker: str, text: str):
        """Record interaction to API"""
        interaction = {
            "speaker": speaker,
            "text": text,
            "timestamp": int(asyncio.get_event_loop().time() * 1000),
        }
        
        # Add to local history
        self.conversation_history.append(interaction)
        
        # Send to API
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                }
                
                data = {
                    "roomId": self.room_name,
                    "speaker": speaker,
                    "text": text,
                    "timestamp": interaction["timestamp"],
                    "metadata": {
                        "agentType": "customer-service",
                    }
                }
                
                async with session.post(
                    f"{self.api_url}/conversations/interaction",
                    json=data,
                    headers=headers,
                ) as response:
                    if response.status != 200:
                        logger.error(
                            f"Failed to record interaction: {response.status}"
                        )
        except Exception as e:
            logger.error(f"Error recording interaction: {e}")


async def entrypoint(ctx: JobContext):
    """Main entry point for the agent"""
    logger.info(f"Agent connecting to room {ctx.room.name}")
    
    # Get configuration
    api_url = os.getenv("API_URL", "http://localhost:3000/api")
    api_key = os.getenv("API_KEY", "")
    
    # Create the assistant
    assistant = DialogLensAssistant(api_url, api_key, ctx.room.name)
    
    # Create session with STT-LLM-TTS pipeline
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-2",
            language="en",
            punctuate=True,
            smart_format=True,
        ),
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7,
        ),
        tts=cartesia.TTS(
            voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22",  # Professional female voice
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    
    # Connect to room
    await ctx.connect()
    
    # Set up event handlers for tracking conversations
    @session.on("user_speech_finished")
    async def on_user_speech(event):
        """Handle when user finishes speaking"""
        if event.text:
            await assistant.process_interaction("user", event.text)
    
    @session.on("agent_speech_started")
    async def on_agent_speech(event):
        """Handle when agent starts speaking"""
        if event.text:
            await assistant.process_interaction("assistant", event.text)
    
    # Start the session with noise cancellation if using LiveKit Cloud
    try:
        await session.start(
            room=ctx.room,
            agent=assistant,
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
    except Exception as e:
        logger.warning(f"Starting without noise cancellation: {e}")
        await session.start(
            room=ctx.room,
            agent=assistant,
        )
    
    # Generate initial greeting based on room metadata
    metadata = json.loads(ctx.room.metadata or "{}")
    customer_context = metadata.get("customerContext", {})
    
    greeting = "Hello! I'm here to help you with DialogLens. "
    if customer_name := customer_context.get("name"):
        greeting = f"Hello {customer_name}! I'm here to help you with DialogLens. "
    
    greeting += "How can I assist you today?"
    
    await session.generate_reply(instructions=greeting)
    
    logger.info("Agent started successfully")


async def request_fn(ctx: JobContext):
    """Function called when agent is requested for a room"""
    # Check room metadata to determine if this agent should handle the room
    metadata = json.loads(ctx.room.metadata or "{}")
    
    # Handle both transcription and customer service by default
    if metadata.get("requiresAgent", True):
        logger.info(f"Accepting job for room {ctx.room.name}")
        await entrypoint(ctx)
    else:
        logger.info(f"Room {ctx.room.name} does not require agent")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # Download model files if needed
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "download-files":
        logger.info("Downloading model files...")
        import subprocess
        subprocess.run([sys.executable, "-m", "livekit.plugins.silero", "download-files"])
        subprocess.run([sys.executable, "-m", "livekit.plugins.turn_detector", "download-files"])
        subprocess.run([sys.executable, "-m", "livekit.plugins.noise_cancellation", "download-files"])
        logger.info("Model files downloaded successfully")
        sys.exit(0)
    
    # Run the agent
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=request_fn,
            worker_type="room",
        )
    )