import { supabase } from '../../infrastructure/api/client'

export interface DailyPoint {
  date: string
  clicks: number
  impressions: number
  position: number
  ctr: number
}

export async function fetchKeywordHistory(query: string): Promise<DailyPoint[]> {
  const { data } = await supabase
    .from('gsc_query_daily')
    .select('date, clicks, impressions, position, ctr')
    .eq('query', query.toLowerCase().trim())
    .order('date', { ascending: true })
  return data || []
}

export async function searchKeywords(prefix: string, limit = 12): Promise<{ query: string, totalClicks: number, totalImpr: number }[]> {
  if (!prefix || prefix.length < 2) return []
  const { data } = await supabase
    .from('gsc_query_daily')
    .select('query, clicks, impressions')
    .ilike('query', `%${prefix.toLowerCase()}%`)
  if (!data) return []

  // Aggrégation côté client
  const agg = new Map<string, { totalClicks: number, totalImpr: number }>()
  for (const r of data) {
    const e = agg.get(r.query) || { totalClicks: 0, totalImpr: 0 }
    e.totalClicks += r.clicks
    e.totalImpr += r.impressions
    agg.set(r.query, e)
  }
  return [...agg.entries()]
    .map(([query, v]) => ({ query, ...v }))
    .sort((a, b) => b.totalImpr - a.totalImpr)
    .slice(0, limit)
}
