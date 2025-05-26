# Product Requirements Document: DialogLens - AI Conversation Transcription

## 1. Introduction

This document outlines the requirements for DialogLens, a system that records or processes audio from multi-participant conversations conducted via a LiveKit-based platform, transcribes the audio, and attributes speech segments to individual speakers. The goal is to provide users with an accurate textual record of "who said what." This system can leverage LiveKit Egress for post-session audio capture and transcription, or LiveKit Agents for more direct, potentially real-time, server-side transcription.

## 2. Goals

- To automatically record audio from designated LiveKit sessions for post-processing, OR to process audio in near real-time using server-side agents
- To generate accurate text transcripts of the conversations
- To clearly identify and label which participant spoke each segment of the transcript (speaker diarization)
- To provide a reliable and accessible way for users to retrieve these diarized transcripts
- To streamline the post-conversation review and analysis process, or provide real-time textual insights

## 3. Target Users

- **Meeting Hosts/Organizers**: Individuals who need accurate records of meetings for minutes, action items, or compliance
- **Project Managers**: Professionals tracking decisions and discussions within project teams
- **Customer Support Teams**: For reviewing support calls to improve quality and training, potentially with live agent assist features
- **Researchers/Interviewers**: Individuals conducting interviews who need accurate, attributed transcripts for analysis
- **Users needing accessibility features**: Such as live captioning

## 4. User Stories

- As a meeting host, I want to automatically record our team meetings so that I can get a transcript with speaker labels to easily create meeting minutes
- As a project manager, I want to access a transcript of our client calls where each speaker is identified, so I can quickly find key decisions and commitments made by specific individuals
- As a customer support manager, I want recorded support calls to be transcribed with clear speaker identification (agent vs. customer) so I can review interactions for quality assurance
- As a user, I want the transcription process to start automatically after a recorded session ends (for Egress) or to see live captions (for Agents), so I don't have to manually initiate it
- As a user, I want to receive a notification when my batch transcript is ready and be able to easily access or download it, or view the live transcript as it's generated

## 5. Proposed Workflows & System Architectures

Two primary architectural approaches can be considered:

### 5.1. Post-Session Transcription via LiveKit Egress

This workflow focuses on recording audio using Egress and then transcribing it after the session.

1. **Conversation Begins**: Users join a LiveKit room

2. **Egress Initiation (Audio Recording)**:
   - Upon a predefined trigger (e.g., meeting start, manual initiation by a host), the backend system initiates LiveKit Track Egress jobs for each participant's audio track (recommended for best speaker diarization) or a Room Composite Egress (audio-only) for a mixed track
   - Each Egress job will be configured to output an audio file (e.g., .ogg with Opus codec) directly to a designated cloud storage bucket (e.g., AWS S3, Google Cloud Storage)

3. **Egress Completion & Notification**:
   - When the LiveKit room ends or Egress is stopped, the Egress jobs finalize, and the audio files are uploaded
   - LiveKit sends an `egress_ended` webhook notification to the backend system. This webhook payload contains `EgressInfo`, including `file_results` with the location of each recorded audio track in cloud storage

4. **Audio Retrieval**:
   - The backend system receives the webhook, parses `EgressInfo`, and identifies the locations of the individual audio track files
   - The backend system securely downloads these audio files from cloud storage

5. **Transcription & Diarization (Batch Processing)**:
   - The backend system submits the set of individual audio files (one per participant) or the single mixed audio file to a third-party speech-to-text (STT) service that supports speaker diarization (e.g., AWS Transcribe, Google Cloud Speech-to-Text with speaker diarization enabled, Deepgram, AssemblyAI)
   - The STT service processes the audio files, performs transcription, and identifies distinct speakers, labeling their respective speech segments

