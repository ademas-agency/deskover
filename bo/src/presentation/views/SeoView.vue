<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useArticlesStore } from '../../stores/articles'
import { useNotificationsStore } from '../../stores/notifications'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseBadge from '../components/ui/BaseBadge.vue'
import SparkLineChart from '../components/ui/SparkLineChart.vue'
import {
  fetchSnapshot,
  fetchPreviousSnapshot,
  delta,
  formatNumber,
  formatPercent,
  formatPosition,
  type GscSnapshot,
  type GscInsight,
} from '../../core/services/gscSnapshots'
import {
  fetchGa4Snapshot,
  fetchPreviousGa4Snapshot,
  formatDuration,
  sourceLabel,
  type Ga4Snapshot,
} from '../../core/services/ga4Snapshots'
import { fetchKeywordHistory, searchKeywords, type DailyPoint } from '../../core/services/queryHistory'
import {
  searchKeyword as searchKeywordPlanner,
  fetchCachedMetrics,
  competitionLabel,
  competitionColor,
  formatVolume,
  type KeywordMetrics,
  type KeywordIdea,
} from '../../core/services/keywordPlanner'
import { getImageStatus } from '../../core/services/articleImageStatus'
import {
  getActiveTheme, getNextTheme, formatDateRange,
} from '../../core/services/seasonalThemes'
import {
  Calendar, Globe, Copy, ExternalLink, AlertCircle, CheckCircle2, Search as SearchIcon,
  TrendingUp, TrendingDown, Minus, MousePointerClick, Eye, Target, Crosshair,
  Sparkles, Lightbulb, Wrench, FileText, Building2, Users, Clock, Activity, BarChart3,
  Compass, Loader2, X,
} from 'lucide-vue-next'

const articlesStore = useArticlesStore()
const notifications = useNotificationsStore()

type Period = 7 | 28 | 90 | 365
type Tab = 'overview' | 'keywords' | 'pages' | 'actions' | 'traffic'

const period = ref<Period>(28)
const activeTab = ref<Tab>('overview')
const snapshot = ref<GscSnapshot | null>(null)
const previousSnapshot = ref<GscSnapshot | null>(null)
const ga4Snapshot = ref<Ga4Snapshot | null>(null)
const previousGa4Snapshot = ref<Ga4Snapshot | null>(null)
const loading = ref(false)

async function loadSnapshot() {
  loading.value = true
  try {
    const [gsc, ga4] = await Promise.all([
      fetchSnapshot(period.value),
      fetchGa4Snapshot(period.value),
    ])
    snapshot.value = gsc
    ga4Snapshot.value = ga4
    const [prevGsc, prevGa4] = await Promise.all([
      gsc ? fetchPreviousSnapshot(gsc) : Promise.resolve(null),
      ga4 ? fetchPreviousGa4Snapshot(ga4) : Promise.resolve(null),
    ])
    previousSnapshot.value = prevGsc
    previousGa4Snapshot.value = prevGa4
    preloadCachedMetrics()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!articlesStore.articles.length) articlesStore.fetchArticles()
  await loadSnapshot()
})

function changePeriod(p: Period) {
  period.value = p
  loadSnapshot()
}

const today = new Date()
const activeTheme = computed(() => getActiveTheme(today))
const nextThemeInfo = computed(() => getNextTheme(today))

const articleStats = computed(() => {
  const all = articlesStore.articles
  return {
    total: all.length,
    published: all.filter(a => a.status === 'published').length,
    missingImage: all.filter(a => getImageStatus(a.cover_photo) === 'missing').length,
    externalImage: all.filter(a => getImageStatus(a.cover_photo) === 'external').length,
  }
})

interface Kpi {
  label: string
  value: string
  delta: number | null
  icon: any
  invertColor?: boolean
}

const gscKpis = computed<Kpi[]>(() => {
  if (!snapshot.value) return []
  const t = snapshot.value.totals
  const p = previousSnapshot.value?.totals
  return [
    { label: 'Clics', value: formatNumber(t.clicks), delta: p ? delta(t.clicks, p.clicks) : null, icon: MousePointerClick },
    { label: 'Impressions', value: formatNumber(t.impressions), delta: p ? delta(t.impressions, p.impressions) : null, icon: Eye },
    { label: 'CTR moyen', value: formatPercent(t.ctr), delta: p ? delta(t.ctr, p.ctr) : null, icon: Target },
    { label: 'Position moyenne', value: formatPosition(t.position), delta: p ? delta(t.position, p.position) : null, icon: Crosshair, invertColor: true },
  ]
})

const ga4Kpis = computed<Kpi[]>(() => {
  if (!ga4Snapshot.value) return []
  const t = ga4Snapshot.value.totals
  const p = previousGa4Snapshot.value?.totals
  return [
    { label: 'Utilisateurs', value: formatNumber(t.activeUsers), delta: p ? delta(t.activeUsers, p.activeUsers) : null, icon: Users },
    { label: 'Sessions', value: formatNumber(t.sessions), delta: p ? delta(t.sessions, p.sessions) : null, icon: Activity },
    { label: 'Engagement', value: formatPercent(t.engagementRate, 1), delta: p ? delta(t.engagementRate, p.engagementRate) : null, icon: Target },
    { label: 'Durée moy.', value: formatDuration(t.averageSessionDuration), delta: p ? delta(t.averageSessionDuration, p.averageSessionDuration) : null, icon: Clock },
  ]
})

// === KEYWORDS ===
const keywordSearch = ref('')
const selectedKeyword = ref<string | null>(null)
const suggestions = ref<{ query: string, totalClicks: number, totalImpr: number }[]>([])
const keywordHistory = ref<DailyPoint[]>([])
const searchingKeywords = ref(false)
const loadingHistory = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(keywordSearch, (val) => {
  // Si l'utilisateur retape après sélection, désélectionner pour relancer la recherche
  if (selectedKeyword.value && val !== selectedKeyword.value) {
    selectedKeyword.value = null
    keywordHistory.value = []
  }
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (val.trim().length < 2) { suggestions.value = []; return }
    if (selectedKeyword.value === val) { suggestions.value = []; return }
    searchingKeywords.value = true
    try { suggestions.value = await searchKeywords(val) }
    finally { searchingKeywords.value = false }
  }, 250)
})

