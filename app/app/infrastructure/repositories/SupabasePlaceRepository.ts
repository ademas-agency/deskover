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

function rowToPlace(row: any, index: number, mentions?: any[]): Place {
  const signals = row.signals || []

  let tag: string | undefined
  if (index === 0) tag = 'Number one'
  else if (index === 1) tag = 'Coup de coeur'

  const blogMentions: BlogMention[] = (mentions || []).map((m: any) => ({
    url: m.url,
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
    isOpen: row.business_status === 'OPERATIONAL',
    blogMentions,
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

    const { data, error } = await this.client
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('status', 'approved')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`)
      .limit(20)

    if (error) throw error

    return (data || []).map((row: any, i: number) =>
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
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`)
    }

    return query
  }

  private applySort(query: any, sortBy?: PlaceSortBy) {
    switch (sortBy) {
      case 'rating':
        return query.order('google_rating', { ascending: false, nullsFirst: false })
      default:
        return query
          .order('blog_mentions_count', { ascending: false })
          .order('google_rating', { ascending: false, nullsFirst: false })
    }
  }
}
