import { EhrEvent } from '../types'

export const NotificationMessage = ({ event }: { event: EhrEvent }) => {
  return (
    <div>
      <div>
        {event.date}
      </div>
      {event.msg}
    </div>
  )
}