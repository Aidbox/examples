export interface EhrEventBase {
  userId: string
  date: string
  msg: string
}

export interface EhrEventCreateEncounter extends EhrEventBase {
  patientId: number
  doctorId: number
}
