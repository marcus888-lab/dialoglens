import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.DATABASE_URL = 'file:./test.db'
process.env.LIVEKIT_API_KEY = 'test-api-key'
process.env.LIVEKIT_API_SECRET = 'test-api-secret'
process.env.LIVEKIT_URL = 'wss://test.livekit.cloud'
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_S3_BUCKET = 'test-bucket'