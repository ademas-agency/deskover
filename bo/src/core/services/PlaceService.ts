import type { Place } from '../domain/entities/Place'

export class PlaceService {
  static getPlacesWithoutPhoto(places: Place[]): Place[] {
    return places.filter(p => !p.photo_url && !p.photo_storage_path)
  }

  static getPlacesWithoutDescription(places: Place[]): Place[] {
    return places.filter(p => !p.description || p.description.trim() === '')
  }

  static getPlacesToEnrich(places: Place[]): Place[] {
    return places.filter(
      p => !p.description || !p.photo_url || p.signals.length === 0
    )
  }

  static countByCategory(places: Place[]): Record<string, number> {
    return places.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  static countByCity(places: Place[]): Record<string, number> {
    return places.reduce((acc, p) => {
      acc[p.city] = (acc[p.city] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  static search(places: Place[], query: string): Place[] {
    const q = query.toLowerCase()
    return places.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    )
  }

  static filterByCategory(places: Place[], category: string): Place[] {
    if (!category) return places
    return places.filter(p => p.category === category)
  }
}
