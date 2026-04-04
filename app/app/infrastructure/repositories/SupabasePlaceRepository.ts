import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaceRepository } from '~/domain/interfaces/PlaceRepository'
import type { Place, PlaceFilters, PlaceSortBy, Vital, VitalStatus, BlogMention } from '~/domain/models/Place'

const SUPABASE_STORAGE_URL = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos'

function signalToVitals(signals: string[]): Vital[] {
  const has = (s: string) => signals.includes(s)

  const wifiStatus: VitalStatus = has('wifi') ? 'good' : 'none'
  const wifiValue = has('wifi') ? 'Rapide' : 'Inconnu'

  const prisesStatus: VitalStatus = has('prises') ? 'good' : has('grandes_tables') ? 'medium' : 'none'
  const prisesValue = has('prises') ? 'Dispo' : has('grandes_tables') ? 'Rares' : 'Inconnu'

  const foodStatus: VitalStatus = has('food') ? 'good' : 'none'
  const foodValue = has('food') ? 'Complet' : '—'

  const styleStatus: VitalStatus = has('ambiance') ? 'good' : has('calme') ? 'good' : 'medium'
  const styleValue = has('ambiance') ? 'Canon' : has('calme') ? 'Superbe' : 'Sympa'

  return [
    { icon: 'lucide:wifi', label: 'WiFi', value: wifiValue, status: wifiStatus },
    { icon: 'lucide:zap', label: 'Prises', value: prisesValue, status: prisesStatus },
    { icon: 'lucide:utensils', label: 'Food', value: foodValue, status: foodStatus },
    { icon: 'lucide:sparkles', label: 'Style', value: styleValue, status: styleStatus }
  ]
}

function getPhotoUrl(row: any): string | undefined {
  if (row.photo_storage_path) {
    return `${SUPABASE_STORAGE_URL}/${row.photo_storage_path}`
  }
  return row.photo_url || undefined
}

const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function parseTimeStr(t: string): number {
  const clean = t.replace(/\s/g, '')
  const [h, m] = clean.split(':').map(Number)
  return h * 60 + (m || 0)
}

function parseDayEntry(entry: string): { day: string; openMin: number; closeMin: number } | null {
  // "lundi: 12:00 – 21:00" or "lundi: Fermé"
  const colonIdx = entry.indexOf(':')
  if (colonIdx === -1) return null
  const day = entry.substring(0, colonIdx).trim().toLowerCase()
  const rest = entry.substring(colonIdx + 1).trim()
  if (rest.toLowerCase().includes('ferm')) return null
  // Split on – or - (em-dash or regular dash)
  const parts = rest.split(/[–\-]/).map(s => s.trim())
  if (parts.length < 2) return null
  return { day, openMin: parseTimeStr(parts[0]), closeMin: parseTimeStr(parts[1]) }
}

function computeOpenStatus(openingHours?: any): { isOpen: boolean; nextOpen?: string } {
  if (!openingHours || !Array.isArray(openingHours) || openingHours.length === 0) return { isOpen: true }

  const parsed = openingHours.map(parseDayEntry)
  const now = new Date()
  const todayName = DAYS_FR[now.getDay()]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // Check if open right now
  const todayEntry = parsed.find(e => e && e.day === todayName)
  if (todayEntry) {
    const closeMin = todayEntry.closeMin <= todayEntry.openMin ? todayEntry.closeMin + 24 * 60 : todayEntry.closeMin
    if (currentMinutes >= todayEntry.openMin && currentMinutes < closeMin) {
      return { isOpen: true }
    }
  }

  // Find next opening
  for (let offset = 0; offset < 7; offset++) {
    const dayIdx = (now.getDay() + offset) % 7
    const dayName = DAYS_FR[dayIdx]
    const entry = parsed.find(e => e && e.day === dayName)
    if (!entry) continue
    if (offset === 0 && entry.openMin <= currentMinutes) continue

    const h = Math.floor(entry.openMin / 60)
    const m = entry.openMin % 60
    const timeStr = `${h}h${m ? String(m).padStart(2, '0') : ''}`
    if (offset === 0) return { isOpen: false, nextOpen: `Ouvre à ${timeStr}` }
    if (offset === 1) return { isOpen: false, nextOpen: `Ouvre demain à ${timeStr}` }
    return { isOpen: false, nextOpen: `Ouvre ${dayName} à ${timeStr}` }
  }

  return { isOpen: false }
}

