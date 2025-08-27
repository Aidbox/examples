import { PatientList } from '@/components/patients/PatientList'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your patient records
          </p>
        </div>
        <Link href="/patients/new">
          <Button>
            <span className="mr-2">➕</span>
            Add New Patient
          </Button>
        </Link>
      </div>

      <PatientList />
    </div>
  )
}