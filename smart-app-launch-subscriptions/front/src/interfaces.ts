export interface SmartAppLaunchSubscriptionsConfig {
  apiKey: string
  height?: number
  width?: number
}

// todo - make shared between front and back
export interface EhrEventBase {
  recipient: string
  date: string
}

export interface EhrEventCreateEncounter extends EhrEventBase {
  type: 'encounter_created'
  params: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encounter: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patient: any
  }
}

export interface EhrEventTest extends EhrEventBase {
  type: 'test'
  params: {
    testParam: string
  }
}

export type EhrEvent = EhrEventCreateEncounter | EhrEventTest