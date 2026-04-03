import type { Place, PlaceFilters, PlaceSortBy } from '../models/Place'

export interface PlaceRepository {
  getAll(filters?: PlaceFilters, sortBy?: PlaceSortBy): Promise<Place[]>
  getById(id: string): Promise<Place | null>
  getByCity(citySlug: string, filters?: PlaceFilters): Promise<Place[]>
  search(query: string): Promise<Place[]>
  getCities(): Promise<{ name: string; slug: string; count: number }[]>
}
