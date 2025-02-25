export interface SmartAppLaunchSubscriptionsConfig {
  apiKey: string
}

// todo - make shared between front and back
export interface EhrEvent {
  date: string
  msg: string
}