# DialogLens LiveKit Agents

This directory contains the LiveKit Agents implementation for DialogLens, providing real-time transcription and AI-powered customer service capabilities.

## Overview

DialogLens uses LiveKit Agents v1.0 to provide:
- **Real-time transcription** - Transcribe conversations as they happen
- **AI customer service** - Intelligent voice assistant for customer support
- **Multi-modal support** - Handle voice, video, and text interactions

## Architecture

The system includes three types of agents:

1. **Main Agent** (`main.py`) - Combined transcription + customer service
2. **Customer Service Agent** (`customer_agent.py`) - Dedicated customer support
3. **Transcription Agent** (`transcription_agent.py`) - Pure transcription service

## Prerequisites

### AI Provider Accounts

You'll need API keys from the following providers:

- **[Deepgram](https://deepgram.com/)** - Speech-to-Text (STT)
- **[OpenAI](https://platform.openai.com/)** - Language Model (LLM)
- **[Cartesia](https://cartesia.ai/)** - Text-to-Speech (TTS)

### Environment Variables

Add these to your `.env` file:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-instance.livekit.cloud

# AI Providers
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key
CARTESIA_API_KEY=your_cartesia_api_key

# Internal API (for agent-to-backend communication)
API_URL=http://localhost:3000/api
API_KEY=your_internal_api_key
```

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Download required models:**
   ```bash
   python main.py download-files
   ```

3. **Test your setup:**
   ```bash
   python test_agent.py
   ```

4. **Run in console mode (for testing):**
   ```bash
   python main.py console
   ```

5. **Run in development mode:**
   ```bash
   python main.py dev
   ```

### Docker Deployment

1. **Build and run all services:**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. **Run with scaling profile (optional):**
   ```bash
   docker-compose --profile scale up -d
   ```

This starts additional dedicated agents for handling higher loads.

## Agent Modes

### Console Mode
Test your agent locally in the terminal:
```bash
python main.py console
```

### Development Mode
Connect to LiveKit and test with the playground:
```bash
python main.py dev
```

### Production Mode
Run as a worker process:
```bash
python main.py start
```

## Room Metadata

When creating rooms, you can control agent behavior with metadata:

```javascript
{
  "requiresAgent": true,              // Enable main agent
  "requiresTranscription": true,      // Enable transcription
  "requiresCustomerAgent": false,     // Enable customer service
  "isTelephony": false,              // Phone call optimization
  "customerContext": {
    "name": "John Doe",
    "company": "Acme Corp",
    "purpose": "technical support"
  }
}
```

## Testing

Use the included test script to verify your setup:

```bash
python test_agent.py
```

This checks:
- LiveKit connectivity
- Model downloads
- API provider connections
- Backend API access

## Customization

### Changing Voices

Edit the TTS configuration in the agent files:

```python
tts=cartesia.TTS(
    voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22",  # Change this
    language="en",
    speed=1.0,
)
```

Browse available voices at [Cartesia's voice library](https://play.cartesia.ai/).

### Changing Language Models

Update the LLM configuration:

```python
llm=openai.LLM(
    model="gpt-4o-mini",  # Options: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
    temperature=0.7,
)
```

### Custom Instructions

Modify the agent's behavior by updating the instructions:

```python
class DialogLensAssistant(Agent):
    def __init__(self, ...):
        super().__init__(
            instructions="Your custom instructions here..."
        )
```

## Troubleshooting

### Models not loading
Run: `python main.py download-files`

### Connection errors
Check your `.env` file and run: `python test_agent.py`

### Agent not joining rooms
Verify room metadata includes `requiresAgent: true`

### Poor audio quality
Ensure noise cancellation is enabled (requires LiveKit Cloud)

## Performance Tips

1. **Use dedicated agents** for high-traffic scenarios
2. **Enable noise cancellation** for better audio quality
3. **Configure appropriate timeouts** in room metadata
4. **Monitor agent logs** for errors and performance metrics

## API Endpoints

The agents interact with these backend endpoints:

- `POST /api/conversations/interaction` - Record conversation interactions
- `POST /api/transcripts/segment` - Store transcript segments

## Resources

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Voice AI Quickstart](https://docs.livekit.io/agents/start/voice-ai/)
- [Integration Guides](https://docs.livekit.io/agents/integrations/)