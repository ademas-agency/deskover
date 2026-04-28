<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const route = useRoute()
const router = useRouter()
const client = useSupabaseClient()
const { getBySlug, getById, getSimilar } = usePlaces()

const placeSlug = route.params.slug as string

// Back navigation: use browser history to go back properly
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const { data: place, status, refresh: refreshPlace } = await useAsyncData(
  `lieu-${placeSlug}`,
  async () => {
    // Try slug first, fallback to id for backwards compatibility
    const bySlug = await getBySlug(placeSlug)
    if (bySlug) return bySlug
    return getById(placeSlug)
  }
)
const { data: similarPlaces } = await useAsyncData(
  `similar-${placeSlug}`,
  async () => {
    if (!place.value) return []
    return getSimilar(place.value, 3)
  },
  { watch: [place] }
)

// Articles Deskover liés à la ville du lieu
const { data: deskoverArticles } = await useAsyncData(
  `lieu-articles-${placeSlug}`,
  async () => {
    if (!place.value?.citySlug) return []
    const { data } = await client
      .from('articles')
      .select('title, slug, city')
      .eq('published', true)
      .eq('city_slug', place.value.citySlug)
      .order('published_at', { ascending: false })
      .limit(3)
    return data || []
  },
  { watch: [place] }
)

const loading = computed(() => status.value === 'pending')
const cleanAddress = computed(() => (place.value?.address || '').replace(/,\s*France\s*$/i, ''))
const showSpeedTest = ref(false)
const showContribute = ref(false)
const isNearby = ref(false)
const userCoords = ref<{ lat: number; lng: number } | null>(null)
const runningSpeedTest = ref(false)
const speedTestResult = ref<{ download: number; upload: number; ping: number } | null>(null)

const wifiCaptif = ref(false)

// Contribution state
const ratings = reactive({
  wifi: '' as string,
  prises: '' as string,
  food: '' as string,
  style: '' as string
})

const hasRated = computed(() => Object.values(ratings).some(v => v !== ''))

function wifiLabelFromSpeed(mbps: number): string {
  if (mbps >= 25) return 'Rapide'
  if (mbps >= 10) return 'Bon'
  return 'Faible'
}

const speedTestProgress = ref('')

async function runSpeedTest() {
  runningSpeedTest.value = true
  speedTestResult.value = null

  try {
    // Step 1: Ping (5 requests, take 2nd best)
    speedTestProgress.value = 'Ping...'
    const pings: number[] = []
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now()
      await fetch(`https://speed.cloudflare.com/__down?bytes=0&_=${Date.now()}${i}`, { cache: 'no-store' })
      pings.push(performance.now() - t0)
    }
    const ping = Math.round(pings.sort((a, b) => a - b)[1])

    // Step 2: Warm up TCP connection
    speedTestProgress.value = 'Préparation...'
    await fetch(`https://speed.cloudflare.com/__down?bytes=1000000&_=${Date.now()}`, { cache: 'no-store' }).then(r => r.arrayBuffer())

    // Step 3: Download — stream 100 MB and measure throughput
    speedTestProgress.value = 'Téléchargement...'
    const dlResponse = await fetch(`https://speed.cloudflare.com/__down?bytes=100000000&_=${Date.now()}`, { cache: 'no-store' })
    const reader = dlResponse.body!.getReader()
    let totalBytes = 0
    const dlStart = performance.now()
    const checkpoints: { time: number; bytes: number }[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      checkpoints.push({ time: performance.now(), bytes: totalBytes })
      // Live update
      if (checkpoints.length % 20 === 0) {
        const elapsed = (performance.now() - dlStart) / 1000
        const mbps = Math.round((totalBytes * 8) / elapsed / 1000000)
        speedTestProgress.value = `↓ ${mbps} Mbps`
      }
    }

    // Calculate from middle 80% (skip TCP slow start and tail)
    const startIdx = Math.floor(checkpoints.length * 0.1)
    const endIdx = Math.floor(checkpoints.length * 0.9)
    let download: number
    if (endIdx > startIdx + 5) {
      const midBytes = checkpoints[endIdx].bytes - checkpoints[startIdx].bytes
      const midTime = (checkpoints[endIdx].time - checkpoints[startIdx].time) / 1000
      download = Math.round((midBytes * 8) / midTime / 1000000)
    } else {
      const dlDuration = (performance.now() - dlStart) / 1000
      download = Math.round((totalBytes * 8) / dlDuration / 1000000)
    }

    // Step 4: Upload (10 MB)
    speedTestProgress.value = 'Upload...'
    const ulData = new Uint8Array(10000000)
    const ulStart = performance.now()
    try {
      await fetch(`https://speed.cloudflare.com/__up?_=${Date.now()}`, { method: 'POST', body: ulData, cache: 'no-store' })
    } catch { /* CORS may block response */ }
    const upload = Math.round((10000000 * 8) / ((performance.now() - ulStart) / 1000) / 1000000)

    speedTestResult.value = { download, upload, ping }
    ratings.wifi = wifiLabelFromSpeed(download)
  }
  catch (err) {
    console.error('Speed test error:', err)
    speedTestResult.value = null
  }
  finally {
    runningSpeedTest.value = false
    speedTestProgress.value = ''
  }
}

const dayLabels: Record<string, string> = {
  monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
  thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche'
}
const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const todayKey = computed(() => dayOrder[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1])

const formattedHours = computed(() => {
  if (!place.value?.openingHours) return []
  const oh = place.value.openingHours

  // Handle array format: ["lundi: 12:00 – 21:00", ...]
  if (Array.isArray(oh)) {
    const parsed = new Map<string, string>()
    for (const entry of oh) {
      const colonIdx = entry.indexOf(':')
      if (colonIdx === -1) continue
      const day = entry.substring(0, colonIdx).trim().toLowerCase()
      const hours = entry.substring(colonIdx + 1).trim()
      parsed.set(day, hours)
    }
    const dayMap: Record<string, string> = {
      monday: 'lundi', tuesday: 'mardi', wednesday: 'mercredi',
      thursday: 'jeudi', friday: 'vendredi', saturday: 'samedi', sunday: 'dimanche'
    }
    return dayOrder.map(d => ({
      day: dayLabels[d],
      hours: parsed.get(dayMap[d]) || 'Fermé',
      isToday: d === todayKey.value
    }))
  }

  // Handle object format: {monday: "12:00 – 21:00", ...}
  return dayOrder.map(d => ({
    day: dayLabels[d],
    hours: oh[d] || 'Fermé',
    isToday: d === todayKey.value
  }))
})

const showAllHours = ref(false)

const submitError = ref('')
const submitSuccess = ref(false)

function ratingToNumber(key: string, value: string): number {
  const maps: Record<string, Record<string, number>> = {
    wifi: { 'Faible': 1, 'Bon': 2, 'Rapide': 3 },
    prises: { 'Aucune': 1, 'Quelques-unes': 2, 'Plein': 3 },
    food: { 'Boissons': 1, 'Snacks': 2, 'Repas': 3 },
    style: { 'Cozy': 1, 'Design': 2, 'Canon': 3 },
  }
  return maps[key]?.[value] || 2
}

