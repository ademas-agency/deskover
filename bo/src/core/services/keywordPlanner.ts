import { supabase, supabaseAuth } from '../../infrastructure/api/client'

export type Competition = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED'

export interface KeywordMetrics {
  avgMonthlySearches: number | null
  competition: Competition
  competitionIndex: number | null
  lowTopOfPageBidMicros: number | null
  highTopOfPageBidMicros: number | null
}

export interface KeywordIdea {
  keyword: string
  avg_monthly_searches: number | null
  competition: Competition
  competition_index: number | null
  low_top_of_page_bid_micros?: number | null
  high_top_of_page_bid_micros?: number | null
}

export interface KeywordPlannerResult {
  ok: true
  keyword: string
  cached: boolean
  fetchedAt: string
  metrics: KeywordMetrics
  related: KeywordIdea[]
}

export interface KeywordPlannerError {
  ok: false
  error: string
}

export type KeywordPlannerResponse = KeywordPlannerResult | KeywordPlannerError

// Lecture seule du cache : n'appelle pas l'API, sert à afficher les volumes déjà connus
// dans la table mots-clés sans déclencher de requête.
export async function fetchCachedMetrics(keywords: string[]): Promise<Map<string, KeywordMetrics>> {
  const out = new Map<string, KeywordMetrics>()
  if (keywords.length === 0) return out

  const normalized = [...new Set(keywords.map(k => k.trim().toLowerCase()))]
  const { data } = await supabase
    .from('keyword_ideas')
    .select('keyword, avg_monthly_searches, competition, competition_index, low_top_of_page_bid_micros, high_top_of_page_bid_micros')
    .in('keyword', normalized)

  if (!data) return out

  for (const r of data) {
    out.set(r.keyword, {
      avgMonthlySearches: r.avg_monthly_searches,
      competition: r.competition,
      competitionIndex: r.competition_index,
      lowTopOfPageBidMicros: r.low_top_of_page_bid_micros,
      highTopOfPageBidMicros: r.high_top_of_page_bid_micros,
    })
  }
  return out
}

// Recherche live : appelle la edge function (qui appelle Google Ads) et met à jour le cache.
// supabaseAuth est utilisé car l'edge function vérifie le JWT du user authentifié.
export async function searchKeyword(keyword: string, options: { force?: boolean } = {}): Promise<KeywordPlannerResponse> {
  const { data, error } = await supabaseAuth.functions.invoke<KeywordPlannerResponse>('keyword-planner', {
    body: { keyword, force: options.force ?? false },
  })

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'No data returned' }
  return data
}

export function competitionLabel(c: Competition): string {
  switch (c) {
    case 'LOW': return 'Faible'
    case 'MEDIUM': return 'Moyenne'
    case 'HIGH': return 'Forte'
    default: return '—'
  }
}

export function competitionColor(c: Competition): string {
  switch (c) {
    case 'LOW': return 'bg-green-50 text-green-700 ring-green-600/20'
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 ring-amber-600/20'
    case 'HIGH': return 'bg-red-50 text-red-700 ring-red-600/20'
    default: return 'bg-zinc-50 text-zinc-600 ring-zinc-300'
  }
}

export function formatVolume(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
  return String(v)
}

// Score popularité × facilité (0-100), inspiré du score AppAnnie
// Privilégie les mots avec gros volume + faible concurrence + position pas trop loin
export function deskoverOpportunityScore(opts: {
  avgMonthlySearches: number | null
  competition: Competition
  competitionIndex: number | null
  currentPosition?: number | null
}): number | null {
  const { avgMonthlySearches: vol, competition, competitionIndex, currentPosition } = opts
  if (vol == null || vol === 0) return null

  // Volume normalisé (log scale, 1k = 50, 10k = 75, 100k = 100)
  const volScore = Math.min(100, Math.log10(Math.max(1, vol)) * 25)

  // Facilité : compétition (0-100 depuis Google) inversée
  const easeFromIdx = competitionIndex != null
    ? 100 - competitionIndex
    : competition === 'LOW' ? 80 : competition === 'MEDIUM' ? 50 : competition === 'HIGH' ? 20 : 50

  // Bonus si déjà positionné en page 2
  let positionBonus = 0
  if (currentPosition != null) {
    if (currentPosition <= 10) positionBonus = 30
    else if (currentPosition <= 20) positionBonus = 50
    else if (currentPosition <= 50) positionBonus = 20
  }

  return Math.round((volScore * 0.45) + (easeFromIdx * 0.35) + (positionBonus * 0.20))
}
