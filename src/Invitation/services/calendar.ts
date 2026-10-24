import type { EventConfig } from '../data/event'

type CalendarIdentity = {
  fullName: string
}

type CalendarEvent = {
  title: string
  startsAt: string
  endsAt: string
  location: string
  description: string
}

function toUtcCalendarTimestamp(
  date: string,
  time: string,
  utcOffsetMinutes: number,
): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null

  const [, year, month, day] = dateMatch
  const [, hours, minutes] = timeMatch
  const utc = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes) - utcOffsetMinutes,
    ),
  )

  if (Number.isNaN(utc.getTime())) return null
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function createCalendarEvent(
  config: EventConfig,
  identity: CalendarIdentity,
): CalendarEvent | null {
  const {
    title,
    organizer,
    date,
    startTime,
    endTime,
    utcOffsetMinutes,
    venue,
    address,
    arrivalNotes,
  } = config

  if (
    !title ||
    !date ||
    !startTime ||
    !endTime ||
    utcOffsetMinutes === null ||
    !venue ||
    !address
  ) {
    return null
  }

  const startsAt = toUtcCalendarTimestamp(date, startTime, utcOffsetMinutes)
  const endsAt = toUtcCalendarTimestamp(date, endTime, utcOffsetMinutes)
  if (!startsAt || !endsAt) return null

  return {
    title,
    startsAt,
    endsAt,
    location: `${venue}, ${address}`,
    description: [
      organizer,
      `Lễ tốt nghiệp của ${identity.fullName}.`,
      arrivalNotes,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

export function createGoogleCalendarUrl(
  config: EventConfig,
  identity: CalendarIdentity,
): string | null {
  const calendarEvent = createCalendarEvent(config, identity)
  if (!calendarEvent) return null

  const parameters = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarEvent.title,
    dates: `${calendarEvent.startsAt}/${calendarEvent.endsAt}`,
    details: calendarEvent.description,
    location: calendarEvent.location,
  })

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`
}
