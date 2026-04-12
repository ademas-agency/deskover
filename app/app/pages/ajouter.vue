<script setup lang="ts">
const client = useSupabaseClient()
const router = useRouter()

const form = reactive({
  name: '',
  address: '',
  city: '',
  category: '' as string,
  wifi: '',
  power: '',
  pricing: '',
  mood: '',
})

const submitting = ref(false)
const error = ref('')
const step = ref(1) // 1 = infos, 2 = critères, 3 = envoyé
const createdPlaceId = ref<string | null>(null)
const emailNotify = ref('')
const emailSaved = ref(false)
const emailSaving = ref(false)
const emailError = ref('')

const categories = [
  { value: 'cafe', label: 'Café', icon: 'lucide:coffee' },
  { value: 'coffee_shop', label: 'Coffee Shop', icon: 'lucide:cup-soda' },
  { value: 'coworking', label: 'Coworking', icon: 'lucide:building-2' },
  { value: 'tiers_lieu', label: 'Tiers-lieu', icon: 'lucide:home' },
]

// BAN autocomplete
const suggestions = ref<any[]>([])
const showSuggestions = ref(false)
let debounceTimer: ReturnType<typeof setTimeout>

async function onAddressInput() {
  const q = form.address.trim()
  if (q.length < 3) { suggestions.value = []; showSuggestions.value = false; return }

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`)
      const data = await res.json()
      suggestions.value = (data.features || []).map((f: any) => ({
        label: f.properties.label,
        city: f.properties.city,
        postcode: f.properties.postcode,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }))
      showSuggestions.value = suggestions.value.length > 0
    } catch { suggestions.value = [] }
  }, 300)
}

const selectedCoords = ref<{ lat: number; lng: number } | null>(null)

function selectAddress(s: any) {
  form.address = s.label
  form.city = s.city
  selectedCoords.value = { lat: s.lat, lng: s.lng }
  showSuggestions.value = false
}

function canGoStep2() {
  return form.name.trim() && form.address.trim() && form.category
}

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getFingerprint() {
  const stored = localStorage.getItem('deskover_fp')
  if (stored) return stored
  const fp = crypto.randomUUID()
  localStorage.setItem('deskover_fp', fp)
  return fp
}

function handleRatingSubmit(ratings: { wifi: string; prises: string; pricing: string; mood: string }, speedTest: any) {
  form.wifi = ratings.wifi
  form.power = ratings.prises
  form.pricing = ratings.pricing
  form.mood = ratings.mood
  submit()
}

async function submit() {
  submitting.value = true
  error.value = ''

  const signals: string[] = []
  if (form.wifi === 'Rapide' || form.wifi === 'Bon') signals.push('wifi')
  if (form.power === 'Plein') signals.push('prises')
  if (form.pricing === 'Payant') signals.push('payant')
  if (form.mood === 'Calme') signals.push('calme')

  const citySlug = slugify(form.city)

  const { data, error: err } = await client.from('places').insert({
    name: form.name.trim(),
    slug: slugify(form.name) + '-' + citySlug,
    address: form.address,
    city: form.city,
    city_key: citySlug,
    latitude: selectedCoords.value?.lat,
    longitude: selectedCoords.value?.lng,
    location: selectedCoords.value ? `SRID=4326;POINT(${selectedCoords.value.lng} ${selectedCoords.value.lat})` : null,
    place_type: form.category,
    signals,
    status: 'pending',
    source: 'user',
  }).select('id').single()

  if (err) {
    console.error('[ajouter] insert place error:', err)
    error.value = `Erreur : ${err.message || 'inconnue'}`
    submitting.value = false
    return
  }

  createdPlaceId.value = data?.id || null

  // Enregistrer les critères donnés par le créateur (marqué source='creation' pour
  // ne pas polluer la vue Avis du BO)
  if (data?.id && (form.wifi || form.power || form.pricing || form.mood)) {
    const wifiMap: Record<string, number> = { 'Faible': 1, 'Bon': 2, 'Rapide': 3 }
    const powerMap: Record<string, number> = { 'Aucune': 1, 'Quelques-unes': 2, 'Plein': 3 }
    const pricingMap: Record<string, number> = { 'Gratuit': 1, 'Payant': 2 }
    const moodMap: Record<string, number> = { 'Calme': 1, 'Animé': 2 }

    await client.from('ratings').insert({
      place_id: data.id,
      fingerprint: getFingerprint(),
      wifi: form.wifi ? wifiMap[form.wifi] : null,
      power: form.power ? powerMap[form.power] : null,
      pricing: form.pricing ? pricingMap[form.pricing] : null,
      mood: form.mood ? moodMap[form.mood] : null,
      source: 'creation',
    })
  }

  submitting.value = false
  step.value = 3
}

async function saveEmail() {
  emailError.value = ''
  const email = emailNotify.value.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.value = 'Email invalide'
    return
  }
  if (!createdPlaceId.value) return

  emailSaving.value = true
  const { error: err } = await client
    .from('places')
    .update({ submitter_email: email })
    .eq('id', createdPlaceId.value)

  emailSaving.value = false
  if (err) {
    emailError.value = 'Oups, une erreur est survenue.'
    return
  }
  emailSaved.value = true
}

useSeoMeta({
  title: 'Ajouter un lieu — Deskover',
  ogTitle: 'Ajouter un lieu — Deskover',
  description: 'Tu connais un bon spot pour bosser ? Ajoute-le en 30 secondes sur Deskover et aide la communauté.',
  ogDescription: 'Tu connais un bon spot pour bosser ? Ajoute-le en 30 secondes sur Deskover.',
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)] pb-24 lg:pb-0">

    <!-- Header mobile -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 pt-safe flex justify-between items-center lg:hidden">
      <button @click="router.back()" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </button>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">AJOUTER UN LIEU</span>
      <div class="w-6" />
    </div>

    <!-- Close button desktop -->
    <div class="hidden lg:flex justify-end pt-6 lg:max-w-[680px] lg:mx-auto lg:px-8">
      <button @click="router.back()" class="w-10 h-10 rounded-full bg-[var(--color-parchment)] flex items-center justify-center hover:bg-[var(--color-steam)]/20 transition-colors">
        <UIcon name="lucide:x" class="w-5 h-5 text-[var(--color-espresso)]" />
      </button>
    </div>

    <!-- Step 1: Infos -->
    <div v-if="step === 1" class="px-5 pt-6 lg:pt-0 lg:max-w-[680px] lg:mx-auto lg:px-8">
      <h1 class="font-display text-[22px] text-[var(--color-espresso)]">Tu connais un bon spot ?</h1>
      <p class="text-[14px] text-[var(--color-roast)] mt-2">Ajoute-le en 30 secondes.</p>

      <!-- Nom -->
      <div class="mt-6">
        <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Nom du lieu</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="Ex: Café des Amis"
          class="w-full mt-2 bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)]"
        >
      </div>

      <!-- Adresse -->
      <div class="mt-5 relative">
        <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Adresse</label>
        <input
          v-model="form.address"
          type="text"
          placeholder="Commence à taper l'adresse..."
          class="w-full mt-2 bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)]"
          @input="onAddressInput"
          @focus="showSuggestions = suggestions.length > 0"
        >
        <div v-if="showSuggestions" class="absolute left-0 right-0 mt-1 bg-white rounded-2xl shadow-[0_8px_24px_rgba(44,40,37,0.12)] overflow-hidden z-20">
          <button
            v-for="s in suggestions"
            :key="s.label"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-linen)] text-left"
            @click="selectAddress(s)"
          >
            <UIcon name="lucide:map-pin" class="w-4 h-4 text-[var(--color-steam)]" />
            <span class="text-[13px] text-[var(--color-espresso)]">{{ s.label }}</span>
          </button>
        </div>
      </div>

      <!-- Catégorie -->
      <div class="mt-5">
        <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Type de lieu</label>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button
            v-for="cat in categories"
            :key="cat.value"
            class="flex flex-col items-center justify-center gap-1.5 rounded-2xl text-[12px] font-semibold transition-all h-[72px]"
            :class="form.category === cat.value
              ? 'bg-[var(--color-terracotta-500)] text-white'
              : 'bg-white text-[var(--color-roast)] shadow-[0_2px_8px_rgba(44,40,37,0.06)]'"
            @click="form.category = cat.value"
          >
            <UIcon :name="cat.icon" class="w-5 h-5" />
            {{ cat.label }}
          </button>
        </div>
      </div>

    </div>

    <!-- CTA fixe en bas (étape 1) -->
    <div v-if="step === 1" class="fixed bottom-0 left-0 right-0 p-4 pb-9 bg-gradient-to-t from-[var(--color-cream)] via-[var(--color-cream)] to-transparent z-40 lg:static lg:mt-8 lg:p-0 lg:bg-transparent lg:pb-0 lg:max-w-[680px] lg:mx-auto lg:px-8">
      <button
        class="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
        :class="canGoStep2() ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-[var(--color-parchment)] text-[var(--color-steam)]'"
        :disabled="!canGoStep2()"
        @click="step = 2"
      >
        Suivant
      </button>
    </div>

    <!-- Step 2: Critères (composant partagé avec "Donner mon avis") -->
    <div v-if="step === 2">
      <RatingSheet
        :place-name="form.name"
        :fullscreen="true"
        @submit="handleRatingSubmit"
      >
        <template #error>
          <p v-if="error" class="text-center text-sm text-[var(--color-terracotta-500)] mb-3">{{ error }}</p>
        </template>
        <template #submit-label>
          {{ submitting ? 'Envoi...' : 'Ajouter ce lieu' }}
        </template>
        <template #footer>
          <button class="w-full mt-3 py-2 text-sm text-[var(--color-steam)]" @click="step = 1">
            Retour
          </button>
        </template>
      </RatingSheet>
    </div>

    <!-- Step 3: Confirmation -->
    <div v-if="step === 3" class="px-5 pt-16 text-center lg:max-w-[680px] lg:mx-auto lg:px-8">
      <UIcon name="lucide:check-circle" class="w-12 h-12 text-[var(--color-monstera)] mx-auto" />
      <h2 class="font-display text-[22px] text-[var(--color-espresso)] mt-4">Merci pour ta suggestion</h2>
      <p class="text-[14px] text-[var(--color-roast)] mt-2 leading-relaxed">
        On vérifie les infos et {{ form.name }} sera visible très vite.
      </p>

      <!-- Email notification -->
      <div v-if="!emailSaved" class="mt-8 bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(44,40,37,0.06)] text-left">
        <p class="text-[14px] font-semibold text-[var(--color-espresso)]">
          Donne-nous ton email, on te prévient quand c'est validé.
        </p>
        <div class="flex gap-2 mt-3">
          <input
            v-model="emailNotify"
            type="email"
            placeholder="ton@email.com"
            class="flex-1 bg-[var(--color-linen)] rounded-xl px-4 py-3 text-[14px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none"
            @keydown.enter="saveEmail"
          >
          <button
            class="px-4 py-3 rounded-xl bg-[var(--color-terracotta-500)] text-white text-sm font-bold disabled:opacity-50"
            :disabled="emailSaving || !emailNotify"
            @click="saveEmail"
          >
            {{ emailSaving ? '...' : 'OK' }}
          </button>
        </div>
        <p v-if="emailError" class="text-xs text-[var(--color-terracotta-500)] mt-2">{{ emailError }}</p>
      </div>
      <div v-else class="mt-8 flex items-center justify-center gap-2 text-[14px] text-[var(--color-monstera)]">
        <UIcon name="lucide:check" class="w-4 h-4" />
        C'est noté, on te prévient par email.
      </div>
    </div>
  </div>
</template>
