import { NextResponse } from 'next/server'
import { SessionService } from '@/lib/auth/session'

export async function POST() {
  try {
    const sessionService = new SessionService()
    await sessionService.clearSession()

    // Create response and clear the auth-token cookie
    const response = NextResponse.json({ success: true })
    
    // Clear the auth-token cookie by setting it to expire in the past
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: -1, // Expire immediately
      path: '/' // Ensure we clear the cookie for the entire domain
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}