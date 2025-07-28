/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
  return phoneRegex.test(phone)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!password || password.trim() === '') {
    errors.push('Password is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate required fields
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validate date format and range
 */
export function validateBirthDate(dateString: string): string | null {
  if (!dateString) return 'Birth date is required'
  
  const date = new Date(dateString)
  const today = new Date()
  const minDate = new Date(today.getFullYear() - 120, 0, 1)
  
  if (isNaN(date.getTime())) {
    return 'Invalid date format'
  }
  
  if (date > today) {
    return 'Birth date cannot be in the future'
  }
  
  if (date < minDate) {
    return 'Birth date cannot be more than 120 years ago'
  }
  
  return null
}