function getFingerprint() {
  const stored = localStorage.getItem('deskover_fp')
  if (stored) return stored
  const fp = crypto.randomUUID()
  localStorage.setItem('deskover_fp', fp)
  return fp
}

async function submitRating() {
  if (!place.value) return
  submitError.value = ''

  const client = useSupabaseClient()
  const { error } = await client.from('ratings').insert({
    place_id: place.value.id,
    fingerprint: getFingerprint(),
    wifi: ratingToNumber('wifi', ratings.wifi),
    power: ratingToNumber('prises', ratings.prises),
    noise: ratingToNumber('food', ratings.food),
    comfort: ratingToNumber('style', ratings.style),
  })

  if (error) {
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      submitError.value = 'Tu as déjà noté ce lieu.'
    } else {
      submitError.value = 'Oups, une erreur est survenue.'
    }
    return
  }

  // If wifi_captif was flagged, add signal to place
  if (wifiCaptif.value) {
    const currentSignals = place.value.signals || []
    if (!currentSignals.includes('wifi_captif')) {
      await client.from('places').update({
        signals: [...currentSignals, 'wifi_captif']
      }).eq('id', place.value.id)
    }
  }

  submitSuccess.value = true
  showContribute.value = false
  ratings.wifi = ''
  ratings.prises = ''
  ratings.food = ''
  ratings.style = ''
  wifiCaptif.value = false

  // Refresh place data
  await refreshPlace()
  setTimeout(() => { submitSuccess.value = false }, 3000)
}

onMounted(() => {
  // Check if user is near the place (< 30m) — client only
  if (navigator.geolocation && place.value) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      const dist = haversine(pos.coords.latitude, pos.coords.longitude, place.value!.latitude, place.value!.longitude)
      isNearby.value = dist < 30
    }, () => {}, { timeout: 5000 })
  }
  window.addEventListener('keydown', onLightboxKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onLightboxKey)
})

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Color per option: last = good (monstera), middle = medium (edison), first = low (terracotta)
const optionColors: Record<string, Record<string, string>> = {
  wifi: { Faible: 'bg-[var(--color-terracotta-500)]', Bon: 'bg-[var(--color-edison)]', Rapide: 'bg-[var(--color-monstera)]' },
  prises: { Aucune: 'bg-[var(--color-terracotta-500)]', 'Quelques-unes': 'bg-[var(--color-edison)]', Plein: 'bg-[var(--color-monstera)]' },
  food: { Boissons: 'bg-[var(--color-edison)]', Snacks: 'bg-[var(--color-edison)]', 'Repas': 'bg-[var(--color-monstera)]' },
  style: { Cozy: 'bg-[var(--color-monstera)]', Design: 'bg-[var(--color-monstera)]', Canon: 'bg-[var(--color-monstera)]' }
}

function ratingBtnClass(vital: string, opt: string, currentValue: string) {
  if (currentValue === opt) {
    return (optionColors[vital]?.[opt] || 'bg-[var(--color-monstera)]') + ' text-white shadow-sm'
  }
  return 'bg-white text-[var(--color-roast)]'
}

function ratingIconActive(vital: string) {
  const val = ratings[vital as keyof typeof ratings]
  if (!val) return 'text-[var(--color-steam)]'
  const colors: Record<string, string> = optionColors[vital] || {}
  const cls = colors[val] || ''
  if (cls.includes('monstera')) return 'text-[var(--color-monstera)]'
  if (cls.includes('edison')) return 'text-[var(--color-edison)]'
  if (cls.includes('terracotta')) return 'text-[var(--color-terracotta-500)]'
  return 'text-[var(--color-steam)]'
}

function onVitalClick(label: string) {
  if (label === 'WiFi') {
    showSpeedTest.value = true
  }
}

const showShareToast = ref(false)
const showMapModal = ref(false)
const { public: { mapboxToken } } = useRuntimeConfig()
const modalMapContainer = ref<HTMLElement | null>(null)
let modalMap: mapboxgl.Map | null = null

const routeInfo = ref<{ distance: string; duration: string } | null>(null)
const routeLoading = ref(false)

watch(showMapModal, async (open) => {
  if (!open || !place.value) {
    if (modalMap) { modalMap.remove(); modalMap = null }
    routeInfo.value = null
    return
  }
  await nextTick()
  if (!modalMapContainer.value) return

  routeLoading.value = true
  routeInfo.value = null

  mapboxgl.accessToken = mapboxToken
  modalMap = new mapboxgl.Map({
    container: modalMapContainer.value,
    style: 'mapbox://styles/mapbox/light-v11',
    projection: 'mercator',
    center: [place.value.longitude, place.value.latitude],
    zoom: 15,
    attributionControl: false
  })

  // Destination marker
  const destEl = document.createElement('div')
  destEl.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;background:#AA4C4D;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`
  new mapboxgl.Marker({ element: destEl, anchor: 'center' })
    .setLngLat([place.value.longitude, place.value.latitude])
    .addTo(modalMap)

  modalMap.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

  // Suppress known mapbox-gl v3 NaN LngLat rendering bug
  modalMap.on('error', (e) => {
    if (e.error?.message?.includes('Invalid LngLat')) return
    console.error(e.error)
  })

  // Get user position and draw route
  const dest = place.value
  modalMap.on('load', async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      })
      const userLng = pos.coords.longitude
      const userLat = pos.coords.latitude

      // User marker (blue dot)
      const userEl = document.createElement('div')
      userEl.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`
      new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat([userLng, userLat])
        .addTo(modalMap!)

      // Fetch walking directions from Mapbox
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLng},${userLat};${dest.longitude},${dest.latitude}?geometries=geojson&overview=full&access_token=${mapboxToken}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.routes?.length) {
        const route = data.routes[0]
        const distKm = route.distance / 1000
        const durMin = Math.round(route.duration / 60)
        routeInfo.value = {
          distance: distKm < 1 ? `${Math.round(route.distance)} m` : `${distKm.toFixed(1)} km`,
          duration: durMin < 60 ? `${durMin} min` : `${Math.floor(durMin / 60)}h${String(durMin % 60).padStart(2, '0')}`
        }

        // Draw route line
        modalMap!.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: route.geometry }
        })
        modalMap!.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#AA4C4D', 'line-width': 4, 'line-opacity': 0.7 }
        })

        // Fit bounds to show both user and destination
        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([userLng, userLat])
        bounds.extend([dest.longitude, dest.latitude])
        modalMap!.fitBounds(bounds, { padding: 60, maxZoom: 16 })
      }
    }
    catch {
      // Geolocation denied or failed — just show the place
    }
    finally {
      routeLoading.value = false
    }
  })
})

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
let touchStartX = 0

function openLightbox(i: number) {
  lightboxIndex.value = i
  lightboxOpen.value = true
}

function lightboxPrev() {
  lightboxIndex.value = (lightboxIndex.value - 1 + allPhotos.value.length) % allPhotos.value.length
}

function lightboxNext() {
  lightboxIndex.value = (lightboxIndex.value + 1) % allPhotos.value.length
}

function onLightboxKey(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') lightboxOpen.value = false
  if (e.key === 'ArrowLeft') lightboxPrev()
  if (e.key === 'ArrowRight') lightboxNext()
}
const allPhotos = computed(() => {
  if (!place.value) return []
  const photos: string[] = []
  if (place.value.photos?.length) photos.push(...place.value.photos)
  if (place.value.photoUrl) photos.push(place.value.photoUrl)
  return photos
})

const heroPhoto = computed(() => allPhotos.value[allPhotos.value.length - 1])
const hasHeroPhoto = computed(() => allPhotos.value.length > 0)

async function shareLieu() {
  if (!place.value) return

  const url = window.location.href
  const title = place.value.name
  const text = `Grâce à Deskover j'ai trouvé le spot parfait pour travailler : ${title}`

  if (navigator.share) {
    try {
      // Try sharing with image if available
      if (place.value.photoUrl && navigator.canShare) {
        try {
          const response = await fetch(place.value.photoUrl)
          const blob = await response.blob()
          const file = new File([blob], `${title}.jpg`, { type: 'image/jpeg' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title, text, url, files: [file] })
            return
          }
        } catch {
          // Image share failed, share without image
        }
      }
      await navigator.share({ title, text, url })
      return
    } catch {
      // User cancelled — fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    showShareToast.value = true
    setTimeout(() => { showShareToast.value = false }, 2000)
  } catch {
    // Silent fail
  }
}

