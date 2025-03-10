export interface EhrEventBase {
  recipient: string
  date: string
  type: string,
  // TODO add types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: any
}