export type VitalStatus = 'good' | 'medium' | 'none'

export interface Vital {
  icon: string
  label: string
  value: string
  status: VitalStatus
}

export interface BlogMention {
  url: string
  title: string
  source: string
}

export interface OpeningHours {
  [day: string]: string  // "monday": "9:00-19:00" or "closed"
}

export interface Place {
  id: string
  slug: string
  name: string
  category: 'cafe' | 'coffee_shop' | 'coworking' | 'tiers_lieu' | 'library'
  address: string
  city: string
  citySlug: string
  arrondissement?: string
  latitude: number
  longitude: number
  description?: string

  // Vitals
  vitals: Vital[]
  signals: string[]

  // Google data
  googleRating?: number
  googleReviewsCount?: number
  googleMapsUrl?: string

  // Media
  photoUrl?: string
  website?: string
  phone?: string
  instagram?: string

  // Hours
  openingHours?: OpeningHours
  isOpen?: boolean
  nextOpen?: string
  businessStatus?: string

  // Press
  blogMentions: BlogMention[]

  // Social
  instagram?: string

  // Tags
  tag?: string  // "Number one", "Coup de coeur"
  distance?: string
}

export interface PlaceFilters {
  city?: string
  category?: string
  wifi?: boolean
  prises?: boolean
  food?: boolean
  style?: boolean
  calme?: boolean
  query?: string
}

export type PlaceSortBy = 'relevance' | 'distance' | 'rating'
