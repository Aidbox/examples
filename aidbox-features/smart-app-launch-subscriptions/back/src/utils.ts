// todo - check for existing conventional solutions
export const parseFhirBody = (body: Buffer) => {
  const raw = body.toString('utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`Cannot parse FHIR body: ${error?.message ?? 'unknown'}`)
  }
}