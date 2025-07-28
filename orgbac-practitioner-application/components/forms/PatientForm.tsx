'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface PatientFormData {
  firstName: string
  lastName: string
  birthDate: string
  gender: 'male' | 'female' | 'other' | 'unknown'
  phone: string
  email: string
  addressLine: string
  city: string
  state: string
  postalCode: string
}

export function PatientForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'unknown',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission (handles React StrictMode)
    if (loading || submittingRef.current) {
      return
    }
    
    submittingRef.current = true
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: {
            given: [formData.firstName],
            ...(formData.lastName && { family: formData.lastName })
          },
          ...(formData.birthDate && { birthDate: formData.birthDate }),
          ...(formData.gender && formData.gender !== 'unknown' && { gender: formData.gender }),
          telecom: [
            ...(formData.phone ? [{
              system: 'phone',
              value: formData.phone,
              use: 'mobile'
            }] : []),
            ...(formData.email ? [{
              system: 'email',
              value: formData.email
            }] : [])
          ].filter(Boolean),
          ...(formData.addressLine && {
            address: [{
              line: [formData.addressLine],
              ...(formData.city && { city: formData.city }),
              ...(formData.state && { state: formData.state }),
              ...(formData.postalCode && { postalCode: formData.postalCode })
            }]
          })
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create patient')
      }

      router.push('/patients')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  const handleChange = (field: keyof PatientFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={handleChange('firstName')}
            required
          />
          <Input
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={handleChange('lastName')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date of Birth"
            type="date"
            value={formData.birthDate}
            onChange={handleChange('birthDate')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={handleChange('gender')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="unknown">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Contact Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="(555) 123-4567"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="patient@example.com"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Address</h3>
        
        <Input
          label="Street Address"
          type="text"
          value={formData.addressLine}
          onChange={handleChange('addressLine')}
          placeholder="123 Main St"
        />
        
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="City"
            type="text"
            value={formData.city}
            onChange={handleChange('city')}
          />
          <Input
            label="State"
            type="text"
            value={formData.state}
            onChange={handleChange('state')}
            maxLength={2}
          />
          <Input
            label="ZIP Code"
            type="text"
            value={formData.postalCode}
            onChange={handleChange('postalCode')}
            pattern="[0-9]{5}"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/patients')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Patient'}
        </Button>
      </div>
    </form>
  )
} 