'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page on home page visit
    router.push('/login')
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Practitioner Application
        </h1>
        <p className="text-xl text-gray-600">
          Redirecting to login...
        </p>
      </div>
    </main>
  )
}