function categoryLabel(cat: string) {
  switch (cat) {
    case 'cafe': return 'Café'
    case 'coffee_shop': return 'Coffee Shop'
    case 'coworking': return 'Coworking'
    case 'tiers_lieu': return 'Tiers-lieu'
    case 'library': return 'Bibliothèque'
    default: return cat
  }
}

const seoTitle = computed(() => place.value ? `${place.value.name} — ${categoryLabel(place.value.category)} à ${place.value.city} | Deskover` : 'Deskover')
const seoDescription = computed(() => {
  if (!place.value) return ''
  const parts = [`${place.value.name}, ${categoryLabel(place.value.category)} à ${place.value.city}.`]
  if (place.value.vitals) {
    const v = place.value.vitals
    const tags: string[] = []
    if (v.wifi && v.wifi !== 'Non') tags.push(`WiFi ${v.wifi}`)
    if (v.prises && v.prises !== 'Non') tags.push(`Prises ${v.prises}`)
    if (tags.length) parts.push(tags.join(', ') + '.')
  }
  parts.push('Avis, horaires et infos pratiques sur Deskover.')
  return parts.join(' ')
})

useSeoMeta({
  title: () => seoTitle.value,
  ogTitle: () => seoTitle.value,
  description: () => seoDescription.value,
  ogDescription: () => seoDescription.value,
  ogImage: () => place.value?.photoUrl || 'https://www.deskover.fr/og-default.png',
  ogType: 'place',
  ogLocale: 'fr_FR',
  ogSiteName: 'Deskover',
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => place.value?.photoUrl || 'https://www.deskover.fr/og-default.png'
})

const jsonLd = computed(() => {
  if (!place.value) return null
  const p = place.value
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': p.category === 'coworking' ? 'LocalBusiness' : 'CafeOrCoffeeShop',
    'name': p.name,
    'url': `https://www.deskover.fr/lieu/${placeSlug}`,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': p.address,
      'addressLocality': p.city,
      'addressCountry': 'FR',
      ...(p.address.match(/\b\d{5}\b/) ? { postalCode: p.address.match(/\b\d{5}\b/)![0] } : {})
    }
  }
  if (p.photoUrl) schema.image = p.photoUrl
  if (p.phone) schema.telephone = p.phone
  if (p.website) schema.url = p.website
  if (p.latitude && p.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      'latitude': p.latitude,
      'longitude': p.longitude
    }
  }
  if (p.googleRating && p.googleReviewsCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': p.googleRating,
      'reviewCount': p.googleReviewsCount,
      'bestRating': 5
    }
  }
  if (p.openingHours) {
    const dayMap: Record<string, string> = {
      monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
      thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su'
    }
    const specs: string[] = []
    for (const [day, hours] of Object.entries(p.openingHours)) {
      if (hours && hours !== 'Fermé' && dayMap[day]) {
        specs.push(`${dayMap[day]} ${hours}`)
      }
    }
    if (specs.length) schema.openingHours = specs
  }
  return [
    schema,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Deskover', 'item': 'https://www.deskover.fr' },
        { '@type': 'ListItem', 'position': 2, 'name': p.city, 'item': `https://www.deskover.fr/ville/${p.citySlug}` },
        { '@type': 'ListItem', 'position': 3, 'name': p.name, 'item': `https://www.deskover.fr/lieu/${placeSlug}` }
      ]
    }
  ]
})

