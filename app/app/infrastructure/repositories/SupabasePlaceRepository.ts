import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaceRepository } from '~/domain/interfaces/PlaceRepository'
import type { Place, PlaceFilters, PlaceSortBy, Vital, VitalStatus, BlogMention } from '~/domain/models/Place'

const SUPABASE_STORAGE_URL = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos'

function signalToVitals(signals: string[]): Vital[] {
  const has = (s: string) => signals.includes(s)

  // WiFi : "Dispo" par défaut, affiné par attachLatestSpeedTest sur la fiche lieu
  const wifiStatus: VitalStatus = has('wifi') ? 'good' : 'none'
  const wifiValue = has('wifi') ? 'Dispo' : 'Inconnu'

  const prisesStatus: VitalStatus = has('prises') ? 'good' : has('grandes_tables') ? 'medium' : 'none'
  const prisesValue = has('prises') ? 'Dispo' : has('grandes_tables') ? 'Rares' : 'Inconnu'

  const foodStatus: VitalStatus = has('food') ? 'good' : 'none'
  const foodValue = has('food') ? 'Complet' : '—'

  const styleStatus: VitalStatus = has('ambiance') ? 'good' : has('calme') ? 'good' : 'medium'
  const styleValue = has('ambiance') ? 'Canon' : has('calme') ? 'Superbe' : 'Sympa'

  const isPaid = has('payant') || has('reservation')
  const accesStatus: VitalStatus = isPaid ? 'medium' : 'good'
  const accesValue = isPaid ? 'Payant' : 'Gratuit'

  return [
    { icon: 'lucide:wifi', label: 'WiFi', value: wifiValue, status: wifiStatus },
    { icon: 'lucide:zap', label: 'Prises', value: prisesValue, status: prisesStatus },
    { icon: 'lucide:ticket', label: 'Accès', value: accesValue, status: accesStatus },
    { icon: 'lucide:sparkles', label: 'Style', value: styleValue, status: styleStatus }
  ]
}

function getPhotoUrl(row: any): string | undefined {
  if (row.photo_storage_path) {
    return `${SUPABASE_STORAGE_URL}/${row.photo_storage_path}`
  }
  return row.photo_url || undefined
}

function getCardUrl(row: any): string | undefined {
  if (row.photo_storage_path) {
    return `${SUPABASE_STORAGE_URL.replace('/object/public/', '/render/image/public/')}/${row.photo_storage_path}?width=400&height=300&resize=cover&quality=75`
  }
  return row.photo_url || undefined
}

function getThumbUrl(row: any): string | undefined {
  if (row.photo_storage_path) {
    return `${SUPABASE_STORAGE_URL.replace('/object/public/', '/render/image/public/')}/${row.photo_storage_path}?width=100&height=100&resize=cover`
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
  // "Ouvert 24h/24" means open all day
  if (rest.toLowerCase().includes('24h') || rest.toLowerCase().includes('24 h')) {
    return { day, openMin: 0, closeMin: 24 * 60 }
  }
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
    const timeStr = `${h}H${m ? String(m).padStart(2, '0') : ''}`
    if (offset === 0) return { isOpen: false, nextOpen: `OUVRE À ${timeStr}` }
    if (offset === 1) return { isOpen: false, nextOpen: `OUVRE DEMAIN À ${timeStr}` }
    return { isOpen: false, nextOpen: `OUVRE ${dayName.toUpperCase()} À ${timeStr}` }
  }

  return { isOpen: false }
}

