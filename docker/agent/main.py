import asyncio
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobRequest,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.transcription import STTSegmentsForwarder
from livekit.plugins import google
import aiohttp
import json

load_dotenv()

logger = logging.getLogger("dialogLens-agent")


class TranscriptionAgent:
    def __init__(self, ctx: JobContext):
        self.ctx = ctx
        self.room = ctx.room
        self.stt = google.STT()
        self.assistant = ctx.create_assistant()
        self.segments_forwarder = STTSegmentsForwarder(
            room=self.room,
            participant=self.assistant,
            track=None,
        )
        self.api_url = os.getenv("API_URL", "http://localhost:3000/api")
        self.api_key = os.getenv("API_KEY", "")

    async def start(self):
        """Start the transcription agent"""
        logger.info(f"Agent started for room {self.room.name}")
        
        # Subscribe to all participants
        await self.assistant.track_subscribe(
            rtc.TrackPublishOptions(
                source=rtc.TrackSource.SOURCE_MICROPHONE,
            ),
            AutoSubscribe.SUBSCRIBE_ALL,
        )

        # Start listening for audio
        async for event in self.room.on("track_subscribed"):
            if event.track.kind == rtc.TrackKind.KIND_AUDIO:
                await self._handle_audio_track(event.track, event.participant)

    async def _handle_audio_track(self, track: rtc.Track, participant: rtc.Participant):
        """Handle audio track from a participant"""
        logger.info(f"Handling audio from participant {participant.identity}")
        
        # Create a stream for this participant's audio
        audio_stream = rtc.AudioStream(track)
        
        # Start transcription for this stream
        async for event in self.stt.stream(audio_stream):
            if event.type == "recognition_result":
                # Process the transcription result
                await self._process_transcription(
                    participant=participant,
                    text=event.text,
                    is_final=event.is_final,
                    confidence=event.confidence,
                )

    async def _process_transcription(
        self,
        participant: rtc.Participant,
        text: str,
        is_final: bool,
        confidence: float,
    ):
        """Process and send transcription to the API"""
        if not text.strip():
            return

        segment_data = {
            "roomId": self.room.name,
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

        # Also forward to room data channel for real-time updates
        if is_final:
            await self.segments_forwarder.forward(
                segment={
                    "participant": participant.identity,
                    "text": text,
                    "timestamp": segment_data["timestamp"],
                }
            )


async def entrypoint(job: JobContext):
    """Main entry point for the agent"""
    logger.info(f"Agent connecting to room {job.room.name}")
    
    # Create and start the transcription agent
    agent = TranscriptionAgent(job)
    
    try:
        await agent.start()
        
        # Keep the agent running
        await asyncio.Event().wait()
    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise


async def request_handler(request: JobRequest) -> None:
    """Handle incoming job requests"""
    logger.info(f"Received job request for room {request.room}")
    
    # Accept jobs that require transcription
    metadata = request.metadata
    if metadata and metadata.get("requiresTranscription", False):
        await request.accept(entrypoint)
        logger.info(f"Accepted job for room {request.room}")
    else:
        await request.reject("This agent only handles transcription jobs")
        logger.info(f"Rejected job for room {request.room} - no transcription required")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run the worker
    cli.run_app(
        WorkerOptions(
            request_handler=request_handler,
            worker_type="transcription",
            namespace=os.getenv("LIVEKIT_NAMESPACE", "dialogLens"),
            max_jobs=5,
        )
    )