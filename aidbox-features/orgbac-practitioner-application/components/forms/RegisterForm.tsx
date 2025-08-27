'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { validatePassword, isValidEmail } from '@/lib/utils/validation'

interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

export function RegisterForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [loadingMessage, setLoadingMessage] = useState('')
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email
    if (!isValidEmail(formData.email)) {
      setError('Invalid email format')
      return
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0])
      return
    }

    setLoading(true)
    setLoadingMessage('Creating your account...')

    try {
      setLoadingMessage('Setting up your organization...')
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setLoadingMessage('Account created! Redirecting to login...')
      
      // Small delay to show success message
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setLoadingMessage('')
    } finally {
      setTimeout(() => {
        setLoading(false)
        setLoadingMessage('')
      }, 1000)
    }
  }

  const handleChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    
    // Real-time password validation
    if (field === 'password') {
      const validation = validatePassword(e.target.value)
      setPasswordErrors(validation.errors)
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <h2 className="text-2xl font-bold text-center mb-6">
        Create Practitioner Account
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={handleChange('firstName')}
            required
            placeholder="John"
          />
          <Input
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={handleChange('lastName')}
            required
            placeholder="Doe"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange('email')}
          required
          placeholder="john.doe@example.com"
        />


        <div>
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            required
            placeholder="••••••••"
            helperText={passwordErrors.length === 0 && formData.password.length > 0 
              ? "Password is valid" 
              : "Enter a password"}
          />
          {formData.password.length > 0 && passwordErrors.length > 0 && (
            <ul className="mt-2 text-sm text-red-600 space-y-1">
              {passwordErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Input
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          required
          placeholder="••••••••"
        />

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </Button>

        {loading && loadingMessage && (
          <div className="text-center text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              {loadingMessage}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in
          </a>
        </p>
      </form>
    </Card>
  )
}