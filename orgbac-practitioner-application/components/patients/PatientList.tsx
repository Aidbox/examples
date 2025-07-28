'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { formatDate, formatPhone } from '@/lib/utils/format'

interface Patient {
  id: string
  name: {
    given: string[]
    family: string
  }
  birthDate: string
  gender: string
  phone?: string
  email?: string
}

export function PatientList() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchPatients()
  }, [currentPage, searchTerm])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm })
      })
      
      const response = await fetch(`/api/patients?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPatients(data.patients || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchPatients()
  }

  const handleAppointment = (patientId: string, patientName: string) => {
    alert(`📅 Appointment scheduling for ${patientName} coming soon! This is a demo feature.`)
  }

  const handleCall = (patientId: string, patientName: string) => {
    alert(`📞 Video call feature for ${patientName} coming soon! This is a demo feature.`)
  }

  const columns = [
    { key: 'name', label: 'Patient Name' },
    { key: 'birthDate', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'contact', label: 'Contact' },
    { key: 'actions', label: 'Actions' }
  ]

  const renderRow = (patient: Patient) => ({
    name: (
      <button
        onClick={() => router.push(`/patients/${patient.id}`)}
        className="text-blue-600 hover:underline font-medium"
      >
        {patient.name.given.join(' ')} {patient.name.family}
      </button>
    ),
    birthDate: formatDate(patient.birthDate),
    gender: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Unknown',
    contact: (
      <div className="text-sm">
        {patient.phone && <div>📞 {formatPhone(patient.phone)}</div>}
        {patient.email && <div>✉️ {patient.email}</div>}
      </div>
    ),
    actions: (
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleAppointment(patient.id, `${patient.name.given[0]} ${patient.name.family}`)}
          title="Schedule Appointment"
        >
          📅
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleCall(patient.id, `${patient.name.given[0]} ${patient.name.family}`)}
          title="Start Video Call"
        >
          📞
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => router.push(`/patients/${patient.id}/edit`)}
          title="Edit Patient"
        >
          ✏️
        </Button>
      </div>
    )
  })

  return (
    <Card className="p-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search patients by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">Search</Button>
        </div>
      </form>

      {/* Patient Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading patients...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'No patients found matching your search.' : 'No patients registered yet.'}
          </p>
          <Button onClick={() => router.push('/patients/new')}>
            Add Your First Patient
          </Button>
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={patients.map(patient => renderRow(patient))}
          />

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
} 