/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string): string {
  if (!phone) return 'N/A'
  
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  
  return phone
}

/**
 * Get display name from FHIR HumanName
 */
export function getDisplayName(name: { given?: string[], family?: string }): string {
  if (!name) return 'Unknown'
  
  const given = name.given?.join(' ') || ''
  const family = name.family || ''
  
  return `${given} ${family}`.trim() || 'Unknown'
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0
  
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return Math.max(0, age)
}

/**
 * Format email for display
 */
export function formatEmail(email: string): string {
  if (!email) return 'N/A'
  return email.toLowerCase()
}

/**
 * Generate a random organization name for a practitioner
 */
export function generateOrganizationName(firstName: string, lastName: string): string {
  const organizationTypes = [
    'Medical Center',
    'Health Clinic',
    'Family Practice',
    'Medical Practice',
    'Healthcare Center',
    'Wellness Clinic',
    'Primary Care',
    'Medical Associates',
    'Health Services',
    'Care Center'
  ]
  
  const formats = [
    () => `Dr. ${lastName}'s ${organizationTypes[Math.floor(Math.random() * organizationTypes.length)]}`,
    () => `${lastName} ${organizationTypes[Math.floor(Math.random() * organizationTypes.length)]}`,
    () => `${firstName} ${lastName} ${organizationTypes[Math.floor(Math.random() * organizationTypes.length)]}`,
    () => `${lastName} Family ${organizationTypes[Math.floor(Math.random() * organizationTypes.length)]}`
  ]
  
  const selectedFormat = formats[Math.floor(Math.random() * formats.length)]
  return selectedFormat()
}