6. **Transcript Storage & Access**:
   - The STT service returns the diarized transcript (e.g., in JSON format, including timestamps, speaker labels, and text)
   - The backend system stores this transcript (e.g., in a database, linked to the original conversation metadata)
   - Users are notified (e.g., via email, in-app notification) that the transcript is ready
   - Users can access the diarized transcript through a user interface (e.g., a web portal, within the application)

### 5.2. Server-Side Transcription via LiveKit Agents

This workflow utilizes LiveKit Agents to process audio and generate transcripts directly on the server, potentially in near real-time.

1. **Conversation Begins**: Users join a LiveKit room

2. **Agent Joins Room**: A server-side LiveKit Agent, specifically designed for transcription, joins the LiveKit room. This agent is subscribed to the audio tracks of participants

3. **Audio Processing & STT Integration**:
   - The LiveKit Agent receives audio streams from participants
   - The Agent internally (or by proxying to a dedicated service) streams this audio to a speech-to-text (STT) service that supports streaming input and speaker diarization
   - The STT service processes the audio in chunks, returning transcript segments with speaker labels

4. **Transcript Generation & Handling**:
   - The Agent receives transcript segments from the STT service
   - **Real-time Display (Optional)**: The Agent can publish these transcript segments back into the LiveKit room as data messages, allowing clients to display live captions
   - **Session Logging**: The Agent accumulates the transcript segments. Upon conversation end (or periodically), the Agent compiles the full conversation transcript
   - The Agent can utilize `session.history` or similar mechanisms to access and store the conversation text

5. **Transcript Storage & Access**:
   - The compiled transcript (with speaker diarization) is stored by the backend system (e.g., in a database, associated with the conversation)
   - If not displayed in real-time, users can be notified and access the final transcript similar to the Egress workflow

### Choosing Between Workflows:

- **Egress-based**: Better for high-fidelity archival audio recordings, compliance, and when batch processing is acceptable. Provides the original audio files
- **Agent-based**: Better for real-time or near real-time transcription needs (e.g., live captioning, immediate post-session availability), and can be more resource-efficient if full audio file archival isn't the primary goal

A hybrid approach is also possible, using Agents for real-time aspects and Egress for archival recording.

## 6. Functional Requirements

### 6.1. Audio Recording/Processing

- **FR1.1 (Egress)**: The system must be able to initiate LiveKit Track Egress or Room Composite Egress for designated LiveKit rooms
- **FR1.2 (Egress)**: Egress must be configured to record only audio tracks or audio-focused outputs
- **FR1.3 (Egress)**: Recorded audio tracks must be output in a format suitable for high-quality transcription
- **FR1.4 (Egress)**: Egress must automatically upload recorded audio files to a configured cloud storage solution
- **FR1.5 (Agent)**: The system must be able to deploy and manage LiveKit Agents that join specified rooms
- **FR1.6 (Agent)**: Agents must be able to subscribe to and process audio tracks from participants
- **FR1.7**: The system must securely handle API credentials for LiveKit, cloud storage (if Egress is used), and STT services
- **FR1.8 (Agent)**: The system shall optionally store raw audio streams processed by the LiveKit Agent. If stored, the format (e.g., individual Opus streams per participant) and storage location (e.g., temporary buffer, dedicated cloud storage for a defined retention period) must be configurable

### 6.2. Egress Management & Webhook Processing (Applicable to Egress Workflow)

- **FR2.1**: The backend must be able to receive and validate `egress_ended` webhook notifications from LiveKit
- **FR2.2**: The backend must parse `EgressInfo` from the webhook to retrieve file locations and job status
- **FR2.3**: The system must handle potential Egress job failures gracefully

### 6.3. Transcription

- **FR3.1**: The system (either backend for Egress, or Agent directly) must integrate with a third-party speech-to-text (STT) service
  - **FR3.1.1**: The system should be designed to allow integration with advanced STT services, with a preference for or initial focus on Google Gemini's real-time transcription APIs if they meet accuracy and diarization requirements
