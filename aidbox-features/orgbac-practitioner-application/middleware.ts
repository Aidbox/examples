import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { JWTService } from './lib/auth/jwt'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/register')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  
  // Minimal middleware logging
  
  // Skip middleware for API routes except protected ones
  if (isApiRoute && !request.nextUrl.pathname.startsWith('/api/patients') && 
      !request.nextUrl.pathname.startsWith('/api/dashboard')) {
    return NextResponse.next()
  }

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token) {
    const jwtService = new JWTService()
    const payload = await jwtService.verifyToken(token)
    
    if (!payload && !isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (payload && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Add organization ID to headers for API routes
    if (payload && isApiRoute) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-organization-id', payload.organizationId)
      requestHeaders.set('Authorization', `Bearer ${token}`) // Pass token for Aidbox
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        }
      })
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}