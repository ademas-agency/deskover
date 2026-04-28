// Edge function : Keyword Planner (Google Ads API)
// Reçoit un mot-clé, renvoie volume mensuel + concurrence + idées associées
// Cache résultats 30j dans la table keyword_ideas

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const GOOGLE_ADS_API_VERSION = 'v17'
const CACHE_TTL_DAYS = 30
const FRENCH_LANGUAGE_ID = '1002'      // languageConstants/1002 = French
const FRANCE_GEO_ID = '2250'           // geoTargetConstants/2250 = France

interface OAuthCreds {
  clientId: string
  clientSecret: string
  refreshToken: string
}

interface KeywordIdea {
  keyword: string
  avg_monthly_searches: number | null
  competition: string
  competition_index: number | null
  low_top_of_page_bid_micros: number | null
  high_top_of_page_bid_micros: number | null
}

const creds: OAuthCreds = {
  clientId: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '',
  clientSecret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '',
  refreshToken: Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN') || '',
}

const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') || ''
const customerId = (Deno.env.get('GOOGLE_ADS_CUSTOMER_ID') || '').replace(/-/g, '')
const loginCustomerId = (Deno.env.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || '').replace(/-/g, '')

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function getAccessToken(): Promise<string> {
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

function normalizeKeyword(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function generateKeywordIdeas(token: string, seed: string): Promise<KeywordIdea[]> {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}:generateKeywordIdeas`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  }
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId

  const body = {
    language: `languageConstants/${FRENCH_LANGUAGE_ID}`,
    geoTargetConstants: [`geoTargetConstants/${FRANCE_GEO_ID}`],
    keywordSeed: { keywords: [seed] },
    includeAdultKeywords: false,
    keywordPlanNetwork: 'GOOGLE_SEARCH',
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Ads API ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = await res.json()

  return (data.results || []).map((r: any): KeywordIdea => {
    const m = r.keywordIdeaMetrics || {}
    return {
      keyword: r.text,
      avg_monthly_searches: m.avgMonthlySearches != null ? Number(m.avgMonthlySearches) : null,
      competition: m.competition || 'UNSPECIFIED',
      competition_index: m.competitionIndex != null ? Number(m.competitionIndex) : null,
      low_top_of_page_bid_micros: m.lowTopOfPageBidMicros != null ? Number(m.lowTopOfPageBidMicros) : null,
      high_top_of_page_bid_micros: m.highTopOfPageBidMicros != null ? Number(m.highTopOfPageBidMicros) : null,
    }
  })
}

async function readCache(keyword: string) {
  const { data } = await supabase
    .from('keyword_ideas')
    .select('*')
    .eq('keyword', keyword)
    .maybeSingle()

  if (!data) return null

  const fetchedAt = new Date(data.fetched_at).getTime()
  const ageDays = (Date.now() - fetchedAt) / (1000 * 60 * 60 * 24)
  if (ageDays > CACHE_TTL_DAYS) return null

  return data
}

async function writeCache(seed: KeywordIdea, ideas: KeywordIdea[]) {
  await supabase.from('keyword_ideas').upsert({
    keyword: seed.keyword,
    avg_monthly_searches: seed.avg_monthly_searches,
    competition: seed.competition,
    competition_index: seed.competition_index,
    low_top_of_page_bid_micros: seed.low_top_of_page_bid_micros,
    high_top_of_page_bid_micros: seed.high_top_of_page_bid_micros,
    related_keywords: ideas.filter(i => i.keyword !== seed.keyword).slice(0, 50),
    fetched_at: new Date().toISOString(),
  })
}

Deno.serve(async (req) => {
  // Auth : la function est déployée avec verify_jwt=true (défaut), donc Supabase
  // gateway rejette déjà les requêtes sans JWT valide. On a juste à vérifier la méthode.

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    if (!creds.clientId || !creds.clientSecret || !creds.refreshToken) {
      return Response.json({ ok: false, error: 'Missing Google OAuth env' }, { status: 500 })
    }
    if (!developerToken || !customerId) {
      return Response.json({ ok: false, error: 'Missing Google Ads env (developer token / customer id)' }, { status: 500 })
    }

    const { keyword: rawKeyword, force } = await req.json().catch(() => ({}))
    if (!rawKeyword || typeof rawKeyword !== 'string') {
      return Response.json({ ok: false, error: 'keyword required' }, { status: 400 })
    }

    const keyword = normalizeKeyword(rawKeyword)
    if (!keyword) {
      return Response.json({ ok: false, error: 'empty keyword' }, { status: 400 })
    }

    if (!force) {
      const cached = await readCache(keyword)
      if (cached) {
        return Response.json({
          ok: true,
          keyword: cached.keyword,
          cached: true,
          fetchedAt: cached.fetched_at,
          metrics: {
            avgMonthlySearches: cached.avg_monthly_searches,
            competition: cached.competition,
            competitionIndex: cached.competition_index,
            lowTopOfPageBidMicros: cached.low_top_of_page_bid_micros,
            highTopOfPageBidMicros: cached.high_top_of_page_bid_micros,
          },
          related: cached.related_keywords || [],
        })
      }
    }

    const token = await getAccessToken()
    const ideas = await generateKeywordIdeas(token, keyword)

    const seed = ideas.find(i => normalizeKeyword(i.keyword) === keyword) || {
      keyword,
      avg_monthly_searches: null,
      competition: 'UNSPECIFIED',
      competition_index: null,
      low_top_of_page_bid_micros: null,
      high_top_of_page_bid_micros: null,
    }

    await writeCache(seed, ideas)

    return Response.json({
      ok: true,
      keyword: seed.keyword,
      cached: false,
      fetchedAt: new Date().toISOString(),
      metrics: {
        avgMonthlySearches: seed.avg_monthly_searches,
        competition: seed.competition,
        competitionIndex: seed.competition_index,
        lowTopOfPageBidMicros: seed.low_top_of_page_bid_micros,
        highTopOfPageBidMicros: seed.high_top_of_page_bid_micros,
      },
      related: ideas.filter(i => i.keyword !== seed.keyword).slice(0, 50),
    })
  } catch (err) {
    console.error(err)
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
})
