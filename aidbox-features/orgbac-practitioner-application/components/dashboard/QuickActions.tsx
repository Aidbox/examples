'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'

export function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      title: 'Add New Patient',
      description: 'Register a new patient in your practice',
      icon: '➕',
      onClick: () => router.push('/patients/new')
    },
    {
      title: 'Schedule Appointment',
      description: 'Book an appointment for a patient',
      icon: '📅',
      onClick: () => alert('Appointment scheduling coming soon!')
    },
    {
      title: 'View All Patients',
      description: 'Browse and manage your patient list',
      icon: '👥',
      onClick: () => router.push('/patients')
    }
  ]

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-start">
              <span className="text-2xl mr-3">{action.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{action.title}</p>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}