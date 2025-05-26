import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporarily disabled Clerk - uncomment when keys are configured
// import { authMiddleware } from "@clerk/nextjs/server";

export function middleware(request: NextRequest) {
  // For now, just pass through all requests
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}