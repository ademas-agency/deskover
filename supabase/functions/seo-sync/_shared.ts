// Helpers partagés entre les sub-modules de la edge function

export interface OAuthCreds {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export async function getAccessToken(creds: OAuthCreds): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`OAuth refresh failed ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.access_token as string
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function rangeDates(days: number, daysLag = 2): { startDate: string, endDate: string } {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - daysLag)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { startDate: ymd(start), endDate: ymd(end) }
}
