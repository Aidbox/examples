import { PatientForm } from '@/components/forms/PatientForm'
import { Card } from '@/components/ui/Card'

export default function NewPatientPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add New Patient</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter patient information to create a new record
        </p>
      </div>

      <Card className="p-6">
        <PatientForm />
      </Card>
    </div>
  )
}