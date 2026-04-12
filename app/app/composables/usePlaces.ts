import type { Place, PlaceFilters, PlaceSortBy } from '~/domain/models/Place'
import type { PlaceRepository } from '~/domain/interfaces/PlaceRepository'
import { SupabasePlaceRepository } from '~/infrastructure/repositories/SupabasePlaceRepository'

let _repo: PlaceRepository | null = null

function getRepo(): PlaceRepository {
  if (!_repo) {
    const client = useSupabaseClient()
    _repo = new SupabasePlaceRepository(client)
  }
  return _repo
}

export function usePlaces() {
  const repo = getRepo()

  return {
    getAll: (filters?: PlaceFilters, sortBy?: PlaceSortBy) => repo.getAll(filters, sortBy),
    getAllForMap: () => (repo as SupabasePlaceRepository).getAllForMap(),
    getNearby: (lat: number, lng: number, radiusKm: number, filters?: PlaceFilters) =>
      (repo as SupabasePlaceRepository).getNearby(lat, lng, radiusKm, filters),
    getById: (id: string) => repo.getById(id),
    getBySlug: (slug: string) => (repo as SupabasePlaceRepository).getBySlug(slug),
    getSimilar: (place: Place, limit?: number) => (repo as SupabasePlaceRepository).getSimilar(place, limit),
    getByCity: (citySlug: string, filters?: PlaceFilters) => repo.getByCity(citySlug, filters),
    search: (query: string) => repo.search(query),
    getCities: () => repo.getCities()
  }
}
