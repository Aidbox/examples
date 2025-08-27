import { Card } from '@/components/ui/Card'

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <p className="mt-1 text-sm text-gray-600">
          Schedule and manage appointments
        </p>
      </div>

      <Card className="p-6">
        <p className="text-gray-500 text-center py-8">
          Appointment scheduling is coming soon!
        </p>
      </Card>
    </div>
  )
}