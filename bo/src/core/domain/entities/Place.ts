export interface BlogMention {
  url: string
  title: string
  source: string
}

export interface Place {
  name: string
  address: string
  city: string
  city_key: string
  arrondissement: string | null
  category: PlaceCategory
  description: string
  signals: string[]
  blog_mentions: BlogMention[]
  blog_mentions_count: number
  google_place_id: string
  google_name: string
  latitude: number
  longitude: number
  google_rating: number
  google_reviews_count: number
  google_maps_url: string
  website: string
  phone: string
  photo_url: string
  photo_local: string
  opening_hours: string[]
  business_status: string
  // Editable fields (BO)
  cover_photo?: string
  gallery_photos?: string[]
  instagram?: string
}

export type PlaceCategory = 'cafe' | 'coffee_shop' | 'coworking' | 'tiers_lieu'

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  cafe: 'Cafe',
  coffee_shop: 'Coffee Shop',
  coworking: 'Coworking',
  tiers_lieu: 'Tiers-lieu',
}

export const SIGNAL_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  prises: 'Prises',
  calme: 'Calme',
  food: 'Restauration',
  terrasse: 'Terrasse',
  laptop_friendly: 'Laptop friendly',
  pas_cher: 'Pas cher',
  grandes_tables: 'Grandes tables',
  ambiance: 'Ambiance',
  silencieux: 'Silencieux',
  musique: 'Musique',
  lumineux: 'Lumineux',
}
