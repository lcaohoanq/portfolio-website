export type RsvpStatus = 'attending' | 'declined' | 'maybe'

export type RsvpResponse = {
  status: RsvpStatus | null
  partySize: number
  message: string
  updatedAt: string | null
}

type RsvpRow = {
  status: RsvpStatus | null
  party_size: number | null
  message: string | null
  updated_at: string | null
}

type DashboardRow = RsvpRow & {
  guest_slug: string
  display_name: string
  responded_at: string | null
}

export type DashboardRsvp = RsvpResponse & {
  guestSlug: string
  displayName: string
  respondedAt: string | null
}

const supabaseUrl = __SUPABASE_URL__.replace(/\/$/, '')
const supabaseKey = __SUPABASE_ANON_KEY__

export const rsvpConfigured = Boolean(supabaseUrl && supabaseKey)

export async function callRsvpRpc<T>(
  functionName:
    | 'get_guest_rsvp'
    | 'submit_guest_rsvp'
    | 'get_rsvp_dashboard'
    | 'create_invitation'
    | 'get_invitation'
    | 'get_invitation_links'
    | 'get_gallery_captions'
    | 'set_gallery_caption',
  body: Record<string, string | number>,
): Promise<T> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('RSVP_CONFIGURATION_MISSING')
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.code === '23505' ? 'INVITATION_SLUG_EXISTS' : 'RSVP_REQUEST_FAILED')
  }
  return (await response.json()) as T
}

export type InvitationLink = { guest_slug: string; access_token: string }

export function getInvitationLinks(accessToken: string) {
  return callRsvpRpc<InvitationLink[]>('get_invitation_links', { p_access_token: accessToken })
}

export function createInvitation(accessToken: string, values: {
  slug: string; name: string; greeting: string; message: string; token: string
}) {
  return callRsvpRpc<InvitationLink[]>('create_invitation', {
    p_access_token: accessToken, p_slug: values.slug, p_display_name: values.name,
    p_greeting: values.greeting, p_message: values.message, p_guest_token: values.token,
  }).then((rows) => {
    if (!rows[0]) throw new Error('INVITATION_EMPTY_RESPONSE')
    return rows[0]
  })
}

export function getInvitation(slug: string, accessToken: string) {
  return callRsvpRpc<Array<{
    guest_slug: string; display_name: string; greeting: string; invitation_message: string
  }>>('get_invitation', { p_slug: slug, p_access_token: accessToken })
    .then((rows) => rows[0] ?? null)
}

function mapRsvpRow(row: RsvpRow | undefined): RsvpResponse | null {
  if (!row) return null

  return {
    status: row.status,
    partySize: row.party_size ?? 1,
    message: row.message ?? '',
    updatedAt: row.updated_at,
  }
}

export function getRsvp(slug: string, accessToken: string) {
  return callRsvpRpc<RsvpRow[]>('get_guest_rsvp', {
    p_slug: slug,
    p_access_token: accessToken,
  }).then((rows) => mapRsvpRow(rows[0]))
}

export function submitRsvp(
  slug: string,
  accessToken: string,
  values: Pick<RsvpResponse, 'status' | 'partySize' | 'message'>,
) {
  if (!values.status) throw new Error('RSVP_STATUS_REQUIRED')
  return callRsvpRpc<RsvpRow[]>('submit_guest_rsvp', {
    p_slug: slug,
    p_access_token: accessToken,
    p_status: values.status,
    p_party_size: values.partySize,
    p_message: values.message,
  }).then((rows) => mapRsvpRow(rows[0]))
}

export function getRsvpDashboard(accessToken: string) {
  return callRsvpRpc<DashboardRow[]>('get_rsvp_dashboard', {
    p_access_token: accessToken,
  }).then((rows) =>
    rows.map((row) => ({
      guestSlug: row.guest_slug,
      displayName: row.display_name,
      status: row.status,
      partySize: row.party_size ?? 1,
      message: row.message ?? '',
      respondedAt: row.responded_at,
      updatedAt: row.updated_at,
    })),
  )
}
