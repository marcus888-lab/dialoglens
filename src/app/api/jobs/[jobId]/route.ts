import { NextRequest, NextResponse } from 'next/server'
import { JobService } from '@/lib/queue'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    
    // Try to find the job in transcription queue first
    let jobStatus = await JobService.getTranscriptionJobStatus(jobId)
    
    // If not found, try egress queue
    if (!jobStatus) {
      jobStatus = await JobService.getEgressJobStatus(jobId)
    }
    
    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(jobStatus)
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}