import asyncio
import logging
import os
from typing import Optional, Dict, Any
import json

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import (
    AgentSession, 
    Agent, 
    RoomInputOptions, 
    JobContext, 
    JobRequest,
    WorkerOptions, 
    cli
)
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

logger = logging.getLogger("dialogLens-customer-agent")


class CustomerServiceAgent(Agent):
    """Customer service agent with specialized knowledge about DialogLens"""
    
    def __init__(self, api_url: str, api_key: str, room_name: str, customer_context: Dict[str, Any]) -> None:
        # Build dynamic instructions based on customer context
        instructions = self._build_instructions(customer_context)
        super().__init__(instructions=instructions)
        
        self.api_url = api_url
        self.api_key = api_key
        self.room_name = room_name
        self.customer_context = customer_context
        self.conversation_history = []
        
    def _build_instructions(self, customer_context: Dict[str, Any]) -> str:
        """Build dynamic instructions based on customer context"""
        instructions = "You are a helpful customer service assistant for DialogLens. "
        
        if customer_context:
            if name := customer_context.get('name'):
                instructions += f"You are speaking with {name}"
                if company := customer_context.get('company'):
                    instructions += f" from {company}"
                instructions += ". "
            
            if purpose := customer_context.get('purpose'):
                instructions += f"They are contacting us about: {purpose}. "
        
        instructions += """
        Your responsibilities:
        1. Be helpful, professional, and friendly
        2. Answer questions about DialogLens features and capabilities
        3. Assist with technical support issues
        4. Collect necessary information for follow-up if needed
        5. Escalate to human support when appropriate
        
        DialogLens is an AI-powered conversation transcription and analysis platform that:
        - Provides real-time transcription of video calls
        - Offers speaker identification and separation  
        - Generates meeting summaries and insights
        - Integrates with popular video conferencing tools
        - Supports multiple languages and accents
        - Provides searchable transcripts and analytics
        
        Keep responses concise and natural for voice conversation.
        """
        
        return instructions
        
    async def process_interaction(self, speaker: str, text: str):
        """Record interaction to API and local history"""
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
                        "customerContext": self.customer_context,
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
    """Main entry point for the customer service agent"""
    logger.info(f"Customer agent connecting to room {ctx.room.name}")
    
    # Get configuration
    api_url = os.getenv("API_URL", "http://localhost:3000/api")
    api_key = os.getenv("API_KEY", "")
    
    # Get customer context from room metadata
    metadata = json.loads(ctx.room.metadata or "{}")
    customer_context = metadata.get("customerContext", {})
    
    # Create the customer service agent
    agent = CustomerServiceAgent(api_url, api_key, ctx.room.name, customer_context)
    
    # Create session with high-quality STT-LLM-TTS pipeline
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-2",
            language="en",
            punctuate=True,
            smart_format=True,
            diarize=True,  # Help identify different speakers
        ),
        llm=openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7,
        ),
        tts=cartesia.TTS(
            voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22",  # Professional female voice
            language="en",
            speed=1.0,
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
            await agent.process_interaction("user", event.text)
    
    @session.on("agent_speech_started")
    async def on_agent_speech(event):
        """Handle when agent starts speaking"""
        if event.text:
            await agent.process_interaction("assistant", event.text)
    
    # Start the session with noise cancellation for telephony if using LiveKit Cloud
    try:
        # Use BVCTelephony for better phone call quality
        room_input_options = RoomInputOptions(
            noise_cancellation=noise_cancellation.BVCTelephony()
            if metadata.get("isTelephony", False)
            else noise_cancellation.BVC()
        )
        await session.start(
            room=ctx.room,
            agent=agent,
            room_input_options=room_input_options,
        )
    except Exception as e:
        logger.warning(f"Starting without noise cancellation: {e}")
        await session.start(
            room=ctx.room,
            agent=agent,
        )
    
    # Generate contextual greeting
    greeting = _generate_greeting(customer_context)
    await session.generate_reply(instructions=greeting)
    
    # Record the greeting
    await agent.process_interaction("assistant", greeting)
    
    logger.info("Customer service agent started successfully")


def _generate_greeting(customer_context: Dict[str, Any]) -> str:
    """Generate contextual greeting based on customer context"""
    customer_name = customer_context.get("name", "")
    company = customer_context.get("company", "")
    purpose = customer_context.get("purpose", "general inquiry")
    
    if customer_name:
        greeting = f"Hello {customer_name}"
        if company:
            greeting += f" from {company}"
        greeting += f"! I'm here to help you with your {purpose}. How can I assist you today?"
    else:
        greeting = f"Hello! I'm here to help you with your {purpose}. May I have your name, please?"
    
    return greeting


async def request_handler(request: JobRequest) -> None:
    """Handle incoming job requests"""
    logger.info(f"Received job request for room {request.room.name}")
    
    # Check room metadata to see if customer service is needed
    metadata = json.loads(request.room.metadata or "{}")
    
    if metadata.get("requiresCustomerAgent", False):
        await request.accept(entrypoint)
        logger.info(f"Accepted customer service job for room {request.room.name}")
    else:
        await request.reject()
        logger.info(f"Rejected job for room {request.room.name} - no customer service required")


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
    
    # Run the worker
    cli.run_app(
        WorkerOptions(
            request_handler=request_handler,
            worker_type="customer-service",
            max_idle_time=60.0,  # Disconnect after 60 seconds of inactivity
            num_idle_processes=2,  # Keep 2 processes ready for quick response
        )
    )