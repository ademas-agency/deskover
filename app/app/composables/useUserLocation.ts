export interface UserCoords {
  lat: number
  lng: number
}

interface LocationState {
  coords: UserCoords | null
  status: 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable'
}

// Module-level pending promise for request deduplication across callers
let pendingRequest: Promise<UserCoords | null> | null = null

export function useUserLocation() {
  const state = useState<LocationState>('user-location', () => ({
    coords: null,
    status: 'idle'
  }))

  const coords = computed(() => state.value.coords)
  const status = computed(() => state.value.status)

  function requestLocation(options: PositionOptions = { timeout: 5000 }): Promise<UserCoords | null> {
    if (!import.meta.client) return Promise.resolve(null)
    if (state.value.coords) return Promise.resolve(state.value.coords)
    if (pendingRequest) return pendingRequest
    if (!navigator.geolocation) {
      state.value.status = 'unavailable'
      return Promise.resolve(null)
    }

    state.value.status = 'pending'
    pendingRequest = new Promise<UserCoords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          state.value.coords = c
          state.value.status = 'granted'
          resolve(c)
        },
        () => {
          state.value.status = 'denied'
          resolve(null)
        },
        options
      )
    }).finally(() => {
      pendingRequest = null
    })

    return pendingRequest
  }

  return {
    coords,
    status,
    requestLocation
  }
}
