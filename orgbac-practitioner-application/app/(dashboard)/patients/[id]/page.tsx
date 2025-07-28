import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface PatientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
          <p className="mt-1 text-sm text-gray-600">
            Patient ID: {id}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/patients/${id}/edit`}>
            <Button variant="secondary">
              ✏️ Edit Patient
            </Button>
          </Link>
          <Link href="/patients">
            <Button variant="secondary">
              ← Back to Patients
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Patient Details Coming Soon
          </h3>
          <p className="text-gray-500 mb-6">
            This page will display comprehensive patient information including medical history, 
            appointments, and treatment plans.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Current Patient ID:</strong> {id}</p>
            <p><strong>Features Coming:</strong> Medical records, vital signs, prescriptions, notes</p>
          </div>
        </div>
      </Card>

      {/* Fake Door Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <button 
            onClick={() => alert('📅 Appointment scheduling coming soon!')}
            className="w-full text-center hover:bg-gray-50 rounded p-2"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="font-medium">Schedule Appointment</div>
            <div className="text-sm text-gray-500">Book next visit</div>
          </button>
        </Card>
        
        <Card className="p-4">
          <button 
            onClick={() => alert('📞 Video call feature coming soon!')}
            className="w-full text-center hover:bg-gray-50 rounded p-2"
          >
            <div className="text-2xl mb-2">📞</div>
            <div className="font-medium">Start Video Call</div>
            <div className="text-sm text-gray-500">Connect with patient</div>
          </button>
        </Card>
        
        <Card className="p-4">
          <button 
            onClick={() => alert('📋 Medical records coming soon!')}
            className="w-full text-center hover:bg-gray-50 rounded p-2"
          >
            <div className="text-2xl mb-2">📋</div>
            <div className="font-medium">View Records</div>
            <div className="text-sm text-gray-500">Medical history</div>
          </button>
        </Card>
      </div>
    </div>
  )
} 