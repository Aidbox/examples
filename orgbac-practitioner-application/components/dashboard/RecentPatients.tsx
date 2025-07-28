'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/format'

interface Patient {
  id: string
  name: {
    given: string[]
    family: string
  }
  lastVisit?: string
}

export function RecentPatients() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentPatients()
  }, [])

  const fetchRecentPatients = async () => {
    try {
      const response = await fetch('/api/patients?limit=5&sort=lastVisit')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients)
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Patients</h3>
        <button
          onClick={() => router.push('/patients')}
          className="text-sm text-blue-600 hover:underline"
        >
          View all
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No patients yet. Add your first patient to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => router.push(`/patients/${patient.id}`)}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="font-medium text-gray-900">
                {patient.name.given.join(' ')} {patient.name.family}
              </p>
              {patient.lastVisit && (
                <p className="text-sm text-gray-500">
                  Last visit: {formatDate(patient.lastVisit)}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}