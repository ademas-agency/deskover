// Edge function : sync GSC + GA4 vers Supabase
// Déclenchée par pg_cron chaque lundi 9h via pg_net

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { getAccessToken, ymd, rangeDates, type OAuthCreds } from './_shared.ts'
import { generateInsights } from './insights.ts'

const SITE_URL = Deno.env.get('GSC_SITE_URL') || 'https://www.deskover.fr/'
const GA4_PROPERTY = Deno.env.get('GA4_PROPERTY_ID') || '531430422'
const PERIODS = [7, 28, 90, 365]

const creds: OAuthCreds = {
  clientId: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
  clientSecret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
  refreshToken: Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN') || '',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// === GSC ===
async function gscQuery(token: string, body: Record<string, unknown>) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.rows || []
}

async function loadExistingSlugs(): Promise<Set<string>> {
  const { data } = await supabase.from('articles').select('slug').eq('published', true)
  return new Set((data || []).map((a: { slug: string }) => a.slug))
}

async function syncGscPeriod(token: string, days: number, existing: Set<string>) {
  const { startDate, endDate } = rangeDates(days)
  const [queries, pages, pairs] = await Promise.all([
    gscQuery(token, { startDate, endDate, dimensions: ['query'], rowLimit: 1000 }),
    gscQuery(token, { startDate, endDate, dimensions: ['page'], rowLimit: 200 }),
    gscQuery(token, { startDate, endDate, dimensions: ['query', 'page'], rowLimit: 5000 }),
  ])

  const totalClicks = queries.reduce((s: number, r: any) => s + r.clicks, 0)
  const totalImpr = queries.reduce((s: number, r: any) => s + r.impressions, 0)
  const ctr = totalImpr ? totalClicks / totalImpr : 0
  const position = queries.reduce((s: number, r: any) => s + r.position * r.impressions, 0) / (totalImpr || 1)

  const insights = generateInsights(queries, pages, pairs, { clicks: totalClicks, impressions: totalImpr, ctr, position }, existing)

  await supabase.from('gsc_snapshots').upsert({
    period_start: startDate,
    period_end: endDate,
    period_days: days,
    totals: { clicks: totalClicks, impressions: totalImpr, ctr, position },
    queries: queries.map((r: any) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pages: pages.map((r: any) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pairs: pairs.map((r: any) => ({ query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    insights,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'period_start,period_end' })

  return { days, clicks: totalClicks, impressions: totalImpr }
}

async function syncGscDailyHistory(token: string) {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 2)
  const start = new Date(end)
  start.setUTCMonth(start.getUTCMonth() - 16)
  const rows = await gscQuery(token, {
    startDate: ymd(start),
    endDate: ymd(end),
    dimensions: ['date', 'query'],
    rowLimit: 25000,
  })

  let upserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r: any) => ({
      date: r.keys[0], query: r.keys[1],
      clicks: r.clicks, impressions: r.impressions, position: r.position, ctr: r.ctr,
    }))
    const { error } = await supabase.from('gsc_query_daily').upsert(chunk, { onConflict: 'date,query' })
    if (!error) upserted += chunk.length
  }
  return { rows: rows.length, upserted }
}

// === GA4 ===
async function ga4Report(token: string, body: Record<string, unknown>) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

function rowsToObjects(report: any, dimNames: string[], metricNames: string[]) {
  if (!report.rows) return []
  return report.rows.map((r: any) => {
    const obj: Record<string, string | number> = {}
    dimNames.forEach((n, i) => { obj[n] = r.dimensionValues[i]?.value ?? '' })
    metricNames.forEach((n, i) => {
      const v = r.metricValues[i]?.value ?? '0'
      obj[n] = /^\d+(\.\d+)?$/.test(v) ? Number(v) : v
    })
    return obj
  })
}

async function syncGa4Period(token: string, days: number) {
  const { startDate, endDate } = rangeDates(days, 1)
  const dateRanges = [{ startDate, endDate }]

  const totalsR = await ga4Report(token, {
    dateRanges,
    metrics: [
      { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
      { name: 'engagementRate' }, { name: 'averageSessionDuration' }, { name: 'newUsers' },
    ],
  })
  const t = totalsR.rows?.[0]?.metricValues || []
  const totals = {
    activeUsers: Number(t[0]?.value || 0),
    sessions: Number(t[1]?.value || 0),
    screenPageViews: Number(t[2]?.value || 0),
    engagementRate: Number(t[3]?.value || 0),
    averageSessionDuration: Number(t[4]?.value || 0),
    newUsers: Number(t[5]?.value || 0),
  }

  const pagesR = await ga4Report(token, {
    dateRanges,
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 200,
  })
  const pages = rowsToObjects(pagesR, ['page'], ['views', 'users', 'sessions', 'engagementRate', 'avgEngagementTime'])

  const sourcesR = await ga4Report(token, {
    dateRanges,
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 30,
  })
  const sources = rowsToObjects(sourcesR, ['source', 'medium'], ['sessions', 'users'])

  const eventsR = await ga4Report(token, {
    dateRanges,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 30,
  })
  const events = rowsToObjects(eventsR, ['name'], ['count', 'users'])

  const countriesR = await ga4Report(token, {
    dateRanges,
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 20,
  })
  const countries = rowsToObjects(countriesR, ['country'], ['users', 'sessions'])

  const devicesR = await ga4Report(token, {
    dateRanges,
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
  })
  const devices = rowsToObjects(devicesR, ['category'], ['users', 'sessions'])

  await supabase.from('ga4_snapshots').upsert({
    period_start: startDate,
    period_end: endDate,
    period_days: days,
    totals,
    pages,
    sources,
    events,
    countries,
    devices,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'period_start,period_end' })

  return { days, users: totals.activeUsers, sessions: totals.sessions }
}

// === HANDLER ===
Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  const expected = Deno.env.get('SEO_SYNC_SECRET')
  if (expected && authHeader !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
      return new Response('Missing OAuth credentials in env', { status: 500 })
    }

    const token = await getAccessToken(creds)
    const existing = await loadExistingSlugs()

    const gscResults = []
    for (const days of PERIODS) {
      gscResults.push(await syncGscPeriod(token, days, existing))
    }
    const dailyResult = await syncGscDailyHistory(token)

    const ga4Results = []
    for (const days of PERIODS) {
      ga4Results.push(await syncGa4Period(token, days))
    }

    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
      gsc: gscResults,
      gscDaily: dailyResult,
      ga4: ga4Results,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
})
