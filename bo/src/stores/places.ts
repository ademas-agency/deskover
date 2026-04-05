import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Place, PlaceCategory } from '../core/domain/entities/Place'
import { PlaceRepository } from '../infrastructure/repositories/PlaceRepository'
import { PlaceService } from '../core/services/PlaceService'

export const usePlacesStore = defineStore('places', () => {
  const places = ref<Place[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalPlaces = computed(() => places.value.length)

  const byCategory = computed(() => PlaceService.countByCategory(places.value))

  const withoutPhoto = computed(() =>
    PlaceService.getPlacesWithoutPhoto(places.value)
  )

  const withoutDescription = computed(() =>
    PlaceService.getPlacesWithoutDescription(places.value)
  )

  const toEnrich = computed(() =>
    PlaceService.getPlacesToEnrich(places.value)
  )

  const pendingCount = computed(() => places.value.filter(p => p.status === 'pending').length)

  const cities = computed(() => {
    const citySet = new Set(places.value.map(p => p.city))
    return Array.from(citySet).sort()
  })

  async function fetchPlaces() {
    loading.value = true
    error.value = null
    try {
      places.value = await PlaceRepository.getAll()
    } catch (e: any) {
      error.value = e.message || 'Erreur lors du chargement des lieux'
    } finally {
      loading.value = false
    }
  }

  function getPlaceById(id: string): Place | undefined {
    return places.value.find(p => p.id === id)
  }

  async function savePlace(id: string, updates: Partial<Place>) {
    const place = places.value.find(p => p.id === id)
    if (place) {
      Object.assign(place, updates)
      await PlaceRepository.save(place)
    }
  }

  async function approvePlace(id: string) {
    const place = places.value.find(p => p.id === id)
    if (place) {
      place.status = 'approved'
      await PlaceRepository.updateStatus(id, 'approved')
    }
  }

  async function rejectPlace(id: string) {
    const place = places.value.find(p => p.id === id)
    if (place) {
      place.status = 'rejected'
      await PlaceRepository.updateStatus(id, 'rejected')
    }
  }

  async function deletePlace(id: string) {
    await PlaceRepository.delete(id)
    places.value = places.value.filter(p => p.id !== id)
  }

  function searchPlaces(query: string): Place[] {
    return PlaceService.search(places.value, query)
  }

  function filterByCategory(category: PlaceCategory | ''): Place[] {
    return PlaceService.filterByCategory(places.value, category)
  }

  return {
    places,
    loading,
    error,
    totalPlaces,
    byCategory,
    withoutPhoto,
    withoutDescription,
    toEnrich,
    cities,
    fetchPlaces,
    getPlaceById,
    savePlace,
    approvePlace,
    rejectPlace,
    deletePlace,
    pendingCount,
    searchPlaces,
    filterByCategory,
  }
})
