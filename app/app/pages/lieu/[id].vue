<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { getById } = usePlaces()

// Back navigation: use browser history to go back properly
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const { data: place, status, refresh: refreshPlace } = await useAsyncData(
  `lieu-${route.params.id}`,
  () => getById(route.params.id as string)
)
const loading = computed(() => status.value === 'pending')
const showSpeedTest = ref(false)
const showContribute = ref(false)
const isNearby = ref(false)
const userCoords = ref<{ lat: number; lng: number } | null>(null)
const runningSpeedTest = ref(false)
const speedTestResult = ref<{ download: number; upload: number; ping: number } | null>(null)

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
  return dayOrder.map(d => ({
    day: dayLabels[d],
    hours: place.value!.openingHours![d] || 'Fermé',
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

  submitSuccess.value = true
  showContribute.value = false
  ratings.wifi = ''
  ratings.prises = ''
  ratings.food = ''
  ratings.style = ''

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
const currentPhoto = ref(0)

const allPhotos = computed(() => {
  if (!place.value) return []
  const photos: string[] = []
  if (place.value.photoUrl) photos.push(place.value.photoUrl)
  if (place.value.photos?.length) photos.push(...place.value.photos)
  return photos.length ? photos : ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop']
})

let autoSlide: ReturnType<typeof setInterval> | null = null

function startAutoSlide() {
  if (allPhotos.value.length <= 1) return
  autoSlide = setInterval(() => {
    currentPhoto.value = (currentPhoto.value + 1) % allPhotos.value.length
  }, 4000)
}

onMounted(() => startAutoSlide())
onUnmounted(() => { if (autoSlide) clearInterval(autoSlide) })

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
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
  <div v-if="place" class="pb-28 lg:pb-0">

    <!-- Photo hero / carrousel -->
    <div class="relative h-[260px] lg:h-[400px] overflow-hidden">
      <img
        :src="allPhotos[currentPhoto]"
        :alt="place.name"
        class="w-full h-full object-cover transition-opacity duration-300 rounded-b-[24px] lg:rounded-b-none"
        :key="currentPhoto"
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

      <!-- Dots -->
      <div v-if="allPhotos.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        <button
          v-for="(_, i) in allPhotos"
          :key="i"
          class="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
          :class="i === currentPhoto ? 'bg-white w-3' : 'bg-white/40 w-1.5'"
          @click="currentPhoto = i; if (autoSlide) { clearInterval(autoSlide); startAutoSlide() }"
        />
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
          <PlaceVitals :vitals="place.vitals" size="lg" @vital-click="onVitalClick" />
        </div>

        <!-- Bouton itinéraire (mobile only) -->
        <div class="px-4 mt-5 lg:hidden">
          <a
            :href="place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`"
            target="_blank"
            class="block bg-[var(--color-espresso)] text-[var(--color-cream)] text-sm font-semibold py-3.5 rounded-[14px] text-center"
          >
            <UIcon name="lucide:navigation" class="w-4 h-4 inline mr-2" />
            Itinéraire
          </a>
        </div>

        <!-- Infos (mobile only - desktop dans sidebar) -->
        <div class="px-4 mt-5 lg:hidden">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-3">INFOS</div>
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-3">
              <UIcon name="lucide:map-pin" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
              <span class="text-sm text-[var(--color-roast)]">{{ place.address }}</span>
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
        <div class="text-center py-5 text-[var(--color-steam)] text-xl tracking-[4px]">· · ·</div>

        <!-- Vu dans -->
        <div v-if="place.blogMentions.length" class="px-4 lg:px-0">
          <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-2.5">VU DANS</div>
          <div class="flex flex-col gap-2.5">
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
              <div class="flex items-center gap-3">
                <UIcon name="lucide:map-pin" class="w-[18px] h-[18px] text-[var(--color-steam)] flex-shrink-0" />
                <span class="text-sm text-[var(--color-roast)]">{{ place.address }}</span>
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

            <!-- Bouton itinéraire desktop -->
            <a
              :href="place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`"
              target="_blank"
              class="block bg-[var(--color-espresso)] text-[var(--color-cream)] text-sm font-semibold py-3 rounded-[14px] text-center mt-5"
            >
              <UIcon name="lucide:navigation" class="w-4 h-4 inline mr-2" />
              Itinéraire
            </a>
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
        <div v-if="showContribute && place" class="fixed inset-0 z-[100] bg-black/50" @click.self="showContribute = false">
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="translate-y-full"
            enter-to-class="translate-y-0"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="translate-y-0"
            leave-to-class="translate-y-full"
          >
            <div v-if="showContribute" class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto">
              <!-- Handle -->
              <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full bg-[var(--color-parchment)]" />
              </div>

              <!-- Header -->
              <div class="flex items-center justify-between px-5 pb-3">
                <h3 class="font-display text-base text-[var(--color-espresso)] tracking-[0.05em]">{{ place.name }}</h3>
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

                <div class="w-full h-1 bg-[var(--color-parchment)] rounded-full mt-4">
                  <div class="h-full bg-[var(--color-monstera)] rounded-full" :style="{ width: place.speedTest.quality + '%' }" />
                </div>

                <p class="text-xs text-[var(--color-steam)] mt-2">Dernière mesure {{ place.speedTest.ago }}</p>

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

                <p class="text-[15px] font-semibold text-[var(--color-espresso)] mt-5">Pas encore de mesure</p>
                <p class="text-[13px] text-[var(--color-steam)] text-center mt-2 leading-relaxed px-4">
                  Sois le premier à tester le WiFi de ce lieu et aide la communauté !
                </p>

                <button
                  v-if="isNearby"
                  class="w-full bg-[var(--color-terracotta-500)] text-[var(--color-cream)] text-sm font-bold py-3.5 rounded-[14px] mt-6"
                >
                  Lancer le premier test
                </button>
                <p v-else class="text-xs text-[var(--color-steam)] mt-5 text-center">
                  Rends-toi sur place pour lancer un test WiFi
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
  </div>
</template>