const keywordSectionRef = ref<HTMLElement | null>(null)

async function selectKeyword(kw: string) {
  selectedKeyword.value = kw
  keywordSearch.value = kw
  suggestions.value = []
  loadingHistory.value = true
  clearPlanner()
  try {
    keywordHistory.value = await fetchKeywordHistory(kw)
    // Tente une lecture du cache Keyword Planner sans déclencher d'appel API
    const cached = await fetchCachedMetrics([kw])
    const m = cached.get(kw.toLowerCase().trim())
    if (m) plannerMetrics.value = m
  } finally {
    loadingHistory.value = false
    // Scroll vers la zone de recherche/courbe
    setTimeout(() => {
      keywordSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }
}

function clearKeyword() {
  selectedKeyword.value = null
  keywordSearch.value = ''
  keywordHistory.value = []
  suggestions.value = []
  clearPlanner()
}

// Sélection + interrogation automatique de Keyword Planner (pour l'empty state)
async function selectAndLookup(kw: string) {
  await selectKeyword(kw)
  if (!plannerMetrics.value) {
    await lookupKeywordPlanner(kw)
  }
}

const keywordChartSeries = computed(() => {
  if (!keywordHistory.value.length) return []
  return [
    { label: 'Clics', color: '#AA4C4D', data: keywordHistory.value.map(d => ({ date: d.date, value: d.clicks })), format: (n: number) => `${n}` },
    { label: 'Impressions', color: '#5B7A5E', data: keywordHistory.value.map(d => ({ date: d.date, value: d.impressions })), format: (n: number) => `${n}` },
    { label: 'Position', color: '#D4A84B', data: keywordHistory.value.map(d => ({ date: d.date, value: d.position })), invert: true, format: (n: number) => n.toFixed(1) },
  ]
})

const keywordSummary = computed(() => {
  if (!keywordHistory.value.length) return null
  const arr = keywordHistory.value
  const totalClicks = arr.reduce((s, d) => s + d.clicks, 0)
  const totalImpr = arr.reduce((s, d) => s + d.impressions, 0)
  const avgPos = arr.reduce((s, d) => s + d.position * d.impressions, 0) / (totalImpr || 1)
  const ctr = totalImpr ? totalClicks / totalImpr : 0
  // Trend last 7 vs prev 7
  const last = arr.slice(-7)
  const prev = arr.slice(-14, -7)
  const lastImpr = last.reduce((s, d) => s + d.impressions, 0)
  const prevImpr = prev.reduce((s, d) => s + d.impressions, 0)
  const trend = prevImpr ? ((lastImpr - prevImpr) / prevImpr) * 100 : null
  return { totalClicks, totalImpr, avgPos, ctr, trend, days: arr.length }
})

// === KEYWORDS LIST ===
const topKeywords = computed(() => {
  if (!snapshot.value) return []
  return [...snapshot.value.queries].sort((a, b) => b.clicks - a.clicks).slice(0, 30)
})

// Score d'opportunité : volume × proximité du top 10
// Plus tu as d'impressions et plus tu es proche de la position 1, plus c'est facile à transformer
function opportunityScore(impressions: number, position: number): number {
  if (position < 1) return 0
  // Boost exponentiel pour les positions proches du top 10
  const positionFactor = position <= 10 ? 0.3 : position <= 20 ? 1 : position <= 50 ? 0.5 : 0.1
  return Math.round(impressions * positionFactor / Math.max(position, 1) * 10)
}

const keywordsToPush = computed(() => {
  if (!snapshot.value) return []
  return [...snapshot.value.queries]
    .filter(q => q.position >= 5 && q.position <= 30 && q.impressions >= 20)
    .map(q => ({
      ...q,
      potentialClicks: Math.max(0, Math.round(q.impressions * 0.1) - q.clicks),
      score: opportunityScore(q.impressions, q.position),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
})

// État "non classé" pour la recherche d'un mot-clé absent de nos données
const keywordNotFound = computed(() => {
  return selectedKeyword.value && !loadingHistory.value && keywordHistory.value.length === 0
})

// === KEYWORD PLANNER (Google Ads) ===
const plannerMetrics = ref<KeywordMetrics | null>(null)
const plannerRelated = ref<KeywordIdea[]>([])
const plannerLoading = ref(false)
const plannerError = ref<string | null>(null)
const plannerCached = ref(false)
const plannerFetchedAt = ref<string | null>(null)
const cachedMetricsByKeyword = ref<Map<string, KeywordMetrics>>(new Map())

async function lookupKeywordPlanner(keyword: string, force = false) {
  plannerLoading.value = true
  plannerError.value = null
  try {
    const res = await searchKeywordPlanner(keyword, { force })
    if (!res.ok) {
      plannerError.value = res.error
      plannerMetrics.value = null
      plannerRelated.value = []
      return
    }
    plannerMetrics.value = res.metrics
    plannerRelated.value = res.related || []
    plannerCached.value = res.cached
    plannerFetchedAt.value = res.fetchedAt
  } catch (e) {
    plannerError.value = (e as Error).message
  } finally {
    plannerLoading.value = false
  }
}

function clearPlanner() {
  plannerMetrics.value = null
  plannerRelated.value = []
  plannerError.value = null
  plannerCached.value = false
  plannerFetchedAt.value = null
}

// Précharge les volumes cachés pour les top mots-clés affichés (sans déclencher d'appel API)
async function preloadCachedMetrics() {
  if (!snapshot.value) return
  const keywords = [
    ...snapshot.value.queries.slice(0, 30).map(q => q.query),
  ]
  cachedMetricsByKeyword.value = await fetchCachedMetrics(keywords)
}

// === PAGES ===
const topPagesByClicks = computed(() => {
  if (!snapshot.value) return []
  return [...snapshot.value.pages].sort((a, b) => b.clicks - a.clicks).slice(0, 20)
})

const topPagesByEngagement = computed(() => {
  if (!ga4Snapshot.value) return []
  return [...ga4Snapshot.value.pages]
    .filter(p => p.users >= 2)
    .sort((a, b) => (b.engagementRate * b.users) - (a.engagementRate * a.users))
    .slice(0, 15)
})

// === ACTIONS ===
const allInsights = computed(() => {
  if (!snapshot.value?.insights) return { quickWins: [], technicalIssues: [], contentSuggestions: [], placeImprovements: [], strategy: [] }
  return snapshot.value.insights
})

const insightCounts = computed(() => {
  const ins = allInsights.value
  return {
    quickWins: ins.quickWins?.length || 0,
    technicalIssues: ins.technicalIssues?.length || 0,
    contentSuggestions: ins.contentSuggestions?.length || 0,
    placeImprovements: ins.placeImprovements?.length || 0,
    total: (ins.quickWins?.length || 0) + (ins.technicalIssues?.length || 0)
         + (ins.contentSuggestions?.length || 0) + (ins.placeImprovements?.length || 0),
  }
})

const sortedAllInsights = computed<GscInsight[]>(() => {
  const ins = allInsights.value
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return [...ins.quickWins, ...ins.technicalIssues, ...ins.contentSuggestions, ...ins.placeImprovements]
    .sort((a, b) => order[a.priority] - order[b.priority])
})

const topActionsForOverview = computed(() => sortedAllInsights.value.slice(0, 5))

const insightTab = ref<'all' | 'wins' | 'tech' | 'content' | 'places'>('all')
const visibleInsights = computed<GscInsight[]>(() => {
  const ins = allInsights.value
  if (insightTab.value === 'wins') return ins.quickWins
  if (insightTab.value === 'tech') return ins.technicalIssues
  if (insightTab.value === 'content') return ins.contentSuggestions
  if (insightTab.value === 'places') return ins.placeImprovements
  return sortedAllInsights.value
})

function priorityVariant(p: GscInsight['priority']): 'danger' | 'warning' | 'info' | 'neutral' {
  if (p === 'critical') return 'danger'
  if (p === 'high') return 'warning'
  if (p === 'medium') return 'info'
  return 'neutral'
}
function priorityLabel(p: GscInsight['priority']): string {
  return { critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse' }[p]
}

function deltaArrow(d: number | null, invert = false) {
  if (d === null) return { icon: Minus, color: 'text-steam', label: '' }
  const positive = invert ? d < 0 : d > 0
  if (Math.abs(d) < 0.5) return { icon: Minus, color: 'text-steam', label: `${d.toFixed(1)}%` }
  return positive
    ? { icon: TrendingUp, color: 'text-monstera', label: `+${d.toFixed(1)}%` }
    : { icon: TrendingDown, color: 'text-red-500', label: `${d.toFixed(1)}%` }
}

function shortPage(url: string): string {
  if (!url) return ''
  return url.replace(/https?:\/\/(www\.)?deskover\.fr/, '')
}
function fullPageUrl(url: string): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://www.deskover.fr${url.startsWith('/') ? '' : '/'}${url}`
}

const copyState = ref<Record<string, boolean>>({})
async function copyText(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copyState.value[key] = true
    notifications.success('Copié')
    setTimeout(() => { copyState.value[key] = false }, 2000)
  } catch {
    notifications.error('Impossible de copier')
  }
}

const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { key: 'keywords', label: 'Mots-clés', icon: SearchIcon },
  { key: 'pages', label: 'Pages', icon: FileText },
  { key: 'actions', label: 'Plan d\'action', icon: Lightbulb },
  { key: 'traffic', label: 'Trafic', icon: Compass },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Sélecteur de période téléporté dans le header global -->
    <Teleport to="#page-header-actions" defer>
      <div class="flex items-center gap-2 bg-white border border-steam/20 rounded-lg p-1">
        <button
          v-for="p in [7, 28, 90, 365] as const"
          :key="p"
          :class="['px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            period === p ? 'bg-primary text-white' : 'text-roast hover:bg-linen']"
          @click="changePeriod(p)"
        >
          {{ p === 7 ? '7j' : p === 28 ? '28j' : p === 90 ? '3 mois' : '12 mois' }}
        </button>
      </div>
    </Teleport>

    <!-- Bandeau état -->
    <div class="flex items-center gap-3 text-xs text-steam">
      <span v-if="snapshot">
        <span class="font-semibold text-roast">GSC</span> · MAJ {{ new Date(snapshot.fetched_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
      </span>
      <span v-if="ga4Snapshot">
        · <span class="font-semibold text-roast">GA4</span> · MAJ {{ new Date(ga4Snapshot.fetched_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
      </span>
      <span v-if="snapshot">· Période {{ snapshot.period_start }} → {{ snapshot.period_end }}</span>
    </div>

    <!-- Sync notice si pas de data -->
    <BaseCard v-if="!snapshot && !loading">
      <div class="text-center py-8">
        <p class="text-base font-semibold text-espresso">Aucune donnée GSC pour cette période</p>
        <p class="text-sm text-roast mt-1">Lance la synchronisation depuis ton terminal :</p>
        <div class="mt-4 flex items-center gap-2 max-w-xl mx-auto">
          <code class="flex-1 text-left text-xs bg-cream/60 text-roast px-3 py-2 rounded font-mono break-all">
            node --env-file=.env scripts/seo/gsc-sync.js --all
          </code>
          <button class="p-2 text-roast hover:text-primary"
                  @click="copyText('sync-empty', 'node --env-file=.env scripts/seo/gsc-sync.js --all')">
            <Copy :size="14" />
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Onglets -->
    <div v-if="snapshot" class="border-b border-steam/15 flex flex-wrap gap-1">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="[
          'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2',
          activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-roast hover:text-espresso'
        ]"
        @click="activeTab = t.key"
      >
        <component :is="t.icon" :size="14" />
        {{ t.label }}
      </button>
    </div>

    <!-- ======== ONGLET : VUE D'ENSEMBLE ======== -->
    <template v-if="snapshot && activeTab === 'overview'">
      <!-- KPIs combinés -->
      <div class="space-y-2">
        <p class="text-xs font-bold uppercase tracking-wider text-roast flex items-center gap-1.5">
          <SearchIcon :size="12" /> Recherche Google
        </p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="k in gscKpis" :key="k.label" class="bg-white rounded-xl border border-steam/15 shadow-sm p-4">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-medium text-roast">{{ k.label }}</p>
                <p class="text-xl font-bold text-espresso mt-1">{{ k.value }}</p>
              </div>
              <component :is="k.icon" :size="18" class="text-primary opacity-50" />
            </div>
            <div v-if="k.delta !== null" class="flex items-center gap-1 mt-2 text-xs">
              <component :is="deltaArrow(k.delta, k.invertColor).icon" :size="12" :class="deltaArrow(k.delta, k.invertColor).color" />
              <span :class="deltaArrow(k.delta, k.invertColor).color" class="font-semibold">{{ deltaArrow(k.delta, k.invertColor).label }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="ga4Snapshot" class="space-y-2">
        <p class="text-xs font-bold uppercase tracking-wider text-roast flex items-center gap-1.5">
          <BarChart3 :size="12" /> Comportement (GA4)
        </p>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="k in ga4Kpis" :key="k.label" class="bg-white rounded-xl border border-steam/15 shadow-sm p-4">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-medium text-roast">{{ k.label }}</p>
                <p class="text-xl font-bold text-espresso mt-1">{{ k.value }}</p>
              </div>
              <component :is="k.icon" :size="18" class="text-primary opacity-50" />
            </div>
            <div v-if="k.delta !== null" class="flex items-center gap-1 mt-2 text-xs">
              <component :is="deltaArrow(k.delta, k.invertColor).icon" :size="12" :class="deltaArrow(k.delta, k.invertColor).color" />
              <span :class="deltaArrow(k.delta, k.invertColor).color" class="font-semibold">{{ deltaArrow(k.delta, k.invertColor).label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top actions -->
      <BaseCard v-if="topActionsForOverview.length">
        <template #title>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <Lightbulb :size="16" class="text-edison" />
              <span>Actions prioritaires</span>
            </div>
            <button class="text-xs text-primary hover:underline" @click="activeTab = 'actions'">
              Voir les {{ insightCounts.total }} actions →
            </button>
          </div>
        </template>
        <div class="space-y-3">
          <div v-for="(insight, i) in topActionsForOverview" :key="i" class="rounded-lg border border-steam/15 p-3">
            <div class="flex items-start gap-3">
              <BaseBadge :variant="priorityVariant(insight.priority)" class="shrink-0 mt-0.5">{{ priorityLabel(insight.priority) }}</BaseBadge>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-espresso">{{ insight.title }}</p>
                <p class="text-xs text-roast mt-1">{{ insight.action }}</p>
                <a v-if="insight.page" :href="fullPageUrl(insight.page)" target="_blank" rel="noopener"
                   class="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1.5">
                  {{ shortPage(insight.page) }} <ExternalLink :size="10" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Saison + articles compact -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BaseCard>
          <div class="flex items-start gap-3">
            <div class="text-3xl">{{ activeTheme?.emoji || '·' }}</div>
            <div class="flex-1">
              <p class="text-xs font-bold uppercase tracking-wider text-roast">Saison en cours</p>
              <p class="text-base font-semibold text-espresso mt-1">{{ activeTheme?.label || 'Aucun' }}</p>
              <p v-if="activeTheme" class="text-xs text-steam mt-1 flex items-center gap-1">
                <Calendar :size="11" /> {{ formatDateRange(activeTheme) }}
              </p>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <div class="flex items-start gap-3">
            <div class="text-3xl opacity-50">{{ nextThemeInfo?.theme.emoji || '·' }}</div>
            <div class="flex-1">
              <p class="text-xs font-bold uppercase tracking-wider text-roast">Prochaine bascule</p>
              <p class="text-base font-semibold text-espresso mt-1">{{ nextThemeInfo?.theme.label || '-' }}</p>
              <p v-if="nextThemeInfo" class="text-xs text-steam mt-1">
                dans <span class="font-semibold text-espresso">{{ nextThemeInfo.daysUntil }}j</span>
              </p>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <div class="flex items-start gap-3">
            <FileText :size="24" class="text-primary opacity-50" />
            <div class="flex-1">
              <p class="text-xs font-bold uppercase tracking-wider text-roast">Articles</p>
              <p class="text-base font-semibold text-espresso mt-1">{{ articleStats.published }}/{{ articleStats.total }} publiés</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <BaseBadge v-if="articleStats.missingImage" variant="danger">{{ articleStats.missingImage }} sans img</BaseBadge>
                <BaseBadge v-if="articleStats.externalImage" variant="warning">{{ articleStats.externalImage }} URL</BaseBadge>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </template>

    <!-- ======== ONGLET : MOTS-CLÉS ======== -->
    <template v-if="snapshot && activeTab === 'keywords'">
      <!-- Recherche libre -->
      <div ref="keywordSectionRef" class="scroll-mt-20">
      <BaseCard>
        <template #title>
          <div class="flex items-center gap-2">
            <SearchIcon :size="16" />
            <span>Recherche par mot-clé</span>
          </div>
        </template>
        <p class="text-sm text-roast mb-3">Tape un mot-clé pour voir sa progression dans le temps (clics, impressions, position).</p>

        <div class="relative max-w-2xl">
          <div class="relative">
            <SearchIcon :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-steam" />
            <input
              v-model="keywordSearch"
              type="text"
              placeholder="Ex : cafe travailler paris, coworking lyon, terrasse..."
              class="w-full rounded-lg border border-steam/30 bg-white pl-9 pr-9 py-2.5 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              @keydown.enter.prevent="suggestions.length && selectKeyword(suggestions[0].query)"
            />
            <button v-if="selectedKeyword || keywordSearch" class="absolute right-3 top-1/2 -translate-y-1/2 text-steam hover:text-roast" @click="clearKeyword">
              <X :size="14" />
            </button>
          </div>

          <!-- Suggestions dropdown (uniquement quand on a des matches GSC) -->
          <div
            v-if="!selectedKeyword && suggestions.length"
            class="absolute top-full left-0 right-0 mt-1 bg-white border border-steam/20 rounded-lg shadow-lg z-10 overflow-hidden"
          >
            <button
              v-for="s in suggestions"
              :key="s.query"
              class="w-full text-left px-3 py-2 hover:bg-linen flex items-center justify-between gap-3 border-b border-steam/5 last:border-0"
              @click="selectKeyword(s.query)"
            >
              <span class="text-sm text-espresso">{{ s.query }}</span>
              <span class="text-xs text-steam shrink-0">
                {{ formatNumber(s.totalImpr) }} impr.
                <span v-if="s.totalClicks">· {{ s.totalClicks }} clics</span>
              </span>
            </button>
          </div>
          <!-- Loading inline -->
          <div v-if="!selectedKeyword && searchingKeywords && keywordSearch.trim().length >= 2" class="text-xs text-steam mt-2 flex items-center gap-2">
            <Loader2 :size="12" class="animate-spin" /> Recherche…
          </div>
        </div>

        <!-- Empty state inline (bloc complet, pas un dropdown) -->
        <div
          v-if="!selectedKeyword && !searchingKeywords && keywordSearch.trim().length >= 2 && suggestions.length === 0"
          class="mt-4 rounded-lg border border-edison/30 bg-edison/5 p-4"
        >
          <div class="flex items-start gap-3">
            <div class="rounded-full bg-edison/10 p-2 shrink-0">
              <SearchIcon :size="16" class="text-edison" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-espresso">Aucun résultat dans tes données Search Console</p>
              <p class="text-xs text-roast mt-1 leading-relaxed">
                Deskover n'a aucune impression Google sur "<span class="font-semibold">{{ keywordSearch.trim() }}</span>". Le site n'apparaît pas dans les SERPs pour cette requête, ou trop bas pour être trackable. Pour savoir si ça vaut la peine d'écrire un article, interroge Google Ads.
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button
                  class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                  @click="selectAndLookup(keywordSearch.trim())"
                >
                  <SearchIcon :size="12" />
                  Interroger Google Ads
                </button>
                <a :href="`https://trends.google.com/trends/explore?geo=FR&q=${encodeURIComponent(keywordSearch.trim())}`" target="_blank" rel="noopener" class="text-xs text-primary hover:underline">Google Trends ↗</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Résultats du mot-clé sélectionné -->
        <div v-if="selectedKeyword && !loadingHistory" class="mt-6 space-y-4">
          <div v-if="!keywordHistory.length" class="rounded-lg border border-edison/30 bg-edison/5 p-4">
            <p class="text-sm font-semibold text-espresso">Pas encore positionnée sur "{{ selectedKeyword }}"</p>
            <p class="text-xs text-roast mt-1.5 leading-relaxed">
              Deskover n'a aucune impression Google sur ce mot-clé. Le site n'apparaît pas dans les SERPs pour cette requête, ou trop bas pour être trackable par Search Console.
            </p>

            <!-- Bouton + résultat Keyword Planner -->
            <div v-if="!plannerMetrics && !plannerLoading" class="mt-3 flex flex-wrap items-center gap-2">
              <button
                class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                @click="lookupKeywordPlanner(selectedKeyword!)"
              >
                <SearchIcon :size="12" />
                Volume Google Ads
              </button>
              <a :href="`https://trends.google.com/trends/explore?geo=FR&q=${encodeURIComponent(selectedKeyword)}`" target="_blank" rel="noopener" class="text-xs text-primary hover:underline">Google Trends ↗</a>
            </div>
            <div v-if="plannerLoading" class="mt-3 text-xs text-roast flex items-center gap-2">
              <Loader2 :size="12" class="animate-spin" /> Interrogation Google Ads…
            </div>
            <div v-if="plannerError" class="mt-3 text-xs text-red-600">
              {{ plannerError }}
            </div>
            <div v-if="plannerMetrics" class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="bg-white rounded-md border border-steam/15 p-2.5">
                <p class="text-[10px] uppercase text-steam">Volume mensuel</p>
                <p class="text-lg font-bold text-espresso mt-0.5">{{ formatVolume(plannerMetrics.avgMonthlySearches) }}</p>
              </div>
              <div class="bg-white rounded-md border border-steam/15 p-2.5">
                <p class="text-[10px] uppercase text-steam">Concurrence</p>
                <span class="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset" :class="competitionColor(plannerMetrics.competition)">
                  {{ competitionLabel(plannerMetrics.competition) }}
                </span>
              </div>
              <div class="bg-white rounded-md border border-steam/15 p-2.5">
                <p class="text-[10px] uppercase text-steam">Indice (0-100)</p>
                <p class="text-lg font-bold text-espresso mt-0.5">{{ plannerMetrics.competitionIndex ?? '—' }}</p>
              </div>
              <div class="bg-white rounded-md border border-steam/15 p-2.5">
                <p class="text-[10px] uppercase text-steam">CPC haut de page</p>
                <p class="text-sm font-semibold text-espresso mt-0.5">
                  {{ plannerMetrics.highTopOfPageBidMicros != null ? `${(plannerMetrics.highTopOfPageBidMicros / 1_000_000).toFixed(2)} €` : '—' }}
                </p>
              </div>
            </div>
            <div v-if="plannerMetrics && plannerCached" class="mt-2 text-[10px] text-steam">
              Données en cache (récupéré le {{ plannerFetchedAt ? new Date(plannerFetchedAt).toLocaleDateString('fr-FR') : '' }}).
              <button class="text-primary hover:underline ml-1" @click="lookupKeywordPlanner(selectedKeyword!, true)">Rafraîchir</button>
            </div>
            <div v-if="plannerRelated.length" class="mt-4">
              <p class="text-xs font-semibold text-espresso mb-2">Idées de mots-clés associés (top 10)</p>
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-steam/10 text-[10px] uppercase text-roast">
                    <th class="text-left py-1.5 pr-2">Mot-clé</th>
                    <th class="text-right px-2">Volume/mois</th>
                    <th class="text-right pl-2">Concurrence</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in plannerRelated.slice(0, 10)" :key="r.keyword" class="border-b border-steam/5 even:bg-cream/30">
                    <td class="py-1.5 pr-2 text-espresso">
                      <button class="hover:underline" @click="selectKeyword(r.keyword)">{{ r.keyword }}</button>
                    </td>
                    <td class="text-right px-2 font-semibold text-roast">{{ formatVolume(r.avg_monthly_searches) }}</td>
                    <td class="text-right pl-2">
                      <span class="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset" :class="competitionColor(r.competition)">
                        {{ competitionLabel(r.competition) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <template v-else>
            <!-- Volume Google Ads (au-dessus des KPIs GSC) -->
            <div class="rounded-lg border border-edison/30 bg-edison/5 p-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-xs font-semibold uppercase text-roast">Volume Google</span>
                <template v-if="plannerMetrics">
                  <span class="text-base font-bold text-espresso">{{ formatVolume(plannerMetrics.avgMonthlySearches) }}/mois</span>
                  <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset" :class="competitionColor(plannerMetrics.competition)">
                    {{ competitionLabel(plannerMetrics.competition) }}
                  </span>
                  <span v-if="plannerCached" class="text-[10px] text-steam">cache</span>
                </template>
                <span v-else-if="plannerLoading" class="text-xs text-roast flex items-center gap-1.5">
                  <Loader2 :size="12" class="animate-spin" /> Chargement…
                </span>
                <span v-else-if="plannerError" class="text-xs text-red-600">{{ plannerError }}</span>
                <span v-else class="text-xs text-steam">Pas encore interrogé</span>
              </div>
              <button
                v-if="!plannerMetrics && !plannerLoading"
                class="text-xs font-semibold text-primary hover:underline shrink-0"
                @click="lookupKeywordPlanner(selectedKeyword!)"
              >
                Interroger Google Ads
              </button>
              <button
                v-else-if="plannerMetrics"
                class="text-xs text-primary hover:underline shrink-0"
                @click="lookupKeywordPlanner(selectedKeyword!, true)"
              >
                Rafraîchir
              </button>
            </div>

            <!-- Récap KPIs -->
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div class="bg-cream/40 rounded-lg p-3">
                <p class="text-xs text-roast">Mot-clé</p>
                <p class="text-sm font-bold text-espresso mt-1 truncate" :title="selectedKeyword">{{ selectedKeyword }}</p>
              </div>
              <div class="bg-cream/40 rounded-lg p-3">
                <p class="text-xs text-roast">Clics totaux</p>
                <p class="text-lg font-bold text-espresso mt-1">{{ keywordSummary?.totalClicks }}</p>
              </div>
              <div class="bg-cream/40 rounded-lg p-3">
                <p class="text-xs text-roast">Impressions</p>
                <p class="text-lg font-bold text-espresso mt-1">{{ formatNumber(keywordSummary?.totalImpr || 0) }}</p>
              </div>
              <div class="bg-cream/40 rounded-lg p-3">
                <p class="text-xs text-roast">Position moy.</p>
                <p class="text-lg font-bold text-espresso mt-1">{{ keywordSummary?.avgPos.toFixed(1) }}</p>
              </div>
              <div class="bg-cream/40 rounded-lg p-3">
                <p class="text-xs text-roast">Tendance 7j vs 7j</p>
                <p class="text-lg font-bold mt-1" :class="keywordSummary?.trend != null && keywordSummary.trend > 0 ? 'text-monstera' : keywordSummary?.trend != null && keywordSummary.trend < 0 ? 'text-red-500' : 'text-espresso'">
                  {{ keywordSummary?.trend != null ? (keywordSummary.trend > 0 ? '+' : '') + keywordSummary.trend.toFixed(1) + '%' : '-' }}
                </p>
              </div>
            </div>

            <!-- Courbe -->
            <div class="bg-white rounded-xl border border-steam/15 p-4">
              <p class="text-xs font-semibold text-roast mb-3">
                <template v-if="keywordHistory.length === 1">
                  Données du {{ new Date(keywordHistory[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }}
                  <span class="text-steam font-normal">(1 seul jour avec données)</span>
                </template>
                <template v-else>
                  Progression du {{ new Date(keywordHistory[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }}
                  au {{ new Date(keywordHistory[keywordHistory.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }}
                  <span class="text-steam font-normal">({{ keywordHistory.length }} jours avec données)</span>
                </template>
              </p>
              <SparkLineChart :series="keywordChartSeries" />
            </div>
          </template>
        </div>
        <div v-else-if="loadingHistory" class="mt-6 text-sm text-steam flex items-center gap-2">
          <Loader2 :size="14" class="animate-spin" /> Chargement de l'historique...
        </div>
      </BaseCard>
      </div>

      <!-- Top opportunités SEO -->
      <BaseCard v-if="keywordsToPush.length">
        <template #title>
          <div class="flex items-center gap-2">
            <Sparkles :size="16" class="text-edison" />
            <span>Top opportunités SEO</span>
            <BaseBadge variant="warning">{{ keywordsToPush.length }}</BaseBadge>
          </div>
        </template>
        <p class="text-sm text-roast mb-3">
          Mots-clés où Deskover a un score d'opportunité élevé : <strong>impressions × proximité du top 10</strong>. Plus tu es proche de la première page avec du volume, plus le travail SEO sera vite rentabilisé.
        </p>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-steam/10 text-xs font-semibold text-roast uppercase">
              <th class="text-left py-2 pr-3">Requête</th>
              <th class="text-right px-2">Score</th>
              <th class="text-right px-2">Position</th>
              <th class="text-right px-2">Impr.</th>
              <th class="text-right px-2">Clics</th>
              <th class="text-right px-2">Vol. Google</th>
              <th class="text-right px-2">Gain estimé</th>
              <th class="text-right pl-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(q, i) in keywordsToPush" :key="i" class="border-b border-steam/5 even:bg-cream/30">
              <td class="py-2.5 pr-3 font-medium text-espresso text-xs">
                <span v-if="i < 3" class="inline-block w-5 text-edison font-bold">{{ ['🥇','🥈','🥉'][i] }}</span>
                <span v-else class="inline-block w-5 text-steam text-[10px]">{{ i + 1 }}.</span>
                {{ q.query }}
              </td>
              <td class="text-right px-2 font-bold text-edison">{{ q.score }}</td>
              <td class="text-right px-2"><BaseBadge :variant="q.position <= 10 ? 'success' : q.position <= 20 ? 'warning' : 'neutral'">{{ formatPosition(q.position) }}</BaseBadge></td>
              <td class="text-right px-2 text-roast">{{ formatNumber(q.impressions) }}</td>
              <td class="text-right px-2 text-roast">{{ q.clicks }}</td>
              <td class="text-right px-2">
                <template v-if="cachedMetricsByKeyword.get(q.query.toLowerCase())">
                  <span class="text-xs font-semibold text-roast">{{ formatVolume(cachedMetricsByKeyword.get(q.query.toLowerCase())!.avgMonthlySearches) }}</span>
                  <span class="ml-1 inline-flex px-1 py-0.5 rounded text-[9px] font-bold ring-1 ring-inset" :class="competitionColor(cachedMetricsByKeyword.get(q.query.toLowerCase())!.competition)">
                    {{ competitionLabel(cachedMetricsByKeyword.get(q.query.toLowerCase())!.competition).slice(0,1) }}
                  </span>
                </template>
                <span v-else class="text-[10px] text-steam">—</span>
              </td>
              <td class="text-right px-2 font-semibold text-monstera">+{{ q.potentialClicks }}/mois</td>
              <td class="text-right pl-2">
                <button class="text-xs text-primary hover:underline" @click="selectKeyword(q.query)">Courbe</button>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <!-- Top mots-clés par clics -->
      <BaseCard>
        <template #title>
          <span>Top mots-clés (par clics)</span>
        </template>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-steam/10 text-xs font-semibold text-roast uppercase">
              <th class="text-left py-2 pr-2">Requête</th>
              <th class="text-right px-2">Clics</th>
              <th class="text-right px-2">Impr.</th>
              <th class="text-right px-2">CTR</th>
              <th class="text-right px-2">Pos.</th>
              <th class="text-right pl-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(q, i) in topKeywords" :key="i" class="border-b border-steam/5 even:bg-cream/30">
              <td class="py-2 pr-2 text-espresso text-xs">{{ q.query }}</td>
              <td class="text-right px-2 font-semibold text-espresso">{{ q.clicks }}</td>
              <td class="text-right px-2 text-roast">{{ formatNumber(q.impressions) }}</td>
              <td class="text-right px-2 text-roast">{{ formatPercent(q.ctr) }}</td>
              <td class="text-right px-2 text-roast">{{ formatPosition(q.position) }}</td>
              <td class="text-right pl-2">
                <button class="text-xs text-primary hover:underline" @click="selectKeyword(q.query)">Courbe</button>
              </td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
    </template>

    <!-- ======== ONGLET : PAGES ======== -->
    <template v-if="snapshot && activeTab === 'pages'">
      <BaseCard>
        <template #title>
          <span>Top pages SEO (par clics depuis Google)</span>
        </template>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-steam/10 text-xs font-semibold text-roast uppercase">
              <th class="text-left py-2 pr-2">Page</th>
              <th class="text-right px-2">Clics</th>
              <th class="text-right px-2">Impr.</th>
              <th class="text-right px-2">CTR</th>
              <th class="text-right pl-2">Pos.</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in topPagesByClicks" :key="i" class="border-b border-steam/5 even:bg-cream/30">
              <td class="py-2 pr-2">
                <a :href="fullPageUrl(p.page)" target="_blank" rel="noopener" class="text-espresso hover:text-primary text-xs inline-flex items-center gap-1">
                  {{ shortPage(p.page) || '/' }}<ExternalLink :size="10" class="opacity-50" />
                </a>
              </td>
              <td class="text-right px-2 font-semibold text-espresso">{{ p.clicks }}</td>
              <td class="text-right px-2 text-roast">{{ formatNumber(p.impressions) }}</td>
              <td class="text-right px-2 text-roast">{{ formatPercent(p.ctr) }}</td>
              <td class="text-right pl-2 text-roast">{{ formatPosition(p.position) }}</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>

      <BaseCard v-if="topPagesByEngagement.length">
        <template #title>
          <div class="flex items-center gap-2">
            <Sparkles :size="16" class="text-monstera" />
            <span>Pages les plus engageantes (GA4)</span>
          </div>
        </template>
        <p class="text-xs text-steam mb-3">Tri par engagement × users : ces pages retiennent vraiment l'attention après le clic.</p>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-steam/10 text-xs font-semibold text-roast uppercase">
              <th class="text-left py-2 pr-2">Page</th>
              <th class="text-right px-2">Vues</th>
              <th class="text-right px-2">Users</th>
              <th class="text-right px-2">Engagement</th>
              <th class="text-right pl-2">Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in topPagesByEngagement" :key="i" class="border-b border-steam/5 even:bg-cream/30">
              <td class="py-2 pr-2">
                <a :href="fullPageUrl(p.page)" target="_blank" rel="noopener" class="text-espresso hover:text-primary text-xs inline-flex items-center gap-1">
                  {{ shortPage(p.page) || '/' }}<ExternalLink :size="10" class="opacity-50" />
                </a>
              </td>
              <td class="text-right px-2 text-roast">{{ formatNumber(p.views) }}</td>
              <td class="text-right px-2 font-semibold text-espresso">{{ p.users }}</td>
              <td class="text-right px-2 text-roast">{{ formatPercent(p.engagementRate, 1) }}</td>
              <td class="text-right pl-2 text-roast">{{ formatDuration(p.avgEngagementTime) }}</td>
            </tr>
          </tbody>
        </table>
      </BaseCard>
    </template>

    <!-- ======== ONGLET : ACTIONS ======== -->
    <template v-if="snapshot && activeTab === 'actions'">
      <BaseCard>
        <div class="flex flex-wrap gap-1 mb-4 border-b border-steam/10">
          <button
            v-for="tab in [
              { key: 'all', label: 'Toutes', icon: null as any, count: insightCounts.total },
              { key: 'wins', label: 'Quick wins', icon: Sparkles, count: insightCounts.quickWins },
              { key: 'tech', label: 'Techniques', icon: Wrench, count: insightCounts.technicalIssues },
              { key: 'content', label: 'Contenu', icon: FileText, count: insightCounts.contentSuggestions },
              { key: 'places', label: 'Fiches lieu', icon: Building2, count: insightCounts.placeImprovements },
            ] as const"
            :key="tab.key"
            :class="['px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              insightTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-roast hover:text-espresso']"
            @click="insightTab = tab.key"
          >
            <component v-if="tab.icon" :is="tab.icon" :size="14" />
            {{ tab.label }}
            <span v-if="tab.count" class="text-xs text-steam">({{ tab.count }})</span>
          </button>
        </div>

        <div v-if="visibleInsights.length === 0" class="text-sm text-steam py-6 text-center">
          Aucune action dans cette catégorie.
        </div>

        <div v-else class="space-y-3">
          <div v-for="(insight, i) in visibleInsights" :key="i" class="rounded-lg border border-steam/15 p-4 hover:border-primary/30 transition-colors">
            <div class="flex items-start gap-3">
              <BaseBadge :variant="priorityVariant(insight.priority)" class="shrink-0 mt-0.5">{{ priorityLabel(insight.priority) }}</BaseBadge>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-espresso">{{ insight.title }}</p>
                <p class="text-sm text-roast mt-1">{{ insight.description }}</p>
                <p class="text-sm text-espresso mt-2"><span class="font-semibold">Action : </span>{{ insight.action }}</p>
                <a v-if="insight.page" :href="fullPageUrl(insight.page)" target="_blank" rel="noopener"
                   class="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2">
                  {{ shortPage(insight.page) }} <ExternalLink :size="11" />
                </a>
                <button v-if="insight.query" class="ml-2 text-xs text-primary hover:underline" @click="activeTab = 'keywords'; selectKeyword(insight.query!)">
                  Voir la courbe →
                </button>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard v-if="allInsights.strategy?.length && (insightTab === 'all' || insightTab === 'content')">
        <template #title>
          <div class="flex items-center gap-2">
            <TrendingUp :size="16" class="text-monstera" />
            <span>Niches détectées (cluster strategy)</span>
          </div>
        </template>
        <div class="space-y-3">
          <div v-for="(s, i) in allInsights.strategy" :key="i" class="rounded-lg border border-steam/15 p-4">
            <p class="text-sm font-semibold text-espresso">{{ s.niche }}</p>
            <p class="text-xs text-steam mt-1">{{ formatNumber(s.impressions) }} impressions · {{ s.clicks }} clics</p>
            <p class="text-xs text-roast mt-2"><span class="font-semibold">Top requêtes :</span> {{ s.queries.join(', ') }}</p>
            <p class="text-xs text-espresso mt-2">{{ s.action }}</p>
          </div>
        </div>
      </BaseCard>
    </template>

    <!-- ======== ONGLET : TRAFIC (GA4) ======== -->
    <template v-if="ga4Snapshot && activeTab === 'traffic'">
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BaseCard>
          <template #title>
            <div class="flex items-center gap-2"><Globe :size="16" /><span>Sources de trafic</span></div>
          </template>
          <p class="text-xs text-steam mb-3">D'où viennent vraiment tes visiteurs.</p>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-steam/10 text-xs font-semibold text-roast uppercase">
                <th class="text-left py-2 pr-2">Source</th>
                <th class="text-right px-2">Sessions</th>
                <th class="text-right pl-2">Users</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(src, i) in ga4Snapshot.sources" :key="i" class="border-b border-steam/5 even:bg-cream/30">
                <td class="py-2 pr-2 text-espresso text-xs">{{ sourceLabel(src.source, src.medium) }}</td>
                <td class="text-right px-2 font-semibold text-espresso">{{ formatNumber(src.sessions) }}</td>
                <td class="text-right pl-2 text-roast">{{ formatNumber(src.users) }}</td>
              </tr>
            </tbody>
          </table>
        </BaseCard>

        <BaseCard>
          <template #title>
            <div class="flex items-center gap-2"><Activity :size="16" /><span>Top events</span></div>
          </template>
          <p class="text-xs text-steam mb-3">Pour des events custom (clic "J'y vais", save lieu...), il faut instrumenter le frontend.</p>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-steam/10 text-xs font-semibold text-roast uppercase">
                <th class="text-left py-2 pr-2">Événement</th>
                <th class="text-right px-2">Total</th>
                <th class="text-right pl-2">Users</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ev, i) in ga4Snapshot.events" :key="i" class="border-b border-steam/5 even:bg-cream/30">
                <td class="py-2 pr-2 text-espresso text-xs font-mono">{{ ev.name }}</td>
                <td class="text-right px-2 font-semibold text-espresso">{{ formatNumber(ev.count) }}</td>
                <td class="text-right pl-2 text-roast">{{ formatNumber(ev.users) }}</td>
              </tr>
            </tbody>
          </table>
        </BaseCard>

        <BaseCard>
          <template #title><span>Pays</span></template>
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="(c, i) in ga4Snapshot.countries.slice(0, 10)" :key="i" class="border-b border-steam/5 even:bg-cream/30">
                <td class="py-2 pr-2 text-espresso text-xs">{{ c.country }}</td>
                <td class="text-right px-2 font-semibold text-espresso">{{ c.users }} users</td>
                <td class="text-right pl-2 text-roast">{{ c.sessions }} sessions</td>
              </tr>
            </tbody>
          </table>
        </BaseCard>

        <BaseCard>
          <template #title><span>Devices</span></template>
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="(d, i) in ga4Snapshot.devices" :key="i" class="border-b border-steam/5 even:bg-cream/30">
                <td class="py-2 pr-2 text-espresso text-xs capitalize">{{ d.category }}</td>
                <td class="text-right px-2 font-semibold text-espresso">{{ d.users }} users</td>
                <td class="text-right pl-2 text-roast">{{ d.sessions }} sessions</td>
              </tr>
            </tbody>
          </table>
        </BaseCard>
      </div>
    </template>

    <!-- Commandes utiles (uniquement sur la vue d'ensemble) -->
    <BaseCard v-if="snapshot && activeTab === 'overview'">
      <template #title><span>Commandes</span></template>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div class="rounded-lg border border-steam/15 p-3">
          <p class="text-sm font-semibold text-espresso">Sync GSC</p>
          <div class="flex items-center gap-2 mt-1.5">
            <code class="flex-1 text-xs bg-cream/60 text-roast px-2 py-1.5 rounded font-mono break-all">node --env-file=.env scripts/seo/gsc-sync.js --all</code>
            <button class="p-1.5 text-roast hover:text-primary" @click="copyText('cmd-gsc', 'node --env-file=.env scripts/seo/gsc-sync.js --all')"><Copy :size="14" /></button>
          </div>
        </div>
        <div class="rounded-lg border border-steam/15 p-3">
          <p class="text-sm font-semibold text-espresso">Sync GA4</p>
          <div class="flex items-center gap-2 mt-1.5">
            <code class="flex-1 text-xs bg-cream/60 text-roast px-2 py-1.5 rounded font-mono break-all">node --env-file=.env scripts/seo/ga4-sync.js --all</code>
            <button class="p-1.5 text-roast hover:text-primary" @click="copyText('cmd-ga4', 'node --env-file=.env scripts/seo/ga4-sync.js --all')"><Copy :size="14" /></button>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
