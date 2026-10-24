export type EventConfig = {
  title: string | null
  organizer: string | null
  date: string | null
  startTime: string | null
  endTime: string | null
  timezone: string | null
  utcOffsetMinutes: number | null
  venue: string | null
  address: string | null
  directionsUrl: string | null
  arrivalNotes: string | null
  practicalNotes: string | null
  rsvpBeforeDate: string | null
  allowPlusOne: boolean | null
  maxGuestCount: number | 'unlimited' | null
}

// Host-supplied facts from note.txt. Blank / N/A fields remain unresolved.
export const archive = {
  host: 'Hoàng',
  fullName: 'Lưu Cao Hoàng',
  // handle: 'hoanglc',
  year: '2026',
} as const
export const unconfirmed = 'Chưa xác nhận'
export const event: EventConfig = {
  title: 'LỄ TỐT NGHIỆP FPTU HCM 2026',
  organizer: 'Đại học FPT HCM',
  date: '2026-11-07',
  startTime: '09:00',
  endTime: '12:00',
  timezone: 'GMT+7',
  utcOffsetMinutes: 7 * 60,
  venue: 'FPT University HCMC',
  address: 'Lô E2a-7, Đường D1, Khu Công nghệ cao, Phường Tăng Nhơn Phú, TP. Hồ Chí Minh',
  directionsUrl: 'https://maps.app.goo.gl/UUaQjGfEuRA5vrtf9',
  arrivalNotes: "",
  practicalNotes: null,
  rsvpBeforeDate: '2026-11-07',
  allowPlusOne: true,
  maxGuestCount: 'unlimited',
}

// These are civil dates, not instants. Preserve the day without timezone conversion.
export function formatEventDate(date: string | null): string {
  if (!date) return unconfirmed
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

export function formatEventTime(time: string | null): string {
  if (!time) return unconfirmed
  return time.replace(':', 'h')
}

export function formatGuestLimit(
  allowPlusOne: boolean | null,
  maxGuestCount: EventConfig['maxGuestCount'],
): string {
  if (allowPlusOne === null) return unconfirmed
  if (!allowPlusOne) return 'Không áp dụng'
  if (maxGuestCount === 'unlimited') return 'Không giới hạn'
  return maxGuestCount?.toString() ?? unconfirmed
}