function rowToPlace(row: any, index: number, mentions?: any[]): Place {
  const signals = row.signals || []

  let tag: string | undefined
  if (index === 0) tag = 'Number one'
  else if (index === 1) tag = 'Coup de coeur'

  const seenBaseUrls = new Set<string>()
  const blogMentions: BlogMention[] = (mentions || []).filter((m: any) => {
    // Strip query params for deduplication (tracking params like srsltid cause duplicates)
    const baseUrl = m.url?.split('?')[0] || ''
    if (!baseUrl || seenBaseUrls.has(baseUrl)) return false
    seenBaseUrls.add(baseUrl)
    return true
  }).map((m: any) => ({
    url: m.url?.split('?')[0] || m.url,
    title: m.title || '',
    source: m.source || ''
  }))

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.place_type,
    address: row.address || '',
    city: row.city,
    citySlug: row.city_key,
    arrondissement: row.arrondissement,
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    description: row.description,
    vitals: signalToVitals(signals),
    signals,
    googleRating: row.google_rating,
    googleReviewsCount: row.google_reviews_count,
    googleMapsUrl: row.google_maps_url,
    photoUrl: getPhotoUrl(row),
    website: row.website,
    phone: row.phone,
    openingHours: row.opening_hours,
    businessStatus: row.business_status,
    isOpen: computeOpenStatus(row.opening_hours).isOpen,
    nextOpen: computeOpenStatus(row.opening_hours).nextOpen,
    blogMentions,
    instagram: row.instagram_handle || undefined,
    tag
  }
}

export class SupabasePlaceRepository implements PlaceRepository {
  constructor(private client: SupabaseClient) {}

  async getAll(filters?: PlaceFilters, sortBy?: PlaceSortBy): Promise<Place[]> {
    let query = this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('status', 'approved')

    query = this.applyFilters(query, filters)
    query = this.applySort(query, sortBy)
    query = query.limit(100)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
  }

  async getAllForMap(): Promise<Place[]> {
    const { data, error } = await this.client
      .from('places')
      .select('id,name,slug,place_type,city,city_key,arrondissement,latitude,longitude,signals,photo_url,photo_storage_path,business_status')
      .eq('status', 'approved')

    if (error) throw error

    return (data || []).map((row: any, i: number) =>
      rowToPlace(row, i)
    )
  }

  async getById(id: string): Promise<Place | null> {
    const { data, error } = await this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('id', id)
      .single()

    if (error || !data) return null

    return rowToPlace(data, 0, data.blog_mentions)
  }

  async getByCity(citySlug: string, filters?: PlaceFilters): Promise<Place[]> {
    let query = this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('status', 'approved')
      .eq('city_key', citySlug)

    query = this.applyFilters(query, filters)
    query = this.applySort(query)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
  }

  async search(query: string): Promise<Place[]> {
    const q = query.toLowerCase().trim()
    const qNorm = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Search with both original and accent-stripped versions
    const filters = [
      `name.ilike.%${q}%`, `city.ilike.%${q}%`, `address.ilike.%${q}%`,
    ]
    if (qNorm !== q) {
      filters.push(`name.ilike.%${qNorm}%`, `city.ilike.%${qNorm}%`, `address.ilike.%${qNorm}%`)
    }

    const { data, error } = await this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('status', 'approved')
      .or(filters.join(','))
      .limit(30)

    if (error) throw error

    // Post-filter client-side for accent-insensitive matching
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const results = (data || []).filter((row: any) =>
      normalize(row.name || '').includes(qNorm) ||
      normalize(row.city || '').includes(qNorm) ||
      normalize(row.address || '').includes(qNorm)
    )

    return results.map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
  }

  async getCities(): Promise<{ name: string; slug: string; count: number }[]> {
    const { data, error } = await this.client
      .from('cities')
      .select('name, slug, city_key, place_count')
      .order('place_count', { ascending: false })

    if (error) throw error

    return (data || []).map((row: any) => ({
      name: row.name,
      slug: row.city_key,
      count: row.place_count || 0
    }))
  }

  private applyFilters(query: any, filters?: PlaceFilters) {
    if (!filters) return query

    if (filters.city) query = query.eq('city_key', filters.city)
    if (filters.category) query = query.eq('place_type', filters.category)
    if (filters.wifi) query = query.contains('signals', ['wifi'])
    if (filters.prises) query = query.contains('signals', ['prises'])
    if (filters.food) query = query.contains('signals', ['food'])
    if (filters.calme) query = query.contains('signals', ['calme'])
    if (filters.query) {
      const q = filters.query.toLowerCase()
      const qNorm = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const parts = [`name.ilike.%${q}%`, `city.ilike.%${q}%`]
      if (qNorm !== q) {
        parts.push(`name.ilike.%${qNorm}%`, `city.ilike.%${qNorm}%`)
      }
      query = query.or(parts.join(','))
    }

    return query
  }

  private applySort(query: any, sortBy?: PlaceSortBy) {
    switch (sortBy) {
      case 'rating':
        return query.order('google_rating', { ascending: false, nullsFirst: false })
      default:
        return query
          .order('curation_score', { ascending: false, nullsFirst: false })
          .order('google_rating', { ascending: false, nullsFirst: false })
    }
  }
}
