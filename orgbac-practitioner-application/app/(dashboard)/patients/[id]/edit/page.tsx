import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface PatientEditPageProps {
  params: Promise<{ id: string }>
}

export default async function PatientEditPage({ params }: PatientEditPageProps) {
  const { id } = await params
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Patient</h2>
          <p className="mt-1 text-sm text-gray-600">
            Patient ID: {id}
          </p>
        </div>
        <Link href={`/patients/${id}`}>
          <Button variant="secondary">
            ← Back to Patient
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✏️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Patient Edit Form Coming Soon
          </h3>
          <p className="text-gray-500 mb-6">
            This page will allow you to update patient information including contact details, 
            medical information, and preferences.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Editing Patient:</strong> {id}</p>
            <p><strong>Features Coming:</strong> Edit personal info, contact details, medical data</p>
          </div>
          
          <div className="mt-8">
            <Link href="/patients">
              <Button>
                Go Back to Patient List
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
} 