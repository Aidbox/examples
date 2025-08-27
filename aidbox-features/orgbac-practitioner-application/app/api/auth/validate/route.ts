import { NextRequest, NextResponse } from 'next/server'
import { JWTService } from '@/lib/auth/jwt'

// This endpoint is for Aidbox TokenIntrospector
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ active: false })
    }
    
    const jwtService = new JWTService()
    const introspection = jwtService.introspectToken(token)

    return NextResponse.json(introspection)
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ active: false })
  }
}