- **FR3.2**: The STT service must support speaker diarization
  - **FR3.2.1 (Agent)**: If individual participant audio streams are processed by the Agent, the STT service must be capable of performing speaker diarization either by accepting multiple simultaneous streams for a single transcription session, or the Agent must manage individual transcription streams and intelligently merge them with speaker labels. The chosen STT service (e.g., Google Gemini Live API, AWS Transcribe with multi-channel input) must support this
- **FR3.3 (Egress)**: The system must submit the audio files to the STT service
- **FR3.4 (Agent)**: The Agent must stream audio to the STT service and receive transcript segments
- **FR3.5**: The system must retrieve/compile the structured transcript output (including text, speaker labels, and ideally timestamps) from the STT service
- **FR3.6 (Agent)**: The LiveKit Agent must gracefully handle errors or unavailability from the STT service during real-time transcription (e.g., connection timeouts, API errors). This includes logging the error, attempting reconnection if appropriate, and potentially notifying the user or system administrator of a service disruption

### 6.4. Transcript Storage and Access

- **FR4.1**: Diarized transcripts must be stored persistently
- **FR4.2**: Transcripts must be associated with the original conversation/meeting metadata
- **FR4.3**: Users (with appropriate permissions) must be able to view and/or download the transcripts
- **FR4.4**: The system should provide a notification mechanism when batch transcripts are ready
- **FR4.5 (Agent - Optional)**: The system should support displaying live transcripts/captions to users in the room

## 7. Non-Functional Requirements

- **NFR1. Accuracy**: Transcription and speaker diarization should be as accurate as the chosen STT service allows

- **NFR2. Scalability**: The system should handle concurrent Egress jobs/Agent sessions and transcription requests

- **NFR3. Reliability**: The recording/processing and transcription pipeline should be robust, with error handling and retries

- **NFR4. Security**: Secure management of API keys, credentials, and access control to audio/transcripts. Data encryption in transit and at rest
  - **NFR4.1**: Role-Based Access Control (RBAC) must be implemented for accessing stored transcripts
  - **NFR4.2**: The system must provide a mechanism for transcript data retention and secure deletion in accordance with configurable policies or user requests (e.g., GDPR compliance)
  - **NFR4.3**: Audit logs should be maintained for access and modifications to transcripts

- **NFR5. Latency**:
  - **(Egress)**: Time from conversation end to batch transcript availability should be reasonable (e.g., "90% of transcripts available within 15 minutes of conversation end for a 1-hour recording")
  - **(Agent)**: Latency for real-time transcript segments should be low enough for effective live captioning

- **NFR6. Cost-Effectiveness**: Cloud storage, STT service, and compute costs (for Agents or Egress workers) should be monitored and optimized

## 8. Success Metrics

- **SM1. Transcription Accuracy Rate**: Percentage of words correctly transcribed
- **SM2. Speaker Diarization Error Rate (DER)**: Accuracy of speaker segmentation and identification
- **SM3. Transcript Availability Time**: (For Egress) Average and 90th percentile time. (For Agents) Real-time segment delivery latency
- **SM4. User Adoption/Usage**: Number of conversations transcribed, users accessing transcripts/live captions
- **SM5. System Uptime/Reliability**: Percentage of successful recording/transcription jobs or agent sessions
- **SM6. User Satisfaction**: Feedback on accuracy, speed, and usefulness

## 9. Future Considerations (Out of Scope for MVP, unless MVP targets Agent-based real-time)

- Real-time transcription display during the conversation (Primary use case for Agent-based approach, could be MVP if prioritized)
- Ability to edit transcripts
- Advanced search functionality within transcripts
- Integration with other productivity tools (e.g., task managers, CRMs)
- Support for multiple languages
- Automated summarization of transcripts
- Agent-assisted features (e.g., live suggestions to customer support agents based on transcript)

---

This PRD provides a foundational plan. The key is selecting the right LiveKit technology (Egress, Agents, or both) and a robust transcription service with good speaker diarization based on project priorities (archival vs. real-time, etc.).