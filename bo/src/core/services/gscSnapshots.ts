import { supabase } from '../../infrastructure/api/client'

export interface GscTotals {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscQueryRow {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscPageRow {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscPairRow {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscInsight {
  type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  page?: string
  query?: string
  position?: number
  impressions?: number
  ctr?: number
  clicks?: number
  city?: string
}

export interface GscInsights {
  quickWins: GscInsight[]
  technicalIssues: GscInsight[]
  contentSuggestions: GscInsight[]
  placeImprovements: GscInsight[]
  strategy: { niche: string; impressions: number; clicks: number; queries: string[]; action: string }[]
}

export interface GscSnapshot {
  id: string
  period_start: string
  period_end: string
  period_days: number
  totals: GscTotals
  queries: GscQueryRow[]
  pages: GscPageRow[]
  pairs: GscPairRow[]
  insights: GscInsights
  fetched_at: string
}

export async function fetchSnapshot(periodDays: number): Promise<GscSnapshot | null> {
  const { data } = await supabase
    .from('gsc_snapshots')
    .select('*')
    .eq('period_days', periodDays)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function fetchPreviousSnapshot(currentSnapshot: GscSnapshot): Promise<GscSnapshot | null> {
  // Cherche le snapshot juste avant celui-ci pour cette période
  const { data } = await supabase
    .from('gsc_snapshots')
    .select('*')
    .eq('period_days', currentSnapshot.period_days)
    .lt('period_end', currentSnapshot.period_start)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export function delta(curr: number, prev: number): number {
  if (!prev) return 0
  return ((curr - prev) / prev) * 100
}

export function formatNumber(n: number): string {
  return n.toLocaleString('fr-FR')
}

export function formatPercent(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function formatPosition(n: number): string {
  return n.toFixed(1)
}