useHead({
  link: [
    { rel: 'canonical', href: () => `https://www.deskover.fr/lieu/${placeSlug}` }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => jsonLd.value ? JSON.stringify(jsonLd.value) : ''
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
  <div v-if="place" class="pb-28 lg:pb-0">

    <!-- Photo hero -->
    <div class="relative h-[260px] lg:h-[400px] overflow-hidden">
      <PlacePhotoPlaceholder v-if="!hasHeroPhoto" :name="place.name" class="rounded-b-[24px] lg:rounded-b-none" />
      <img
        v-else
        :src="heroPhoto"
        :alt="place.name"
        class="w-full h-full object-cover rounded-b-[24px] lg:rounded-b-none cursor-pointer"
        @click="openLightbox(allPhotos.length - 1)"
      >
      <div class="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent rounded-b-[24px] lg:rounded-b-none" />

      <!-- Header overlay (mobile) -->
      <div class="absolute top-safe left-4 right-4 flex justify-between items-center lg:hidden">
        <button
          @click="goBack"
          class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center"
        >
          <UIcon name="lucide:chevron-left" class="w-5 h-5 text-white" />
        </button>
        <div class="flex gap-2">
          <button class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center">
            <UIcon name="lucide:heart" class="w-5 h-5 text-white" />
          </button>
          <button class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-lg flex items-center justify-center" @click="shareLieu">
            <UIcon name="lucide:share" class="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <!-- Top bar overlay (desktop) -->
      <div class="hidden lg:block absolute top-0 left-0 right-0 z-10">
        <div class="flex items-center justify-between px-10 pt-6 lg:container-deskover">
          <NuxtLink to="/" class="font-display text-base text-white tracking-[0.15em]">DESKOVER</NuxtLink>
          <NuxtLink to="/search">
            <UIcon name="lucide:search" class="w-[22px] h-[22px] text-white" />
          </NuxtLink>
        </div>
      </div>

    </div>

    <!-- Desktop: 2 colonnes | Mobile: empilé -->
    <div class="lg:container-deskover lg:grid lg:grid-cols-[1fr_340px] lg:gap-10 lg:mt-8">

      <!-- Colonne principale -->
      <div>
        <!-- Nom + catégorie -->
        <div class="px-4 pt-5 lg:px-0">
          <div class="flex items-start justify-between gap-3">
            <h1 class="font-display text-[22px] lg:text-[28px] text-[var(--color-espresso)]">{{ place.name }}</h1>
            <div
              class="flex-shrink-0 mt-1 px-2.5 py-1.5 rounded-lg text-white text-[10px] font-bold"
              :class="place.isOpen ? 'bg-[var(--color-monstera)]' : 'bg-[var(--color-terracotta-500)]'"
            >
              {{ place.isOpen ? 'Ouvert' : (place.nextOpen || 'Fermé') }}
            </div>
          </div>
          <p class="text-[13px] text-[var(--color-steam)] mt-1">
            {{ categoryLabel(place.category) }} · {{ place.arrondissement ? `${place.city} ${place.arrondissement}e` : place.city }}
          </p>
        </div>

        <!-- Description -->
        <p v-if="place.description" class="px-4 mt-3 text-[14px] text-[var(--color-roast)] leading-relaxed lg:px-0">
          {{ place.description }}
        </p>

        <!-- Vitals -->
        <div class="px-4 mt-5 lg:px-0">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-2.5">LES VITALS</div>
          <PlaceVitals :vitals="place.vitals" size="lg" :clickable="['WiFi']" @vital-click="onVitalClick" />
          <div v-if="place.conditions" class="mt-4">
            <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-1.5">AVANT DE TE DÉPLACER</div>
            <div class="text-[14px] text-[var(--color-roast)] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-1 [&_li]:mb-0.5 [&_strong]:text-[var(--color-espresso)] [&_p+p]:mt-1.5" v-html="place.conditions" />
          </div>

          <div v-if="place.foodType || place.foodDescription || place.menuUrl" class="mt-4">
            <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-1.5">RESTAURATION</div>
            <div v-if="place.foodType" class="text-[13px] font-semibold text-[var(--color-espresso)] mb-1">
              {{ { boissons: 'Boissons uniquement', snacks: 'Boissons + snacks', dejeuner: 'Déjeuner / plats', complet: 'Restauration complète', buffet: 'Buffet / libre-service' }[place.foodType] || place.foodType }}
            </div>
            <div v-if="place.foodDescription" class="text-[14px] text-[var(--color-roast)] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-1 [&_li]:mb-0.5 [&_strong]:text-[var(--color-espresso)] [&_p+p]:mt-1.5" v-html="place.foodDescription" />
            <a v-if="place.menuUrl" :href="place.menuUrl" target="_blank" class="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-terracotta-500)] mt-2 hover:underline">
              <UIcon name="lucide:external-link" class="w-3.5 h-3.5" />
              Voir le menu
            </a>
          </div>
        </div>

        <!-- Photos moodboard -->
        <div v-if="allPhotos.length > 1" class="mt-5">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-3 px-4 lg:px-0">LE SPOT EN IMAGES</div>

          <!-- 2 photos : chevauchement gauche/droite -->
          <div v-if="allPhotos.length === 2" class="relative h-[220px] mx-4 lg:mx-0">
            <div class="absolute rounded-[12px] overflow-hidden shadow-md cursor-pointer" style="left:0; top:8%; width:58%; height:84%;" @click="openLightbox(0)">
              <img :src="allPhotos[0]" :alt="`Photo 1 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="absolute rounded-[12px] overflow-hidden cursor-pointer" style="right:0; top:0; width:54%; height:92%; border:6px solid white; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:10;" @click="openLightbox(1)">
              <img :src="allPhotos[1]" :alt="`Photo 2 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          <!-- 3 photos : 2 fonds + 1 centrale superposée avec cadre blanc -->
          <div v-else-if="allPhotos.length === 3" class="relative h-[240px] mx-4 lg:mx-0">
            <div class="absolute rounded-[12px] overflow-hidden shadow-md cursor-pointer" style="left:0; top:8%; width:52%; height:84%;" @click="openLightbox(0)">
              <img :src="allPhotos[0]" :alt="`Photo 1 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="absolute rounded-[12px] overflow-hidden shadow-md cursor-pointer" style="right:0; top:8%; width:52%; height:84%;" @click="openLightbox(2)">
              <img :src="allPhotos[2]" :alt="`Photo 3 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="absolute rounded-[12px] overflow-hidden cursor-pointer" style="left:50%; transform:translateX(-50%); top:0; width:46%; height:100%; border:4px solid white; box-shadow:0 8px 28px rgba(0,0,0,0.18); z-index:10;" @click="openLightbox(1)">
              <img :src="allPhotos[1]" :alt="`Photo 2 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          <!-- 4 photos : composition moodboard diagonale -->
          <div v-else-if="allPhotos.length === 4" class="relative h-[260px] mx-4 lg:mx-0">
            <!-- Fond gauche -->
            <div class="absolute rounded-[12px] overflow-hidden shadow-sm cursor-pointer" style="left:0; top:10%; width:40%; height:80%;" @click="openLightbox(0)">
              <img :src="allPhotos[0]" :alt="`Photo 1 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Superposée centre-gauche (en haut) -->
            <div class="absolute rounded-[12px] overflow-hidden cursor-pointer" style="left:22%; top:0; width:37%; height:68%; border:4px solid white; box-shadow:0 6px 24px rgba(0,0,0,0.16); z-index:10;" @click="openLightbox(1)">
              <img :src="allPhotos[1]" :alt="`Photo 2 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Superposée centre-droit (en bas) -->
            <div class="absolute rounded-[12px] overflow-hidden cursor-pointer" style="right:22%; bottom:0; width:37%; height:68%; border:4px solid white; box-shadow:0 6px 24px rgba(0,0,0,0.16); z-index:10;" @click="openLightbox(2)">
              <img :src="allPhotos[2]" :alt="`Photo 3 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Fond droit -->
            <div class="absolute rounded-[12px] overflow-hidden shadow-sm cursor-pointer" style="right:0; top:10%; width:40%; height:80%;" @click="openLightbox(3)">
              <img :src="allPhotos[3]" :alt="`Photo 4 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          <!-- 5+ photos : moodboard Pinterest 6 cases -->
          <!-- border:6px white sur chaque photo — les bordures adjacentes créent 6px de séparation blanche -->
          <div v-else class="relative h-[490px] mx-4 lg:mx-0">
            <!-- Photo 0 : gauche haut, coupe à 57% (décalage fort avec droite à 28%) -->
            <div class="absolute overflow-hidden cursor-pointer" style="left:0; top:0; width:52%; height:57%; border:6px solid white;" @click="openLightbox(0)">
              <img :src="allPhotos[0]" :alt="`Photo 1 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Photo 1 : droite haut, courte (28%) -->
            <div class="absolute overflow-hidden cursor-pointer" style="right:0; top:0; width:54%; height:28%; border:6px solid white;" @click="openLightbox(1)">
              <img :src="allPhotos[1]" :alt="`Photo 2 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Photo 2 : droite milieu, flush avec Photo 1 (pas de gap, la bordure suffit) -->
            <div class="absolute overflow-hidden cursor-pointer" style="right:0; top:26%; width:60%; height:40%; border:6px solid white;" @click="openLightbox(2)">
              <img :src="allPhotos[2]" :alt="`Photo 3 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Photo 3 : overlay centrale — même border 3px + ombre pour effet superposé -->
            <div class="absolute overflow-hidden cursor-pointer" style="left:22%; top:42%; width:44%; height:35%; border:6px solid white; box-shadow:0 10px 30px rgba(0,0,0,0.22); z-index:10;" @click="openLightbox(3)">
              <img :src="allPhotos[3]" :alt="`Photo 4 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Photo 4 : gauche bas, flush avec Photo 0 -->
            <div class="absolute overflow-hidden cursor-pointer" style="left:0; top:52%; width:60%; height:48%; border:6px solid white;" @click="openLightbox(4)">
              <img :src="allPhotos[4]" :alt="`Photo 5 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <!-- Photo 5 : droite bas, flush avec Photo 2 -->
            <div v-if="allPhotos.length >= 6" class="absolute overflow-hidden cursor-pointer" style="right:0; top:62%; width:46%; height:38%; border:6px solid white;" @click="openLightbox(5)">
              <img :src="allPhotos[5]" :alt="`Photo 6 — ${place.name}`" class="w-full h-full object-cover" loading="lazy" />
              <div v-if="allPhotos.length > 6" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span class="text-white text-2xl font-bold">+{{ allPhotos.length - 6 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Infos (mobile only - desktop dans sidebar) -->
        <div class="px-4 mt-5 lg:hidden">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-3">INFOS</div>
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <UIcon name="lucide:map-pin" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0 mt-0.5" />
              <div>
                <a :href="place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`" target="_blank" class="text-sm text-[var(--color-roast)]">{{ cleanAddress }}</a>
                <button @click="showMapModal = true" class="text-sm font-semibold text-[var(--color-terracotta-500)] mt-0.5 block">J'y vais →</button>
              </div>
            </div>
            <div v-if="place.phone" class="flex items-center gap-3">
              <UIcon name="lucide:phone" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
              <a :href="`tel:${place.phone}`" class="text-sm text-[var(--color-roast)]">{{ place.phone }}</a>
            </div>
            <div v-if="place.website" class="flex items-center gap-3">
              <UIcon name="lucide:globe" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
              <a :href="place.website" target="_blank" class="text-sm text-[var(--color-terracotta-500)] font-medium">Site web</a>
            </div>
            <div v-if="place.instagram" class="flex items-center gap-3">
              <UIcon name="simple-icons:instagram" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
              <a :href="`https://www.instagram.com/${place.instagram.replace('@', '')}/`" target="_blank" class="text-sm text-[var(--color-terracotta-500)] font-medium">
                @{{ place.instagram.replace('@', '') }}
              </a>
            </div>
          </div>
        </div>

        <!-- Horaires (mobile only) -->
        <div v-if="formattedHours.length" class="px-4 mt-5 lg:hidden">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mt-8 mb-3">HORAIRES</div>
          <div class="bg-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(44,40,37,0.06)]">
            <div
              v-for="h in formattedHours"
              :key="h.day"
              class="flex justify-between py-1.5 text-sm"
              :class="h.isToday ? 'font-bold text-[var(--color-espresso)]' : 'text-[var(--color-roast)]'"
            >
              <span>{{ h.day }}</span>
              <span>{{ h.hours }}</span>
            </div>
          </div>
        </div>

        <!-- Séparateur -->
        <div class="text-center py-5 text-[var(--color-steam)] text-xl tracking-[4px] font-xl font-extrabold">· · ·</div>

        <!-- Vu dans -->
        <div v-if="place.blogMentions.length || deskoverArticles?.length" class="px-4 lg:px-0">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-2.5">VU DANS</div>
          <div class="flex flex-col gap-2.5">
            <!-- Mentions presse externes -->
            <a
              v-for="mention in place.blogMentions.slice(0, 3)"
              :key="mention.url"
              :href="mention.url"
              target="_blank"
              rel="noopener"
              class="block bg-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(44,40,37,0.06)] hover:shadow-[0_4px_12px_rgba(44,40,37,0.1)] transition-shadow"
            >
              <div class="text-[10px] text-[var(--color-terracotta-500)] font-bold uppercase">{{ mention.source }}</div>
              <div class="text-sm text-[var(--color-espresso)] font-semibold mt-1">{{ mention.title }}</div>
              <div class="text-xs text-[var(--color-terracotta-500)] mt-1.5">Lire l'article →</div>
            </a>
            <!-- Articles Deskover -->
            <NuxtLink
              v-for="article in deskoverArticles?.slice(0, Math.max(1, Math.min(2, place.blogMentions.length)))"
              :key="article.slug"
              :to="`/articles/${article.slug}`"
              class="block bg-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(44,40,37,0.06)] hover:shadow-[0_4px_12px_rgba(44,40,37,0.1)] transition-shadow"
            >
              <div class="text-[10px] text-[var(--color-terracotta-500)] font-bold uppercase">Deskover</div>
              <div class="text-sm text-[var(--color-espresso)] font-semibold mt-1">{{ article.title }}</div>
              <div class="text-xs text-[var(--color-terracotta-500)] mt-1.5">Lire notre guide →</div>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Sidebar desktop (infos pratiques) -->
      <aside class="hidden lg:block">
        <div class="sticky top-[80px]">
          <!-- Card infos pratiques -->
          <div class="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(44,40,37,0.06)]">
            <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-4">INFOS PRATIQUES</div>
            <div class="flex flex-col gap-4">
              <div class="flex items-start gap-3">
                <UIcon name="lucide:map-pin" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0 mt-0.5" />
                <div>
                  <a :href="place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`" target="_blank" class="text-sm text-[var(--color-roast)]">{{ cleanAddress }}</a>
                  <button @click="showMapModal = true" class="text-sm font-semibold text-[var(--color-terracotta-500)] mt-0.5 block">J'y vais →</button>
                </div>
              </div>
              <div v-if="place.phone" class="flex items-center gap-3">
                <UIcon name="lucide:phone" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
                <a :href="`tel:${place.phone}`" class="text-sm text-[var(--color-roast)]">{{ place.phone }}</a>
              </div>
              <div v-if="place.website" class="flex items-center gap-3">
                <UIcon name="lucide:globe" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
                <a :href="place.website" target="_blank" class="text-sm text-[var(--color-terracotta-500)] font-medium">Site web</a>
              </div>
              <div v-if="place.instagram" class="flex items-center gap-3">
                <UIcon name="simple-icons:instagram" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
                <a :href="`https://www.instagram.com/${place.instagram.replace('@', '')}/`" target="_blank" class="text-sm text-[var(--color-terracotta-500)] font-medium">
                  @{{ place.instagram.replace('@', '') }}
                </a>
              </div>
            </div>

            <!-- Horaires desktop -->
            <div v-if="formattedHours.length" class="mt-4 pt-4 border-t border-[var(--color-parchment)]">
              <div class="font-display text-[11px] text-[var(--color-steam)] tracking-[0.1em] mb-2">HORAIRES</div>
              <div
                v-for="h in formattedHours"
                :key="h.day"
                class="flex justify-between py-1 text-[13px]"
                :class="h.isToday ? 'font-bold text-[var(--color-espresso)]' : 'text-[var(--color-roast)]'"
              >
                <span>{{ h.day }}</span>
                <span>{{ h.hours }}</span>
              </div>
            </div>

          </div>

          <!-- CTA Donner mon avis (desktop) -->
          <button
            class="w-full bg-[var(--color-terracotta-500)] text-[var(--color-cream)] text-sm font-bold py-3.5 rounded-[14px] flex items-center justify-center gap-2 mt-4"
            @click="showContribute = true"
          >
            <UIcon name="lucide:sparkles" class="w-[18px] h-[18px]" />
            Donner mon avis
          </button>
        </div>
      </aside>

    </div>

    <!-- Tu devrais aussi aimer -->
    <div v-if="similarPlaces?.length" class="px-4 mt-8 pb-4 lg:container-deskover">
      <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-4">TU DEVRAIS AUSSI AIMER</div>
      <div class="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
        <NuxtLink
          v-for="sp in similarPlaces"
          :key="sp.id"
          :to="`/lieu/${sp.slug || sp.id}`"
          class="block"
        >
          <PlaceCard :place="{
            name: sp.name,
            type: sp.category === 'coffee_shop' ? 'Coffee Shop' : sp.category === 'cafe' ? 'Café' : sp.category === 'coworking' ? 'Coworking' : sp.category === 'tiers_lieu' ? 'Tiers-lieu' : sp.category,
            neighborhood: '',
            city: sp.address || sp.city,
            distance: '',
            isOpen: sp.isOpen ?? true,
            nextOpen: sp.nextOpen,
            image: sp.photoUrl,
            images: sp.photos || [],
            vitals: sp.vitals
          }" />
        </NuxtLink>
      </div>
    </div>

    <!-- CTA sticky (mobile only) -->
    <div class="fixed bottom-0 left-0 right-0 p-4 pb-9 bg-gradient-to-t from-[var(--color-cream)] via-[var(--color-cream)] to-transparent z-50 lg:hidden">
      <button
        class="w-full bg-[var(--color-terracotta-500)] text-[var(--color-cream)] text-sm font-bold py-3.5 rounded-[14px] flex items-center justify-center gap-2"
        @click="showContribute = true"
      >
        <UIcon name="lucide:sparkles" class="w-[18px] h-[18px]" />
        Donner mon avis
      </button>
    </div>

    <!-- Footer desktop -->
    <FabCarte />
    <DeskoverFooter class="hidden lg:block mt-12" />

  </div>

  <!-- Overlays — hors du v-if="place", client-only pour éviter les erreurs d'hydratation -->
  <ClientOnly>
    <!-- Contribute Bottom Sheet -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showContribute && place" class="fixed inset-0 z-[100] bg-black/50 lg:flex lg:items-center lg:justify-center" @click.self="showContribute = false">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="translate-y-full"
            enter-to-class="translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="translate-y-0"
            leave-to-class="translate-y-full"
          >
            <div v-if="showContribute" class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto lg:relative lg:max-w-[520px] lg:w-full lg:rounded-2xl lg:max-h-[85vh]">
              <!-- Handle -->
              <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full bg-[var(--color-parchment)]" />
              </div>

              <!-- Header -->
              <div class="flex items-center justify-between px-5 pb-3">
                <h3 class="font-display text-base text-[var(--color-espresso)] tracking-[0.05em]">Ton avis sur {{ place.name }}</h3>
                <button @click="showContribute = false" class="w-8 h-8 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
                  <UIcon name="lucide:x" class="w-4 h-4 text-[var(--color-steam)]" />
                </button>
              </div>

              <!-- Rating cards -->
              <div class="px-5 flex flex-col gap-3 pb-4">
                <!-- WiFi card -->
                <div class="bg-[var(--color-linen)] rounded-2xl p-4">
                  <div class="flex items-center gap-2.5 mb-3">
                    <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                      <UIcon name="lucide:wifi" class="w-5 h-5" :class="ratingIconActive('wifi')" />
                    </div>
                    <div class="flex-1">
                      <span class="text-[13px] font-bold text-[var(--color-espresso)]">WiFi</span>
                    </div>
                  </div>

                  <!-- NEARBY: speed test -->
                  <template v-if="isNearby">
                    <div class="h-[48px] flex items-center">
                      <button
                        v-if="!speedTestResult && !runningSpeedTest"
                        class="w-full h-[48px] rounded-xl text-[13px] font-semibold bg-white text-[var(--color-espresso)] flex items-center justify-center gap-2 active:scale-[0.98]"
                        @click="runSpeedTest"
                      >
                        <UIcon name="lucide:gauge" class="w-4 h-4 text-[var(--color-terracotta-500)]" />
                        Tester le débit
                      </button>
                      <div v-else-if="runningSpeedTest" class="w-full h-[48px] bg-white rounded-xl flex items-center justify-center gap-2.5">
                        <div class="w-5 h-5 rounded-full border-2 border-[var(--color-terracotta-500)] border-t-transparent animate-spin flex-shrink-0" />
                        <p class="text-xs font-semibold text-[var(--color-espresso)]">{{ speedTestProgress || 'Mesure en cours...' }}</p>
                      </div>
                      <div v-else-if="speedTestResult" class="w-full h-[48px] bg-white rounded-xl px-3 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex flex-col items-center justify-center flex-shrink-0" :class="speedTestResult.download >= 25 ? 'bg-[#e8f5e9]' : speedTestResult.download >= 10 ? 'bg-[#fff8e1]' : 'bg-[#fce4ec]'">
                          <span class="font-mono text-sm font-bold leading-none" :class="speedTestResult.download >= 25 ? 'text-[var(--color-monstera)]' : speedTestResult.download >= 10 ? 'text-[var(--color-edison)]' : 'text-[var(--color-terracotta-500)]'">{{ speedTestResult.download }}</span>
                          <span class="font-mono text-[7px] text-[var(--color-steam)]">Mbps</span>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-bold" :class="speedTestResult.download >= 25 ? 'text-[var(--color-monstera)]' : speedTestResult.download >= 10 ? 'text-[var(--color-edison)]' : 'text-[var(--color-terracotta-500)]'">{{ ratings.wifi }}</p>
                          <p class="font-mono text-[9px] text-[var(--color-steam)] truncate">↓ {{ speedTestResult.download }} · ↑ {{ speedTestResult.upload }} · {{ speedTestResult.ping }}ms</p>
                        </div>
                        <button @click="runSpeedTest" class="w-8 h-8 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0">
                          <UIcon name="lucide:refresh-cw" class="w-3.5 h-3.5 text-[var(--color-steam)]" />
                        </button>
                      </div>
                    </div>
                    <p v-if="!speedTestResult && !runningSpeedTest" class="text-[10px] text-[var(--color-steam)] text-center mt-1.5 italic">Vérifie que tu es sur le WiFi du lieu, pas en partage de co.</p>
                    <label class="flex items-center gap-2 mt-2.5 cursor-pointer">
                      <input v-model="wifiCaptif" type="checkbox" class="w-4 h-4 rounded border-[var(--color-steam)] text-[var(--color-terracotta-500)] focus:ring-[var(--color-terracotta-500)]">
                      <span class="text-[11px] text-[var(--color-roast)]">WiFi avec portail captif (email ou identifiant requis)</span>
                    </label>
                  </template>

                  <!-- NOT NEARBY: manual buttons -->
                  <template v-else>
                    <div class="flex gap-2">
                      <button
                        v-for="opt in ['Faible', 'Bon', 'Rapide']" :key="opt"
                        class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                        :class="ratingBtnClass('wifi', opt, ratings.wifi)"
                        @click="ratings.wifi = ratings.wifi === opt ? '' : opt"
                      >{{ opt }}</button>
                    </div>
                    <p class="text-[10px] text-[var(--color-steam)] text-center mt-2 italic">N'indique la qualité du WiFi que si tu as vraiment testé</p>
                    <label class="flex items-center gap-2 mt-2.5 cursor-pointer">
                      <input v-model="wifiCaptif" type="checkbox" class="w-4 h-4 rounded border-[var(--color-steam)] text-[var(--color-terracotta-500)] focus:ring-[var(--color-terracotta-500)]">
                      <span class="text-[11px] text-[var(--color-roast)]">WiFi avec portail captif (email ou identifiant requis)</span>
                    </label>
                  </template>
                </div>

                <!-- Prises card -->
                <div class="bg-[var(--color-linen)] rounded-2xl p-4">
                  <div class="flex items-center gap-2.5 mb-3">
                    <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                      <UIcon name="lucide:zap" class="w-5 h-5" :class="ratingIconActive('prises')" />
                    </div>
                    <div>
                      <span class="text-[13px] font-bold text-[var(--color-espresso)]">Prises</span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      v-for="opt in ['Aucune', 'Quelques-unes', 'Plein']" :key="opt"
                      class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      :class="ratingBtnClass('prises', opt, ratings.prises)"
                      @click="ratings.prises = ratings.prises === opt ? '' : opt"
                    >{{ opt }}</button>
                  </div>
                </div>

                <!-- Food card -->
                <div class="bg-[var(--color-linen)] rounded-2xl p-4">
                  <div class="flex items-center gap-2.5 mb-3">
                    <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                      <UIcon name="lucide:utensils" class="w-5 h-5" :class="ratingIconActive('food')" />
                    </div>
                    <div>
                      <span class="text-[13px] font-bold text-[var(--color-espresso)]">Food</span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      v-for="opt in ['Boissons', 'Snacks', 'Repas']" :key="opt"
                      class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      :class="ratingBtnClass('food', opt, ratings.food)"
                      @click="ratings.food = ratings.food === opt ? '' : opt"
                    >{{ opt }}</button>
                  </div>
                </div>

                <!-- Style card -->
                <div class="bg-[var(--color-linen)] rounded-2xl p-4">
                  <div class="flex items-center gap-2.5 mb-3">
                    <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                      <UIcon name="lucide:sparkles" class="w-5 h-5" :class="ratingIconActive('style')" />
                    </div>
                    <div>
                      <span class="text-[13px] font-bold text-[var(--color-espresso)]">Style</span>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      v-for="opt in ['Cozy', 'Design', 'Canon']" :key="opt"
                      class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
                      :class="ratingBtnClass('style', opt, ratings.style)"
                      @click="ratings.style = ratings.style === opt ? '' : opt"
                    >{{ opt }}</button>
                  </div>
                  <p class="text-[10px] text-[var(--color-steam)] text-center mt-2 italic">Ne coche rien si tu penses que rien ne correspond</p>
                </div>
              </div>

              <!-- Submit -->
              <div class="px-5 pb-10">
                <p v-if="submitError" class="text-center text-sm text-[var(--color-terracotta-500)] mb-3">
                  {{ submitError }}
                </p>
                <button
                  class="w-full py-3.5 rounded-[14px] text-sm font-bold transition-all duration-200"
                  :class="hasRated ? 'bg-[var(--color-terracotta-500)] text-[var(--color-cream)]' : 'bg-[var(--color-parchment)] text-[var(--color-steam)]'"
                  :disabled="!hasRated"
                  @click="submitRating"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Share toast -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div v-if="showShareToast" class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[var(--color-espresso)] text-white text-[13px] font-semibold px-5 py-3 rounded-full shadow-lg flex items-center gap-2">
        <UIcon name="lucide:check" class="w-4 h-4" />
        Lien copié !
      </div>
    </Transition>

    <!-- Speed Test Bottom Sheet -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showSpeedTest && place" class="fixed inset-0 z-[100] bg-black/50" @click.self="showSpeedTest = false">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="translate-y-full"
            enter-to-class="translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="translate-y-0"
            leave-to-class="translate-y-full"
          >
            <div v-if="showSpeedTest" class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <!-- Handle -->
              <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full bg-[var(--color-parchment)]" />
              </div>

              <!-- Header -->
              <div class="flex items-center justify-between px-5 pb-4">
                <h3 class="font-display text-base text-[var(--color-espresso)] tracking-[0.05em]">SPEED TEST WIFI</h3>
                <button @click="showSpeedTest = false" class="w-8 h-8 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
                  <UIcon name="lucide:x" class="w-4 h-4 text-[var(--color-steam)]" />
                </button>
              </div>

              <!-- WITH measurement -->
              <div v-if="place.speedTest" class="flex flex-col items-center px-5 pt-2 pb-4">
                <div class="w-[150px] h-[150px] rounded-full bg-[var(--color-linen)] flex flex-col items-center justify-center">
                  <span class="font-mono text-[44px] font-bold text-[var(--color-terracotta-500)] leading-none">{{ place.speedTest.download }}</span>
                  <span class="font-mono text-sm text-[var(--color-steam)] mt-1">Mbps</span>
                </div>

                <p class="font-mono text-[13px] text-[var(--color-steam)] mt-4">
                  ↓ {{ place.speedTest.download }} Mbps · ↑ {{ place.speedTest.upload }} Mbps · Ping {{ place.speedTest.ping }}ms
                </p>

                <div class="w-full bg-[var(--color-linen)] rounded-2xl p-4 mt-5">
                  <p class="text-sm font-bold text-[var(--color-monstera)]">{{ place.speedTest.label }}</p>
                  <p class="text-[13px] text-[var(--color-roast)] leading-relaxed mt-1">
                    {{ place.speedTest.description }}
                  </p>
                </div>

                <div v-if="place.signals.includes('wifi_captif')" class="w-full flex items-center gap-2 mt-3 px-1">
                  <UIcon name="lucide:shield-alert" class="w-4 h-4 text-[var(--color-edison)] flex-shrink-0" />
                  <p class="text-xs text-[var(--color-roast)]">Portail captif : email ou identifiant requis pour se connecter</p>
                </div>

                <div class="w-full h-1 bg-[var(--color-parchment)] rounded-full mt-4">
                  <div class="h-full bg-[var(--color-monstera)] rounded-full" :style="{ width: place.speedTest.quality + '%' }" />
                </div>

                <p class="text-xs text-[var(--color-steam)] mt-2">
                  Dernière mesure {{ place.speedTest.ago }}
                  · {{ place.speedTestCount || 1 }} mesure{{ (place.speedTestCount || 1) > 1 ? 's' : '' }}
                </p>

                <button
                  v-if="isNearby"
                  class="w-full bg-[var(--color-espresso)] text-[var(--color-cream)] text-sm font-bold py-3.5 rounded-[14px] mt-5"
                >
                  Lancer un nouveau test
                </button>

                <button @click="showSpeedTest = false" class="text-sm font-semibold text-[var(--color-terracotta-500)] mt-4 pb-2">
                  Fermer
                </button>
              </div>

              <!-- NO measurement yet -->
              <div v-else class="flex flex-col items-center px-5 pt-2 pb-8">
                <div class="w-[150px] h-[150px] rounded-full bg-[var(--color-linen)] flex flex-col items-center justify-center">
                  <UIcon name="lucide:radar" class="w-10 h-10 text-[var(--color-steam)]" />
                </div>

                <template v-if="place.signals.includes('wifi')">
                  <p class="text-[15px] font-semibold text-[var(--color-espresso)] mt-5">WiFi disponible</p>
                  <p class="text-[13px] text-[var(--color-steam)] text-center mt-2 leading-relaxed px-4">
                    Signalé par nos sources mais pas encore mesuré par Deskover. Sois le premier !
                  </p>
                </template>
                <template v-else>
                  <p class="text-[15px] font-semibold text-[var(--color-espresso)] mt-5">Pas encore de mesure</p>
                  <p class="text-[13px] text-[var(--color-steam)] text-center mt-2 leading-relaxed px-4">
                    Sois le premier à tester le WiFi de ce lieu et aide la communauté !
                  </p>
                </template>

                <button
                  v-if="isNearby"
                  class="w-full bg-[var(--color-terracotta-500)] text-[var(--color-cream)] text-sm font-bold py-3.5 rounded-[14px] mt-6"
                >
                  Lancer le premier test
                </button>
                <p v-else class="text-xs text-[var(--color-steam)] mt-5 text-center">
                  Tu dois être sur place pour lancer un test WiFi
                </p>

                <button @click="showSpeedTest = false" class="text-sm font-semibold text-[var(--color-terracotta-500)] mt-4 pb-2">
                  Fermer
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>

  <!-- Modal carte -->
  <div
    v-if="showMapModal"
    class="fixed inset-0 z-[200] bg-black/60 flex items-end lg:items-center lg:justify-center"
    @click.self="showMapModal = false"
  >
    <div class="w-full bg-white rounded-t-3xl lg:rounded-2xl lg:max-w-2xl lg:w-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-parchment)]">
        <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.05em]">{{ place?.name }}</span>
        <button @click="showMapModal = false" class="w-8 h-8 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
          <UIcon name="lucide:x" class="w-4 h-4 text-[var(--color-steam)]" />
        </button>
      </div>
      <div ref="modalMapContainer" class="w-full h-[380px] lg:h-[460px]" />
      <div class="px-5 py-4 flex flex-col gap-3">
        <!-- Route info -->
        <div v-if="routeLoading" class="flex items-center gap-2 text-sm text-[var(--color-steam)]">
          <div class="w-4 h-4 border-2 border-[var(--color-terracotta-500)] border-t-transparent rounded-full animate-spin" />
          Calcul de l'itinéraire...
        </div>
        <div v-else-if="routeInfo" class="flex items-center gap-3 text-sm">
          <div class="flex items-center gap-1.5 text-[var(--color-espresso)] font-semibold">
            <UIcon name="lucide:footprints" class="w-4 h-4 text-[var(--color-terracotta-500)]" />
            {{ routeInfo.duration }}
          </div>
          <span class="text-[var(--color-steam)]">·</span>
          <span class="text-[var(--color-roast)]">{{ routeInfo.distance }}</span>
        </div>
        <a
          :href="`https://maps.apple.com/?daddr=${place?.latitude},${place?.longitude}&dirflg=w`"
          target="_blank"
          class="block bg-[var(--color-espresso)] text-[var(--color-cream)] text-sm font-semibold py-3 rounded-[14px] text-center"
        >
          Ouvrir l'itinéraire
        </a>
      </div>
    </div>
  </div>

  <!-- Lightbox -->
  <div
    v-if="lightboxOpen"
    class="fixed inset-0 z-[200] bg-black flex flex-col"
    @touchstart="touchStartX = $event.touches[0].clientX"
    @touchend="$event.changedTouches[0].clientX - touchStartX > 50 ? lightboxPrev() : $event.changedTouches[0].clientX - touchStartX < -50 ? lightboxNext() : null"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 flex-shrink-0">
      <span class="text-white/60 text-sm font-medium">{{ lightboxIndex + 1 }} / {{ allPhotos.length }}</span>
      <button @click="lightboxOpen = false" class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
        <UIcon name="lucide:x" class="w-5 h-5 text-white" />
      </button>
    </div>

    <!-- Image + flèches -->
    <div class="flex-1 relative flex items-center justify-center px-4 min-h-0" @click="lightboxOpen = false">
      <img
        :src="allPhotos[lightboxIndex]"
        :alt="`Photo ${lightboxIndex + 1} — ${place?.name}`"
        class="max-w-full max-h-full object-contain rounded-lg"
        @click.stop
      />
      <template v-if="allPhotos.length > 1">
        <button @click.stop="lightboxPrev" class="absolute left-2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <UIcon name="lucide:chevron-left" class="w-5 h-5 text-white" />
        </button>
        <button @click.stop="lightboxNext" class="absolute right-2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <UIcon name="lucide:chevron-right" class="w-5 h-5 text-white" />
        </button>
      </template>
    </div>

    <!-- Dots -->
    <div v-if="allPhotos.length > 1" class="flex justify-center gap-1.5 py-4 flex-shrink-0">
      <div
        v-for="(_, i) in allPhotos"
        :key="i"
        class="h-1.5 rounded-full transition-all duration-200"
        :class="i === lightboxIndex ? 'bg-white w-4' : 'bg-white/30 w-1.5'"
      />
    </div>
  </div>

  </div>
</template>
