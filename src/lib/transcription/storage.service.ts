import { GetObjectCommand, S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export class StorageService {
  static async getSignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
    })

    // URL valid for 1 hour
    return getSignedUrl(s3Client, command, { expiresIn: 3600 })
  }

  static async checkFileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })
      await s3Client.send(command)
      return true
    } catch (error) {
      return false
    }
  }

  static extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remove leading slash
      return urlObj.pathname.substring(1)
    } catch {
      // If not a valid URL, assume it's already a key
      return url
    }
  }

  static async getFileMetadata(key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })
      const response = await s3Client.send(command)
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      }
    } catch (error) {
      console.error('Error getting file metadata:', error)
      return null
    }
  }
}