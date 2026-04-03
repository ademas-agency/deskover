import type { Place, Vital, VitalStatus } from '~/domain/models/Place'

/**
 * Raw place from enriched-places.json (scraped data)
 */
export interface RawPlace {
  name: string
  address: string
  city: string
  city_key: string
  arrondissement?: string
  category: string
  description?: string
  signals: string[]
  blog_mentions: { url: string; title: string; source: string }[]
  blog_mentions_count?: number
  google_place_id?: string
  google_name?: string
  latitude: number
  longitude: number
  google_rating?: number
  google_reviews_count?: number
  google_maps_url?: string
  website?: string
  phone?: string
  photo_url?: string
  opening_hours?: Record<string, string>
  business_status?: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function signalToVital(signals: string[]): Vital[] {
  const has = (s: string) => signals.includes(s)

  const wifiStatus: VitalStatus = has('wifi') ? 'good' : 'none'
  const wifiValue = has('wifi') ? 'Rapide' : 'Inconnu'

  const prisesStatus: VitalStatus = has('prises') ? 'good' : has('grandes_tables') ? 'medium' : 'none'
  const prisesValue = has('prises') ? 'Dispo' : has('grandes_tables') ? 'Rares' : 'Inconnu'

  const foodStatus: VitalStatus = has('food') ? 'good' : has('snacks') ? 'medium' : 'none'
  const foodValue = has('food') ? 'Complet' : has('snacks') ? 'Snacks' : '—'

  const styleStatus: VitalStatus = has('ambiance') ? 'good' : has('calme') ? 'good' : 'medium'
  const styleValue = has('ambiance') ? 'Canon' : has('calme') ? 'Superbe' : 'Sympa'

  return [
    { icon: 'lucide:wifi', label: 'WiFi', value: wifiValue, status: wifiStatus },
    { icon: 'lucide:zap', label: 'Prises', value: prisesValue, status: prisesStatus },
    { icon: 'lucide:utensils', label: 'Food', value: foodValue, status: foodStatus },
    { icon: 'lucide:sparkles', label: 'Style', value: styleValue, status: styleStatus }
  ]
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'cafe': return 'Café'
    case 'coffee_shop': return 'Coffee Shop'
    case 'coworking': return 'Coworking'
    case 'tiers_lieu': return 'Tiers-lieu'
    case 'library': return 'Bibliothèque'
    default: return cat
  }
}

export function mapRawToPlace(raw: RawPlace, index: number): Place {
  const id = raw.google_place_id || slugify(raw.name + '-' + raw.city_key)

  let tag: string | undefined
  if (index === 0) tag = 'Number one'
  else if (index === 1) tag = 'Coup de coeur'

  return {
    id,
    slug: slugify(raw.name),
    name: raw.name,
    category: raw.category as Place['category'],
    address: raw.address,
    city: raw.city,
    citySlug: raw.city_key,
    arrondissement: raw.arrondissement,
    latitude: raw.latitude,
    longitude: raw.longitude,
    description: raw.description,
    vitals: signalToVital(raw.signals || []),
    signals: raw.signals || [],
    googleRating: raw.google_rating,
    googleReviewsCount: raw.google_reviews_count,
    googleMapsUrl: raw.google_maps_url,
    photoUrl: raw.photo_url,
    website: raw.website,
    phone: raw.phone,
    openingHours: raw.opening_hours,
    businessStatus: raw.business_status,
    isOpen: raw.business_status === 'OPERATIONAL',
    blogMentions: (raw.blog_mentions || []).map(m => ({
      url: m.url,
      title: m.title,
      source: m.source
    })),
    tag
  }
}

export function mapRawToPlaces(rawPlaces: RawPlace[]): Place[] {
  return rawPlaces.map((raw, i) => mapRawToPlace(raw, i))
}