function timeAgoFr(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days}j`
  return `il y a ${Math.floor(days / 30)}mois`
}

function buildSpeedTest(row: { download: number; upload: number; ping: number; created_at: string }) {
  const download = Number(row.download)
  let label: string, description: string, quality: number
  if (download >= 25) {
    label = 'Rapide'
    description = 'WiFi rapide, nickel pour la visio et les gros fichiers.'
    quality = 90
  } else if (download >= 10) {
    label = 'Bon'
    description = 'WiFi correct pour bosser, OK en visio.'
    quality = 60
  } else {
    label = 'Faible'
    description = 'WiFi limite, à éviter pour la visio.'
    quality = 30
  }
  return {
    download,
    upload: Number(row.upload),
    ping: Number(row.ping),
    label,
    description,
    quality,
    ago: timeAgoFr(row.created_at)
  }
}

function rowToPlace(row: any, index: number, mentions?: any[]): Place {
  const signals = row.signals || []

  let tag: string | undefined
  if (index === 0) tag = 'Deskovered #1'
  else if (index === 1) tag = 'Deskovered #2'
  else if (index === 2) tag = 'Deskovered #3'

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
    cardUrl: getCardUrl(row),
    thumbUrl: getThumbUrl(row),
    photos: (row.photos || []).map((p: string) => `${SUPABASE_STORAGE_URL}/${p}`),
    website: row.website,
    phone: row.phone,
    openingHours: row.opening_hours,
    businessStatus: row.business_status,
    isOpen: computeOpenStatus(row.opening_hours).isOpen,
    nextOpen: computeOpenStatus(row.opening_hours).nextOpen,
    blogMentions,
    instagram: row.instagram_handle || undefined,
    conditions: row.conditions || undefined,
    foodType: row.food_type || undefined,
    foodDescription: row.food_description || undefined,
    menuUrl: row.menu_url || undefined,
    deskoverTestedAt: row.deskover_tested_at || undefined,
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
      .neq('business_status', 'CLOSED_PERMANENTLY')

    query = this.applyFilters(query, filters)
    query = this.applySort(query, sortBy)
    query = query.limit(100)

    const { data, error } = await query
    if (error) throw error

    const places = (data || []).map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
    await this.attachWifiLabels(places)
    if (sortBy === 'wifi') {
      places.sort((a, b) => ((b as any)._wifiDownload || 0) - ((a as any)._wifiDownload || 0))
    }
    return places
  }

  async getAllForMap(): Promise<Place[]> {
    const { data, error } = await this.client
      .from('places')
      .select('id,name,slug,place_type,city,city_key,arrondissement,latitude,longitude,signals,photo_url,photo_storage_path,photos,opening_hours,business_status')
      .eq('status', 'approved')
      .neq('business_status', 'CLOSED_PERMANENTLY')

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

    const place = rowToPlace(data, 0, data.blog_mentions)
    await this.attachLatestSpeedTest(place)
    return place
  }

  private async attachLatestSpeedTest(place: Place): Promise<void> {
    const [{ data: speedRow }, { count }] = await Promise.all([
      this.client
        .from('speed_tests')
        .select('download, upload, ping, created_at')
        .eq('place_id', place.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      this.client
        .from('speed_tests')
        .select('*', { count: 'exact', head: true })
        .eq('place_id', place.id)
    ])

    place.speedTestCount = count || 0

    const wifiVital = place.vitals.find(v => v.label === 'WiFi')
    if (speedRow) {
      place.speedTest = buildSpeedTest(speedRow as any)

      // Update WiFi vital with actual measured speed
      if (wifiVital) {
        const dl = place.speedTest.download
        if (dl >= 10) {
          wifiVital.value = dl >= 25 ? 'Rapide' : 'Bon'
          wifiVital.status = 'good'
        } else {
          wifiVital.value = 'Faible'
          wifiVital.status = 'medium'
        }
      }
    } else if (wifiVital && place.signals.includes('wifi')) {
      // WiFi signalé (via articles/sources) mais pas de mesure
      wifiVital.value = 'Bon'
      wifiVital.status = 'good'
    }
  }

  private async attachWifiLabels(places: Place[]): Promise<void> {
    const ids = places.filter(p => p.signals.includes('wifi')).map(p => p.id)
    if (!ids.length) return

    // One query: get latest speed test per place using distinct on
    const { data } = await this.client
      .from('speed_tests')
      .select('place_id, download')
      .in('place_id', ids)
      .order('place_id')
      .order('created_at', { ascending: false })

    // Keep only the latest per place_id
    const latestByPlace = new Map<string, number>()
    for (const row of (data || [])) {
      if (!latestByPlace.has(row.place_id)) {
        latestByPlace.set(row.place_id, Number(row.download))
      }
    }

    for (const place of places) {
      const wifiVital = place.vitals.find(v => v.label === 'WiFi')
      if (!wifiVital) continue
      const dl = latestByPlace.get(place.id)
      ;(place as any)._wifiDownload = dl || 0
      if (dl != null) {
        if (dl >= 10) {
          wifiVital.value = dl >= 25 ? 'Rapide' : 'Bon'
          wifiVital.status = 'good'
        } else {
          wifiVital.value = 'Faible'
          wifiVital.status = 'medium'
        }
      } else if (place.signals.includes('wifi')) {
        wifiVital.value = 'Bon'
        wifiVital.status = 'good'
      }
    }
  }

  async getSimilar(place: Place, limit = 3): Promise<Place[]> {
    // Find places in the same city with similar category, excluding the current one
    let query = this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('status', 'approved')
      .neq('business_status', 'CLOSED_PERMANENTLY')
      .neq('id', place.id)
      .eq('city_key', place.citySlug)
      .eq('place_type', place.category)
      .order('curation_score', { ascending: false, nullsFirst: false })
      .limit(limit)

    const { data, error } = await query
    if (error) throw error

    // If not enough results in same category, fill with same city
    let results = data || []
    if (results.length < limit) {
      const ids = [place.id, ...results.map((r: any) => r.id)]
      const { data: extra } = await this.client
        .from('places')
        .select('*, blog_mentions(*)')
        .eq('status', 'approved')
        .neq('business_status', 'CLOSED_PERMANENTLY')
        .eq('city_key', place.citySlug)
        .not('id', 'in', `(${ids.join(',')})`)
        .order('curation_score', { ascending: false, nullsFirst: false })
        .limit(limit - results.length)
      if (extra) results = [...results, ...extra]
    }

    const places = results.map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
    await this.attachWifiLabels(places)
    return places
  }

  async getBySlug(slug: string): Promise<Place | null> {
    const { data, error } = await this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('slug', slug)
      .single()

    if (error || !data) return null

    const place = rowToPlace(data, 0, data.blog_mentions)
    await this.attachLatestSpeedTest(place)
    return place
  }

  async getByCity(citySlug: string, filters?: PlaceFilters): Promise<Place[]> {
    let query = this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('status', 'approved')
      .neq('business_status', 'CLOSED_PERMANENTLY')
      .eq('city_key', citySlug)

    query = this.applyFilters(query, filters)
    query = this.applySort(query)

    const { data, error } = await query
    if (error) throw error

    const places = (data || []).map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
    await this.attachWifiLabels(places)
    return places
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
      .neq('business_status', 'CLOSED_PERMANENTLY')
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

    const places = results.map((row: any, i: number) =>
      rowToPlace(row, i, row.blog_mentions)
    )
    await this.attachWifiLabels(places)
    return places
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
    if (filters.terrasse) query = query.contains('signals', ['terrasse'])
    if (filters.gratuit) {
      query = query.not('signals', 'cs', '{"payant"}').not('signals', 'cs', '{"reservation"}')
    }
    if (filters.insolite) query = query.contains('signals', ['insolite'])
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
