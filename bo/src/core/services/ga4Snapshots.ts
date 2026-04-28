import { supabase } from '../../infrastructure/api/client'

export interface Ga4Totals {
  activeUsers: number
  sessions: number
  screenPageViews: number
  engagementRate: number
  averageSessionDuration: number
  newUsers: number
}

export interface Ga4PageRow {
  page: string
  views: number
  users: number
  sessions: number
  engagementRate: number
  avgEngagementTime: number
}

export interface Ga4SourceRow {
  source: string
  medium: string
  sessions: number
  users: number
}

export interface Ga4EventRow {
  name: string
  count: number
  users: number
}

export interface Ga4CountryRow {
  country: string
  users: number
  sessions: number
}

export interface Ga4DeviceRow {
  category: string
  users: number
  sessions: number
}

export interface Ga4Snapshot {
  id: string
  period_start: string
  period_end: string
  period_days: number
  totals: Ga4Totals
  pages: Ga4PageRow[]
  sources: Ga4SourceRow[]
  events: Ga4EventRow[]
  countries: Ga4CountryRow[]
  devices: Ga4DeviceRow[]
  fetched_at: string
}

export async function fetchGa4Snapshot(periodDays: number): Promise<Ga4Snapshot | null> {
  const { data } = await supabase
    .from('ga4_snapshots')
    .select('*')
    .eq('period_days', periodDays)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function fetchPreviousGa4Snapshot(curr: Ga4Snapshot): Promise<Ga4Snapshot | null> {
  const { data } = await supabase
    .from('ga4_snapshots')
    .select('*')
    .eq('period_days', curr.period_days)
    .lt('period_end', curr.period_start)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function sourceLabel(source: string, medium: string): string {
  if (medium === 'organic') return `${source} · organique`
  if (medium === 'referral') return `${source} · referral`
  if (medium === '(none)' && source === '(direct)') return 'Direct'
  if (medium === 'cpc' || medium === 'paid') return `${source} · payant`
  if (medium.includes('social')) return `${source} · social`
  if (medium === 'email') return `${source} · email`
  return `${source} · ${medium}`
}
