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
  cardUrl?: string
  thumbUrl?: string
  website?: string
  phone?: string
  instagram?: string

  // Hours
  openingHours?: OpeningHours
  isOpen?: boolean
  nextOpen?: string
  businessStatus?: string

  // Conditions d'accès
  conditions?: string

  // Restauration
  foodType?: string
  foodDescription?: string
  menuUrl?: string

  // Press
  blogMentions: BlogMention[]

  // Social
  instagram?: string

  // Photos
  photos?: string[]

  // Tags
  tag?: string
  distance?: string

  // Speed test (dernière mesure du WiFi)
  speedTest?: {
    download: number
    upload: number
    ping: number
    label: string
    description: string
    quality: number
    ago: string
  }
  speedTestCount?: number

  // Validé par Deskover : date à laquelle l'équipe est allée tester sur place
  deskoverTestedAt?: string
}

export interface PlaceFilters {
  city?: string
  category?: string
  wifi?: boolean
  prises?: boolean
  food?: boolean
  style?: boolean
  calme?: boolean
  terrasse?: boolean
  gratuit?: boolean
  insolite?: boolean
  query?: string
}

export type PlaceSortBy = 'relevance' | 'distance' | 'rating' | 'wifi'
