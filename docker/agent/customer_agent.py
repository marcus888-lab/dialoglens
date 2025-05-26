import asyncio
import logging
import os
from typing import Optional, Dict, Any

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
from livekit.plugins import openai, google
import aiohttp
import json

load_dotenv()

logger = logging.getLogger("dialogLens-customer-agent")


class CustomerAgent:
    def __init__(self, ctx: JobContext):
        self.ctx = ctx
        self.room = ctx.room
        self.assistant = ctx.create_assistant()
        
        # Initialize LLM for customer interactions
        self.llm = openai.LLM(
            model="gpt-4o-mini",
            temperature=0.7,
        )
        
        # Initialize STT and TTS
        self.stt = google.STT()
        self.tts = google.TTS()
        
        # Customer context
        self.customer_context: Dict[str, Any] = {}
        self.conversation_history: list = []
        
        # API configuration
        self.api_url = os.getenv("API_URL", "http://localhost:3000/api")
        self.api_key = os.getenv("API_KEY", "")

    async def start(self):
        """Start the customer agent"""
        logger.info(f"Customer agent started for room {self.room.name}")
        
        # Get room metadata for context
        room_metadata = json.loads(self.room.metadata or "{}")
        self.customer_context = room_metadata.get("customerContext", {})
        
        # Subscribe to audio tracks
        await self.assistant.track_subscribe(
            rtc.TrackPublishOptions(
                source=rtc.TrackSource.SOURCE_MICROPHONE,
            ),
            AutoSubscribe.SUBSCRIBE_ALL,
        )

        # Send initial greeting
        await self._send_greeting()

        # Start listening for audio
        async for event in self.room.on("track_subscribed"):
            if event.track.kind == rtc.TrackKind.KIND_AUDIO:
                await self._handle_audio_track(event.track, event.participant)

    async def _send_greeting(self):
        """Send initial greeting to customer"""
        greeting = self._generate_greeting()
        
        # Convert text to speech
        audio_data = await self.tts.synthesize(greeting)
        
        # Publish audio to room
        audio_track = rtc.LocalAudioTrack.create_audio_track(
            "assistant-voice",
            rtc.AudioSource(
                sample_rate=24000,
                num_channels=1,
            ),
        )
        
        await self.room.local_participant.publish_track(
            audio_track,
            rtc.TrackPublishOptions(name="assistant-voice"),
        )
        
        # Send audio data
        await audio_track.capture_frame(audio_data)
        
        # Record interaction
        await self._record_interaction("assistant", greeting)

    def _generate_greeting(self) -> str:
        """Generate contextual greeting based on customer context"""
        customer_name = self.customer_context.get("name", "")
        company = self.customer_context.get("company", "")
        purpose = self.customer_context.get("purpose", "general inquiry")
        
        if customer_name:
            greeting = f"Hello {customer_name}"
            if company:
                greeting += f" from {company}"
            greeting += f"! I'm here to help you with your {purpose}. How can I assist you today?"
        else:
            greeting = f"Hello! I'm here to help you with your {purpose}. May I have your name, please?"
        
        return greeting

    async def _handle_audio_track(self, track: rtc.Track, participant: rtc.Participant):
        """Handle audio track from a participant"""
        # Ignore our own audio
        if participant.identity == self.assistant.identity:
            return
            
        logger.info(f"Handling audio from customer {participant.identity}")
        
        # Create a stream for this participant's audio
        audio_stream = rtc.AudioStream(track)
        
        # Start transcription for this stream
        async for event in self.stt.stream(audio_stream):
            if event.type == "recognition_result" and event.is_final:
                # Process the customer's speech
                await self._process_customer_speech(
                    participant=participant,
                    text=event.text,
                )

    async def _process_customer_speech(self, participant: rtc.Participant, text: str):
        """Process customer speech and generate response"""
        if not text.strip():
            return
            
        logger.info(f"Customer said: {text}")
        
        # Record customer interaction
        await self._record_interaction("customer", text)
        
        # Generate response using LLM
        response = await self._generate_response(text)
        
        # Convert response to speech
        audio_data = await self.tts.synthesize(response)
        
        # Get or create audio track
        audio_track = self._get_audio_track()
        
        # Send audio response
        await audio_track.capture_frame(audio_data)
        
        # Record assistant interaction
        await self._record_interaction("assistant", response)

    async def _generate_response(self, customer_input: str) -> str:
        """Generate contextual response using LLM"""
        # Build conversation context
        messages = [
            {
                "role": "system",
                "content": self._build_system_prompt()
            }
        ]
        
        # Add conversation history
        for interaction in self.conversation_history[-10:]:  # Last 10 interactions
            role = "assistant" if interaction["speaker"] == "assistant" else "user"
            messages.append({
                "role": role,
                "content": interaction["text"]
            })
        
        # Add current input
        messages.append({
            "role": "user",
            "content": customer_input
        })
        
        # Generate response
        try:
            response = await self.llm.chat(messages)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "I apologize, but I'm having trouble processing that. Could you please repeat?"

    def _build_system_prompt(self) -> str:
        """Build system prompt based on context"""
        prompt = "You are a helpful customer service assistant for DialogLens. "
        
        if self.customer_context:
            prompt += f"You are speaking with {self.customer_context.get('name', 'a customer')}"
            if company := self.customer_context.get('company'):
                prompt += f" from {company}"
            if purpose := self.customer_context.get('purpose'):
                prompt += f". They are contacting us about: {purpose}"
        
        prompt += """
        
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
        
        Keep responses concise and natural for voice conversation.
        """
        
        return prompt

    def _get_audio_track(self) -> rtc.LocalAudioTrack:
        """Get or create audio track for assistant"""
        # Check if we already have a published audio track
        for track_pub in self.room.local_participant.track_publications.values():
            if track_pub.track and track_pub.track.name == "assistant-voice":
                return track_pub.track
        
        # Create new audio track
        audio_track = rtc.LocalAudioTrack.create_audio_track(
            "assistant-voice",
            rtc.AudioSource(
                sample_rate=24000,
                num_channels=1,
            ),
        )
        
        # Publish it
        asyncio.create_task(
            self.room.local_participant.publish_track(
                audio_track,
                rtc.TrackPublishOptions(name="assistant-voice"),
            )
        )
        
        return audio_track

    async def _record_interaction(self, speaker: str, text: str):
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
                    "roomId": self.room.name,
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


async def entrypoint(job: JobContext):
    """Main entry point for the customer agent"""
    logger.info(f"Customer agent connecting to room {job.room.name}")
    
    # Create and start the customer agent
    agent = CustomerAgent(job)
    
    try:
        await agent.start()
        
        # Keep the agent running
        await asyncio.Event().wait()
    except Exception as e:
        logger.error(f"Customer agent error: {e}")
        raise


async def request_handler(request: JobRequest) -> None:
    """Handle incoming job requests"""
    logger.info(f"Received job request for room {request.room}")
    
    # Accept jobs that require customer service
    metadata = request.metadata
    if metadata and metadata.get("requiresCustomerAgent", False):
        await request.accept(entrypoint)
        logger.info(f"Accepted customer service job for room {request.room}")
    else:
        await request.reject("This agent only handles customer service jobs")
        logger.info(f"Rejected job for room {request.room} - no customer service required")


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
            worker_type="customer-service",
            namespace=os.getenv("LIVEKIT_NAMESPACE", "dialogLens"),
            max_jobs=10,  # Can handle more concurrent customers
        )
    )