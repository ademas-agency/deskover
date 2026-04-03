import type { PlaceRepository } from '~/domain/interfaces/PlaceRepository'
import type { Place, PlaceFilters, PlaceSortBy } from '~/domain/models/Place'
import { mapRawToPlaces, type RawPlace } from '~/infrastructure/mappers/placeMapper'

/**
 * Repository that reads from static JSON files (scraped data).
 * Will be replaced by SupabasePlaceRepository when we migrate to Supabase.
 */
export class JsonPlaceRepository implements PlaceRepository {
  private places: Place[] = []
  private loaded = false

  private async load(): Promise<void> {
    if (this.loaded) return

    // Cache in sessionStorage to avoid re-fetching on navigation
    const cacheKey = 'deskover_places_cache'
    const cacheExpiry = 'deskover_places_expiry'
    let rawData: RawPlace[]

    if (import.meta.client) {
      const cached = sessionStorage.getItem(cacheKey)
      const expiry = sessionStorage.getItem(cacheExpiry)
      if (cached && expiry && Date.now() < Number(expiry)) {
        rawData = JSON.parse(cached)
      }
      else {
        rawData = await $fetch('/data/enriched-places.json')
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(rawData))
          sessionStorage.setItem(cacheExpiry, String(Date.now() + 24 * 60 * 60 * 1000))
        }
        catch {
          // sessionStorage full — no big deal
        }
      }
    }
    else {
      rawData = await $fetch('/data/enriched-places.json')
    }

    // Deduplicate by google_place_id, then by name+city
    const seen = new Set<string>()
    const deduped: RawPlace[] = []
    for (const raw of rawData) {
      const key = raw.google_place_id || `${raw.name.toLowerCase()}-${raw.city_key}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(raw)
      }
    }

    this.places = mapRawToPlaces(deduped)
    this.loaded = true
  }

  async getAll(filters?: PlaceFilters, sortBy?: PlaceSortBy): Promise<Place[]> {
    await this.load()
    let results = [...this.places]

    if (filters) {
      results = this.applyFilters(results, filters)
    }

    results = this.applySort(results, sortBy)

    return results
  }

  async getById(id: string): Promise<Place | null> {
    await this.load()
    return this.places.find(p => p.id === id) || null
  }

  async getByCity(citySlug: string, filters?: PlaceFilters): Promise<Place[]> {
    await this.load()
    let results = this.places.filter(p => p.citySlug === citySlug)

    if (filters) {
      results = this.applyFilters(results, filters)
    }

    return this.applySort(results)
  }

  async search(query: string): Promise<Place[]> {
    await this.load()
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    return this.places.filter((p) => {
      const name = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const city = p.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const address = p.address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return name.includes(q) || city.includes(q) || address.includes(q)
    }).slice(0, 20)
  }

  async getCities(): Promise<{ name: string; slug: string; count: number }[]> {
    await this.load()
    const cityMap = new Map<string, { name: string; slug: string; count: number }>()

    for (const place of this.places) {
      const existing = cityMap.get(place.citySlug)
      if (existing) {
        existing.count++
      }
      else {
        cityMap.set(place.citySlug, {
          name: place.city,
          slug: place.citySlug,
          count: 1
        })
      }
    }

    return Array.from(cityMap.values()).sort((a, b) => b.count - a.count)
  }

  private applyFilters(places: Place[], filters: PlaceFilters): Place[] {
    return places.filter((p) => {
      if (filters.city && p.citySlug !== filters.city) return false
      if (filters.category && p.category !== filters.category) return false
      if (filters.wifi && !p.signals.includes('wifi')) return false
      if (filters.prises && !p.signals.includes('prises')) return false
      if (filters.food && !p.signals.includes('food')) return false
      if (filters.calme && !p.signals.includes('calme')) return false
      if (filters.query) {
        const q = filters.query.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.city.toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  private applySort(places: Place[], sortBy?: PlaceSortBy): Place[] {
    switch (sortBy) {
      case 'rating':
        return places.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0))
      case 'distance':
        return places // TODO: sort by distance when geoloc available
      default:
        // Relevance: blog mentions count + rating + signals count
        return places.sort((a, b) => {
          const scoreA = (a.blogMentions.length * 3) + (a.googleRating || 0) + (a.signals.length * 0.5)
          const scoreB = (b.blogMentions.length * 3) + (b.googleRating || 0) + (b.signals.length * 0.5)
          return scoreB - scoreA
        })
    }
  }
}
