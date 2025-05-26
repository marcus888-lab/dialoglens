import asyncio
import logging
import os
from typing import Optional
import json

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    deepgram,
    silero,
    noise_cancellation,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel
import aiohttp

load_dotenv()

logger = logging.getLogger("dialogLens-transcription-agent")


class TranscriptionAgent(Agent):
    """Agent that transcribes conversations and sends them to the API"""
    
    def __init__(self, api_url: str, api_key: str, room_name: str) -> None:
        super().__init__(instructions="You are a transcription agent.")
        self.api_url = api_url
        self.api_key = api_key
        self.room_name = room_name
        self.participants = {}
        
    async def on_participant_connected(self, participant: rtc.RemoteParticipant):
        """Handle when a participant joins"""
        logger.info(f"Participant {participant.identity} connected")
        self.participants[participant.sid] = participant
        
    async def on_participant_disconnected(self, participant: rtc.RemoteParticipant):
        """Handle when a participant leaves"""
        logger.info(f"Participant {participant.identity} disconnected")
        self.participants.pop(participant.sid, None)
        
    async def on_transcription(self, participant_id: str, text: str, is_final: bool, confidence: float):
        """Process transcription and send to API"""
        if not text.strip():
            return
            
        participant = self.participants.get(participant_id)
        if not participant:
            return
            
        segment_data = {
            "roomId": self.room_name,
            "participantId": participant.identity,
            "participantName": participant.name or participant.identity,
            "text": text,
            "isFinal": is_final,
            "confidence": confidence,
            "timestamp": int(asyncio.get_event_loop().time() * 1000),
        }
        
        # Send to API
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                }
                async with session.post(
                    f"{self.api_url}/transcripts/segment",
                    json=segment_data,
                    headers=headers,
                ) as response:
                    if response.status != 200:
                        logger.error(
                            f"Failed to send segment: {response.status} - {await response.text()}"
                        )
                    else:
                        logger.debug(f"Sent segment: {text[:50]}...")
        except Exception as e:
            logger.error(f"Error sending segment to API: {e}")


async def entrypoint(ctx: agents.JobContext):
    """Main entry point for the transcription agent"""
    logger.info(f"Transcription agent connecting to room {ctx.room.name}")
    
    # Get configuration
    api_url = os.getenv("API_URL", "http://localhost:3000/api")
    api_key = os.getenv("API_KEY", "")
    
    # Create the transcription agent
    agent = TranscriptionAgent(api_url, api_key, ctx.room.name)
    
    # Create session with STT only (no LLM or TTS needed for transcription)
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-2",
            language="en",
            punctuate=True,
            profanity_filter=False,
            diarize=True,
            smart_format=True,
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )
    
    # Connect to room
    await ctx.connect()
    
    # Set up participant event handlers
    ctx.room.on("participant_connected", agent.on_participant_connected)
    ctx.room.on("participant_disconnected", agent.on_participant_disconnected)
    
    # Add existing participants
    for participant in ctx.room.remote_participants.values():
        await agent.on_participant_connected(participant)
    
    # Start the session with noise cancellation if using LiveKit Cloud
    try:
        await session.start(
            room=ctx.room,
            agent=agent,
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
    except Exception as e:
        logger.warning(f"Starting without noise cancellation: {e}")
        await session.start(
            room=ctx.room,
            agent=agent,
        )
    
    # Set up transcription forwarding
    @session.on("stt_transcription")
    async def on_transcription(event):
        """Handle STT transcription events"""
        await agent.on_transcription(
            participant_id=event.participant_sid,
            text=event.text,
            is_final=event.is_final,
            confidence=event.confidence,
        )
    
    logger.info("Transcription agent started successfully")


async def request_fn(ctx: agents.JobContext):
    """Function called when agent is requested for a room"""
    # Check room metadata to determine if this agent should handle the room
    metadata = json.loads(ctx.room.metadata or "{}")
    
    if metadata.get("requiresTranscription", True):  # Default to True
        logger.info(f"Accepting transcription job for room {ctx.room.name}")
        await entrypoint(ctx)
    else:
        logger.info(f"Room {ctx.room.name} does not require transcription")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # Run the agent
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=request_fn,
            worker_type="transcription",
        )
    )