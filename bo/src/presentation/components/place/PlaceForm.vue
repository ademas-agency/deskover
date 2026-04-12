<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

import type { Place, PlaceCategory } from '../../../core/domain/entities/Place'
import { CATEGORY_LABELS, SIGNAL_LABELS } from '../../../core/domain/entities/Place'
import { supabase } from '../../../infrastructure/api/client'
import BaseInput from '../ui/BaseInput.vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseCard from '../ui/BaseCard.vue'
import BaseBadge from '../ui/BaseBadge.vue'
import { Save, ExternalLink, Star, Clock, Globe, Phone, Instagram, Upload, Trash2, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ImageIcon, Crown, CheckCircle } from 'lucide-vue-next'

const BUCKET = 'place-photos'
const SUPABASE_STORAGE_BASE = `https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/${BUCKET}`

const props = withDefaults(defineProps<{
  place: Place
  saving?: boolean
}>(), {
  saving: false,
})

const emit = defineEmits<{
  save: [place: Place]
}>()

const form = ref<Place>({ ...props.place })
const uploading = ref(false)
const photoError = ref('')

// --- Avis utilisateurs ---
interface PlaceRating {
  id: string
  fingerprint: string
  wifi: number | null
  power: number | null
  // Nouvelles colonnes
  pricing: number | null
  mood: number | null
  created_at: string
}

const placeRatings = ref<PlaceRating[]>([])
const ratingsLoading = ref(false)
const ratingsError = ref('')

// --- Speed tests ---
interface SpeedTest {
  id: string
  fingerprint: string | null
  download: number
  upload: number
  ping: number
  created_at: string
}

const speedTests = ref<SpeedTest[]>([])
const speedTestsLoading = ref(false)
const speedTestsError = ref('')

const speedTestsByUser = computed(() => {
  // Regroupe par fingerprint, ordonne les groupes par date du plus récent test
  const groups = new Map<string, SpeedTest[]>()
  for (const t of speedTests.value) {
    const key = t.fingerprint || '__anon__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }
  return Array.from(groups.entries())
    .map(([fingerprint, tests]) => ({
      fingerprint,
      tests: tests.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
      latest: tests[0].created_at,
    }))
    .sort((a, b) => +new Date(b.latest) - +new Date(a.latest))
})

async function loadSpeedTests(placeId: string) {
  if (!placeId) return
  speedTestsLoading.value = true
  speedTestsError.value = ''
  const { data, error } = await supabase
    .from('speed_tests')
    .select('id, fingerprint, download, upload, ping, created_at')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })

  if (error) {
    speedTestsError.value = error.message
    speedTests.value = []
  } else {
    speedTests.value = (data as any) || []
  }
  speedTestsLoading.value = false
}

async function deleteSpeedTest(id: string) {
  if (!confirm('Supprimer ce speed test ?')) return
  await supabase.from('speed_tests').delete().eq('id', id)
  speedTests.value = speedTests.value.filter(t => t.id !== id)
}

function speedQualityClass(download: number): string {
  if (download >= 25) return 'bg-monstera/15 text-monstera'
  if (download >= 10) return 'bg-edison/15 text-edison'
  return 'bg-red-50 text-red-600'
}

function shortFingerprint(fp: string | null): string {
  if (!fp) return 'Anonyme'
  return fp.slice(0, 8)
}

const WIFI_LABELS: Record<number, string> = { 1: 'Faible', 2: 'Bon', 3: 'Rapide' }
const POWER_LABELS: Record<number, string> = { 1: 'Aucune', 2: 'Quelques-unes', 3: 'Plein' }
const PRICING_LABELS: Record<number, string> = { 1: 'Gratuit', 2: 'Payant' }
const MOOD_LABELS: Record<number, string> = { 1: 'Calme', 2: 'Animé' }

async function loadRatings(placeId: string) {
  if (!placeId) return
  ratingsLoading.value = true
  ratingsError.value = ''
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })

  if (error) {
    ratingsError.value = error.message
    placeRatings.value = []
  } else {
    placeRatings.value = (data as any) || []
  }
  ratingsLoading.value = false
}

async function deleteRating(id: string) {
  if (!confirm('Supprimer cet avis ?')) return
  await supabase.from('ratings').delete().eq('id', id)
  placeRatings.value = placeRatings.value.filter(r => r.id !== id)
}

function ratingValueColor(v: number | null): string {
  if (v === null || v === undefined) return 'bg-steam/10 text-steam'
  if (v >= 3) return 'bg-monstera/15 text-monstera'
  if (v === 2) return 'bg-edison/15 text-edison'
  return 'bg-red-50 text-red-600'
}

function ratingTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days}j`
  return `il y a ${Math.floor(days / 30)}mois`
}

const conditionsEditor = useEditor({
  extensions: [StarterKit],
  content: props.place.conditions || '',
  onUpdate: ({ editor }) => {
    form.value.conditions = editor.getHTML()
  },
})

const foodEditor = useEditor({
  extensions: [StarterKit],
  content: props.place.food_description || '',
  onUpdate: ({ editor }) => {
    form.value.food_description = editor.getHTML()
  },
})

watch(() => props.place, (newVal) => {
  form.value = { ...newVal }
  if (conditionsEditor.value) {
    conditionsEditor.value.commands.setContent(newVal.conditions || '')
  }
  if (foodEditor.value) {
    foodEditor.value.commands.setContent(newVal.food_description || '')
  }
  if (newVal.id) {
    loadRatings(newVal.id)
    loadSpeedTests(newVal.id)
  }
}, { deep: true, immediate: true })

const allSignals = [
  'wifi', 'wifi_captif', 'prises', 'calme', 'food', 'terrasse', 'laptop_friendly',
  'pas_cher', 'grandes_tables', 'ambiance', 'silencieux', 'musique', 'lumineux', 'insolite',
  'payant', 'reservation',
]

const categories: PlaceCategory[] = ['cafe', 'coffee_shop', 'coworking', 'tiers_lieu']

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const currentPhotoUrl = computed(() => {
  if (form.value.photo_storage_path) {
    return `${SUPABASE_STORAGE_BASE}/${form.value.photo_storage_path}`
  }
  return form.value.photo_url || null
})

function getStoragePath(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  return `${form.value.city_key}/${slugify(form.value.name)}.${ext}`
}

async function handlePhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    photoError.value = 'Le fichier doit être une image'
    return
  }

  uploading.value = true
  photoError.value = ''

  try {
    // Delete old photo if exists
    if (form.value.photo_storage_path) {
      await supabase.storage.from(BUCKET).remove([form.value.photo_storage_path])
    }

    const storagePath = getStoragePath(file)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (error) throw error

    form.value.photo_storage_path = storagePath
    form.value.photo_url = ''
  } catch (e: any) {
    photoError.value = e.message || 'Erreur lors de l\'upload'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function handlePhotoReplace(event: Event) {
  await handlePhotoUpload(event)
}

async function handlePhotoDelete() {
  if (!form.value.photo_storage_path) {
    form.value.photo_url = ''
    return
  }

  uploading.value = true
  photoError.value = ''

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([form.value.photo_storage_path])

    if (error) throw error

    form.value.photo_storage_path = ''
    form.value.photo_url = ''
  } catch (e: any) {
    photoError.value = e.message || 'Erreur lors de la suppression'
  } finally {
    uploading.value = false
  }
}

// --- Curation score helpers ---
const curationLabel = computed(() => {
  const s = form.value.curation_score
  if (s >= 8) return { text: 'Très mis en avant', color: 'text-green-700 bg-green-50' }
  if (s >= 4) return { text: 'Mis en avant', color: 'text-green-600 bg-green-50' }
  if (s >= 1) return { text: 'Léger boost', color: 'text-emerald-600 bg-emerald-50' }
  if (s === 0) return { text: 'Neutre', color: 'text-gray-500 bg-gray-50' }
  if (s >= -4) return { text: 'Rétrogradé', color: 'text-orange-600 bg-orange-50' }
  return { text: 'Très rétrogradé', color: 'text-red-600 bg-red-50' }
})

// --- Instagram feed ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface InstaPhoto {
  id: string
  shortcode: string
  thumbnail: string
  url: string
  caption: string
  importing: boolean
  imported: boolean
}

const instaPhotos = ref<InstaPhoto[]>([])
const instaLoading = ref(false)
const instaError = ref('')

async function loadInstagramFeed() {
  const username = form.value.instagram?.replace('@', '')
  if (!username) return
  instaLoading.value = true
  instaError.value = ''
  try {
    const res = await fetch(`${API_URL}/api/instagram/${username}`)
    if (!res.ok) throw new Error('Impossible de charger le feed')
    const data = await res.json()
    instaPhotos.value = data.map((p: any) => ({
      ...p,
      thumbnail: `${API_URL}/api/instagram/image?url=${encodeURIComponent(p.thumbnail)}`,
      importing: false,
      imported: false,
    }))
  } catch (e: any) {
    instaError.value = e.message || 'Erreur Instagram'
  } finally {
    instaLoading.value = false
  }
}

async function importInstaPhoto(photo: InstaPhoto) {
  photo.importing = true
  instaError.value = ''
  try {
    // Proxy l'image via Nuxt (contourne le CORS Instagram)
    const res = await fetch(`${API_URL}/api/instagram/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: photo.url }),
    })
    if (!res.ok) throw new Error('Impossible de récupérer l\'image')
    const blob = await res.blob()

    // Upload direct Supabase depuis le BO
    const cityKey = form.value.city_key || 'unknown'
    const placeName = form.value.name ? form.value.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'lieu'
    const idx = (form.value.photos || []).length + 1
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const storagePath = `${cityKey}/${placeName}-insta-${idx}-${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, blob, { upsert: true, contentType: blob.type })
    if (error) throw new Error(error.message)

    if (!form.value.photo_storage_path && !form.value.photo_url) {
      form.value.photo_storage_path = storagePath
    } else {
      if (!form.value.photos) form.value.photos = []
      form.value.photos.push(storagePath)
    }
    photo.imported = true
  } catch (e: any) {
    instaError.value = e.message || 'Erreur import'
  } finally {
    photo.importing = false
  }
}

// --- Verification ---
function markAsVerified() {
  form.value.last_verified_at = new Date().toISOString()
}

// --- Validation Deskover (test sur place par l'équipe) ---
function markAsDeskoverTested() {
  form.value.deskover_tested_at = new Date().toISOString()
}

function clearDeskoverTested() {
  form.value.deskover_tested_at = null
}

// Date input <input type="date"> attend "YYYY-MM-DD"
const deskoverTestedDate = computed({
  get() {
    if (!form.value.deskover_tested_at) return ''
    return new Date(form.value.deskover_tested_at).toISOString().slice(0, 10)
  },
  set(val: string) {
    form.value.deskover_tested_at = val ? new Date(val).toISOString() : null
  },
})

const verifiedAgo = computed(() => {
  if (!form.value.last_verified_at) return null
  const d = new Date(form.value.last_verified_at)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} jours`
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`
  return `Il y a ${Math.floor(days / 365)} an(s)`
})

function bumpScore(delta: number) {
  // Pas de 0,1 — on round pour éviter les imprécisions float (0.1 + 0.2 ≠ 0.3)
  const next = Math.max(-10, Math.min(10, form.value.curation_score + delta))
  form.value.curation_score = Math.round(next * 10) / 10
}

// --- Gallery helpers ---
function getPhotoFullUrl(path: string) {
  return `${SUPABASE_STORAGE_BASE}/${path}`
}

const allPhotos = computed(() => {
  const photos: { path: string; url: string; isCover: boolean }[] = []
  if (form.value.photo_storage_path) {
    photos.push({ path: form.value.photo_storage_path, url: getPhotoFullUrl(form.value.photo_storage_path), isCover: true })
  } else if (form.value.photo_url) {
    photos.push({ path: '', url: form.value.photo_url, isCover: true })
  }
  for (const p of (form.value.photos || [])) {
    photos.push({ path: p, url: getPhotoFullUrl(p), isCover: false })
  }
  return photos
})

async function handleGalleryUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  await uploadFiles(Array.from(files))
  input.value = ''
}

async function setAsCover(photo: { path: string; url: string; isCover: boolean }) {
  if (photo.isCover || !photo.path) return

  // Move current cover to gallery
  if (form.value.photo_storage_path) {
    if (!form.value.photos) form.value.photos = []
    form.value.photos.push(form.value.photo_storage_path)
  }

  // Remove new cover from gallery
  form.value.photos = (form.value.photos || []).filter(p => p !== photo.path)

  // Set as cover
  form.value.photo_storage_path = photo.path
  form.value.photo_url = ''
}

async function deletePhoto(photo: { path: string; url: string; isCover: boolean }) {
  uploading.value = true
  photoError.value = ''

  try {
    if (photo.path) {
      await supabase.storage.from(BUCKET).remove([photo.path])
    }

    if (photo.isCover) {
      // Promote first gallery photo to cover
      const gallery = form.value.photos || []
      if (gallery.length > 0) {
        form.value.photo_storage_path = gallery[0]
        form.value.photos = gallery.slice(1)
      } else {
        form.value.photo_storage_path = ''
        form.value.photo_url = ''
      }
    } else {
      form.value.photos = (form.value.photos || []).filter(p => p !== photo.path)
    }
  } catch (e: any) {
    photoError.value = e.message || 'Erreur lors de la suppression'
  } finally {
    uploading.value = false
  }
}

// --- Drag & drop upload ---
const dragging = ref(false)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const files = e.dataTransfer?.files
  if (!files?.length) return
  await uploadFiles(Array.from(files))
}

async function uploadFiles(files: File[]) {
  uploading.value = true
  photoError.value = ''

  try {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const idx = (form.value.photos || []).length + 1
      const storagePath = `${form.value.city_key}/${slugify(form.value.name)}-${idx}-${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: true, contentType: file.type })

      if (error) throw error

      if (!form.value.photo_storage_path && !form.value.photo_url) {
        form.value.photo_storage_path = storagePath
      } else {
        if (!form.value.photos) form.value.photos = []
        form.value.photos.push(storagePath)
      }
    }
  } catch (e: any) {
    photoError.value = e.message || 'Erreur lors de l\'upload'
  } finally {
    uploading.value = false
  }
}

// --- Reorder photos with arrows ---
function movePhoto(idx: number, direction: -1 | 1) {
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= allPhotos.value.length) return

  const all: string[] = []
  if (form.value.photo_storage_path) all.push(form.value.photo_storage_path)
  all.push(...(form.value.photos || []))

  const [moved] = all.splice(idx, 1)
  all.splice(targetIdx, 0, moved)

  form.value.photo_storage_path = all[0] || ''
  form.value.photo_url = ''
  form.value.photos = all.slice(1)
}

function toggleSignal(signal: string) {
  const idx = form.value.signals.indexOf(signal)
  if (idx >= 0) {
    form.value.signals.splice(idx, 1)
  } else {
    form.value.signals.push(signal)
  }
}

function handleSave() {
  emit('save', { ...form.value })
}
</script>

<template>
  <form @submit.prevent="handleSave" class="space-y-6">
    <div class="grid grid-cols-2 gap-6 items-start">
    <!-- Vérification & Validation -->
    <BaseCard title="Vérification">
      <div class="space-y-5">
        <!-- Vérification de la fiche -->
        <div>
          <p class="text-xs font-semibold text-steam uppercase tracking-wide mb-2">Vérification de la fiche</p>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p v-if="form.last_verified_at" class="text-sm text-espresso">
                <span class="font-semibold">Dernière vérification :</span>
                {{ new Date(form.last_verified_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                <span class="text-steam ml-1">({{ verifiedAgo }})</span>
              </p>
              <p v-else class="text-sm text-edison font-medium">Jamais vérifié</p>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-monstera/10 text-monstera hover:bg-monstera/20 transition-colors"
              @click="markAsVerified"
            >
              <CheckCircle :size="16" />
              Marquer comme vérifié
            </button>
          </div>
        </div>

        <div class="border-t border-steam/15"></div>

        <!-- Validation du lieu (test sur place par Deskover) -->
        <div>
          <p class="text-xs font-semibold text-steam uppercase tracking-wide mb-2">Validation du lieu</p>
          <p class="text-xs text-steam mb-3">
            Date à laquelle l'équipe Deskover est allée tester ce lieu sur place.
          </p>
          <div class="flex items-end gap-3 flex-wrap">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-xs font-semibold text-roast mb-1">Date du test sur place</label>
              <input
                v-model="deskoverTestedDate"
                type="date"
                class="w-full px-3 py-2 rounded-lg border border-steam/20 text-sm bg-cream/50 focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              @click="markAsDeskoverTested"
            >
              <CheckCircle :size="16" />
              Aujourd'hui
            </button>
            <button
              v-if="form.deskover_tested_at"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-steam hover:text-red-500 hover:bg-red-50 transition-colors"
              @click="clearDeskoverTested"
            >
              <Trash2 :size="14" />
              Effacer
            </button>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Poids / Curation -->
    <BaseCard title="Poids dans le classement">
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="w-10 h-10 rounded-lg border border-steam/30 bg-white hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors"
            @click="bumpScore(-0.1)"
          >
            <ChevronDown :size="20" class="text-red-500" />
          </button>

          <div class="flex-1">
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              v-model.number="form.curation_score"
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-[10px] text-steam mt-0.5">
              <span>-10</span>
              <span>0</span>
              <span>+10</span>
            </div>
          </div>

          <button
            type="button"
            class="w-10 h-10 rounded-lg border border-steam/30 bg-white hover:bg-green-50 hover:border-green-200 flex items-center justify-center transition-colors"
            @click="bumpScore(0.1)"
          >
            <ChevronUp :size="20" class="text-green-500" />
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold text-espresso tabular-nums">{{ Number(form.curation_score).toFixed(1) }}</span>
          <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', curationLabel.color]">
            {{ curationLabel.text }}
          </span>
        </div>

        <p class="text-xs text-steam">
          Les lieux sont triés par poids décroissant puis par note Google. Un poids de 0 = classement naturel.
        </p>
      </div>
    </BaseCard>
    </div>

    <!-- Avis utilisateurs -->
    <BaseCard
      :title="`Avis utilisateurs${placeRatings.length ? ' (' + placeRatings.length + ')' : ''}`"
      collapsible
    >
      <div v-if="ratingsLoading" class="text-center py-6">
        <div class="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p v-else-if="ratingsError" class="text-xs text-red-500">{{ ratingsError }}</p>
      <div v-else-if="placeRatings.length === 0" class="text-sm text-steam py-2">
        Aucun avis pour ce lieu pour l'instant.
      </div>
      <div v-else class="overflow-hidden border border-steam/15 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-cream/50 border-b border-steam/15">
            <tr class="text-left">
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">WiFi</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Prises</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Accès</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Mood</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Quand</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in placeRatings" :key="r.id" class="border-b border-steam/10 last:border-0">
              <td class="px-3 py-2">
                <span v-if="r.wifi" :class="['text-xs font-semibold px-2 py-0.5 rounded-md', ratingValueColor(r.wifi)]">{{ WIFI_LABELS[r.wifi] }}</span>
                <span v-else class="text-xs text-steam">—</span>
              </td>
              <td class="px-3 py-2">
                <span v-if="r.power" :class="['text-xs font-semibold px-2 py-0.5 rounded-md', ratingValueColor(r.power)]">{{ POWER_LABELS[r.power] }}</span>
                <span v-else class="text-xs text-steam">—</span>
              </td>
              <td class="px-3 py-2">
                <span v-if="r.pricing" :class="['text-xs font-semibold px-2 py-0.5 rounded-md', ratingValueColor(r.pricing)]">{{ PRICING_LABELS[r.pricing] }}</span>
                <span v-else class="text-xs text-steam">—</span>
              </td>
              <td class="px-3 py-2">
                <span v-if="r.mood" :class="['text-xs font-semibold px-2 py-0.5 rounded-md', ratingValueColor(r.mood)]">{{ MOOD_LABELS[r.mood] }}</span>
                <span v-else class="text-xs text-steam">—</span>
              </td>
              <td class="px-3 py-2 text-xs text-steam">{{ ratingTimeAgo(r.created_at) }}</td>
              <td class="px-3 py-2 text-right">
                <button
                  type="button"
                  class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-steam hover:text-red-500 transition-colors"
                  @click="deleteRating(r.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Speed tests WiFi -->
    <BaseCard
      :title="`Speed tests WiFi${speedTests.length ? ' (' + speedTests.length + ')' : ''}`"
      collapsible
    >
      <div v-if="speedTestsLoading" class="text-center py-6">
        <div class="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p v-else-if="speedTestsError" class="text-xs text-red-500">{{ speedTestsError }}</p>
      <div v-else-if="speedTests.length === 0" class="text-sm text-steam py-2">
        Aucun speed test pour ce lieu pour l'instant.
      </div>
      <div v-else class="space-y-4">
        <div
          v-for="group in speedTestsByUser"
          :key="group.fingerprint"
          class="border border-steam/15 rounded-lg overflow-hidden"
        >
          <div class="flex items-center justify-between px-3 py-2 bg-cream/50 border-b border-steam/15">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-roast">{{ shortFingerprint(group.fingerprint) }}</span>
              <span class="text-xs text-steam">· {{ group.tests.length }} mesure{{ group.tests.length > 1 ? 's' : '' }}</span>
            </div>
            <span class="text-xs text-steam">Dernière {{ ratingTimeAgo(group.latest) }}</span>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-cream/30 border-b border-steam/10">
              <tr class="text-left">
                <th class="px-3 py-1.5 text-[10px] font-semibold text-roast uppercase tracking-wide">↓ Download</th>
                <th class="px-3 py-1.5 text-[10px] font-semibold text-roast uppercase tracking-wide">↑ Upload</th>
                <th class="px-3 py-1.5 text-[10px] font-semibold text-roast uppercase tracking-wide">Ping</th>
                <th class="px-3 py-1.5 text-[10px] font-semibold text-roast uppercase tracking-wide">Quand</th>
                <th class="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in group.tests" :key="t.id" class="border-b border-steam/10 last:border-0">
                <td class="px-3 py-2">
                  <span :class="['text-xs font-semibold px-2 py-0.5 rounded-md font-mono', speedQualityClass(t.download)]">
                    {{ t.download }} Mbps
                  </span>
                </td>
                <td class="px-3 py-2 font-mono text-xs text-roast">{{ t.upload }} Mbps</td>
                <td class="px-3 py-2 font-mono text-xs text-roast">{{ t.ping }}ms</td>
                <td class="px-3 py-2 text-xs text-steam">{{ ratingTimeAgo(t.created_at) }}</td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-steam hover:text-red-500 transition-colors"
                    @click="deleteSpeedTest(t.id)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </BaseCard>

    <!-- Photos -->
    <BaseCard title="Photos">
      <div
        class="space-y-4"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <!-- Drop zone overlay -->
        <div
          v-if="dragging"
          class="rounded-xl border-2 border-dashed border-primary bg-primary/5 flex flex-col items-center justify-center py-12 pointer-events-none"
        >
          <Upload :size="32" class="text-primary mb-2" />
          <span class="text-sm font-semibold text-primary">Dépose tes photos ici</span>
        </div>

        <!-- Gallery grid -->
        <div v-if="allPhotos.length && !dragging" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div
            v-for="(photo, idx) in allPhotos"
            :key="photo.path || photo.url"
            class="relative group rounded-xl overflow-hidden bg-linen aspect-square"
          >
            <img :src="photo.url" :alt="`Photo ${idx + 1}`" class="w-full h-full object-cover" />

            <!-- Cover badge -->
            <div v-if="photo.isCover" class="absolute top-2 left-2 flex items-center gap-1 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md">
              <Crown :size="10" />
              Couverture
            </div>

            <!-- Position badge -->
            <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
              {{ idx + 1 }}
            </div>

            <!-- Hover actions -->
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
              <!-- Move arrows -->
              <div class="flex gap-1">
                <button
                  v-if="idx > 0"
                  type="button"
                  class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                  title="Déplacer avant"
                  @click="movePhoto(idx, -1)"
                >
                  <ChevronLeft :size="14" class="text-espresso" />
                </button>
                <button
                  v-if="idx < allPhotos.length - 1"
                  type="button"
                  class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                  title="Déplacer après"
                  @click="movePhoto(idx, 1)"
                >
                  <ChevronRight :size="14" class="text-espresso" />
                </button>
              </div>
              <!-- Delete -->
              <button
                type="button"
                class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-red-50 transition-colors"
                title="Supprimer"
                @click="deletePhoto(photo)"
              >
                <Trash2 :size="14" class="text-red-500" />
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!dragging" class="rounded-xl border-2 border-dashed border-steam/30 flex flex-col items-center justify-center text-steam py-10">
          <ImageIcon :size="32" class="mb-2 opacity-50" />
          <span class="text-sm">Glisse des photos ici ou utilise le bouton ci-dessous</span>
        </div>

        <!-- Loading overlay -->
        <div v-if="uploading" class="flex items-center gap-2 text-sm text-steam">
          <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Upload en cours...
        </div>

        <!-- Error -->
        <p v-if="photoError" class="text-xs text-red-500">{{ photoError }}</p>

        <!-- Upload button -->
        <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors bg-primary text-white hover:bg-primary/90">
          <Upload :size="14" />
          Ajouter des photos
          <input
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            :disabled="uploading"
            @change="handleGalleryUpload($event)"
          />
        </label>

        <p class="text-xs text-steam">
          Glisse-dépose des fichiers ou clique sur le bouton. Utilise les flèches pour réordonner. La première est la couverture.
        </p>

        <!-- Instagram -->
        <div class="border-t border-steam/20 pt-4 space-y-3">
          <p class="text-xs font-semibold text-roast uppercase tracking-wide">Instagram</p>
          <div v-if="form.instagram" class="space-y-3">
            <div class="flex items-center gap-3">
              <a
                :href="`https://www.instagram.com/${form.instagram.replace('@', '')}/`"
                target="_blank"
                class="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Instagram :size="16" />
                @{{ form.instagram.replace('@', '') }}
              </a>
              <button
                type="button"
                :disabled="instaLoading"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                @click="loadInstagramFeed"
              >
                <RefreshCw :size="12" :class="instaLoading ? 'animate-spin' : ''" />
                {{ instaLoading ? 'Chargement…' : instaPhotos.length ? 'Actualiser' : 'Charger le feed' }}
              </button>
            </div>
            <p v-if="instaError" class="text-xs text-red-500">{{ instaError }}</p>
            <div v-if="instaPhotos.length" class="space-y-3">
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div
                  v-for="photo in instaPhotos"
                  :key="photo.id"
                  class="relative group aspect-square rounded-xl overflow-hidden bg-steam/20"
                >
                  <img :src="photo.thumbnail" :alt="photo.caption" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      :disabled="photo.importing"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white text-espresso hover:bg-linen disabled:opacity-60 transition-colors"
                      @click="importInstaPhoto(photo)"
                    >
                      {{ photo.importing ? '…' : 'Importer' }}
                    </button>
                  </div>
                  <div v-if="photo.imported" class="absolute top-1.5 right-1.5">
                    <CheckCircle :size="16" class="text-green-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-steam">Renseigne le compte Instagram dans "Contact et liens" pour charger le feed.</p>
        </div>
      </div>
    </BaseCard>

    <!-- Le lieu -->
    <BaseCard title="Le lieu">
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BaseInput
            v-model="form.name"
            label="Nom"
          />
          <div class="space-y-1">
            <label class="block text-sm font-medium text-roast">Categorie</label>
            <select
              v-model="form.category"
              class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ CATEGORY_LABELS[cat] }}
              </option>
            </select>
          </div>
          <BaseInput
            v-model="form.address"
            label="Adresse"
          />
          <BaseInput
            v-model="form.city"
            label="Ville"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-roast">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
            placeholder="Decrivez ce lieu pour les travailleurs nomades..."
          />
          <p class="text-xs text-steam">{{ form.description?.length || 0 }} caracteres</p>
        </div>
        <div class="border-t border-steam/20 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Contact -->
          <div class="space-y-4">
            <p class="text-xs font-semibold text-roast uppercase tracking-wide">Contact</p>
            <BaseInput
              v-model="form.website"
              label="Site web"
              placeholder="https://..."
            />
            <BaseInput
              v-model="form.phone"
              label="Téléphone"
              placeholder="+33..."
            />
            <BaseInput
              v-model="form.instagram"
              label="Instagram"
              placeholder="@nom_du_lieu"
            />
            <div class="space-y-1">
              <label class="block text-sm font-medium text-roast">Google Maps</label>
              <a
                v-if="form.google_maps_url"
                :href="form.google_maps_url"
                target="_blank"
                class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink :size="14" />
                Voir sur Google Maps
              </a>
              <span v-else class="text-sm text-steam">Non disponible</span>
            </div>
          </div>
          <!-- Horaires -->
          <div class="space-y-3">
            <p class="text-xs font-semibold text-roast uppercase tracking-wide">Horaires</p>
            <div class="space-y-2">
              <div
                v-for="(hours, i) in (form.opening_hours || [])"
                :key="i"
                class="flex items-center gap-2"
              >
                <Clock :size="12" class="text-steam flex-shrink-0" />
                <input
                  :value="hours"
                  class="flex-1 rounded-lg border border-steam/30 bg-white px-3 py-1.5 text-sm text-espresso outline-none focus:border-primary"
                  @input="form.opening_hours[i] = ($event.target as HTMLInputElement).value"
                >
                <button
                  type="button"
                  class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-steam hover:text-red-500 transition-colors"
                  @click="form.opening_hours.splice(i, 1)"
                >
                  <span class="text-xs font-bold">×</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              class="text-sm text-primary font-medium hover:underline"
              @click="if (!form.opening_hours) form.opening_hours = []; form.opening_hours.push('Lundi : 09:00 – 18:00')"
            >
              + Ajouter un horaire
            </button>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Caractéristiques -->
    <BaseCard title="Caractéristiques">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="signal in allSignals"
            :key="signal"
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              form.signals.includes(signal)
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-roast border-steam/30 hover:border-primary/50',
            ]"
            @click="toggleSignal(signal)"
          >
            {{ SIGNAL_LABELS[signal] || signal }}
          </button>
        </div>
        <div class="border-t border-steam/20 pt-4 space-y-1">
          <label class="block text-sm font-medium text-roast mb-1">Conditions d'accès <span class="text-steam font-normal">(tarif, réservation, etc.)</span></label>
          <div class="border border-steam/30 rounded-lg overflow-hidden">
            <div v-if="conditionsEditor" class="flex gap-1 p-1.5 border-b border-steam/15 bg-cream/50">
              <button type="button" :class="['p-1 rounded text-xs', conditionsEditor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']" @click="conditionsEditor.chain().focus().toggleBold().run()">B</button>
              <button type="button" :class="['p-1 rounded text-xs italic', conditionsEditor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']" @click="conditionsEditor.chain().focus().toggleItalic().run()">I</button>
              <button type="button" :class="['p-1 rounded text-xs', conditionsEditor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']" @click="conditionsEditor.chain().focus().toggleBulletList().run()">•</button>
            </div>
            <EditorContent :editor="conditionsEditor" class="bg-white [&_.tiptap]:px-3 [&_.tiptap]:py-2 [&_.tiptap]:text-sm [&_.tiptap]:text-espresso [&_.tiptap]:outline-none [&_.tiptap]:min-h-[60px] [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5" />
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Restauration -->
    <BaseCard title="Restauration">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-roast">Type de restauration</label>
          <select
            v-model="form.food_type"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso outline-none focus:border-primary"
          >
            <option value="">Non renseigné</option>
            <option value="boissons">Boissons uniquement</option>
            <option value="snacks">Boissons + snacks</option>
            <option value="dejeuner">Déjeuner / plats</option>
            <option value="complet">Restauration complète</option>
            <option value="buffet">Buffet / libre-service</option>
          </select>
        </div>
        <BaseInput
          v-model="form.menu_url"
          label="Lien vers le menu"
          placeholder="https://..."
        />
      </div>
      <div class="mt-4 space-y-1">
        <label class="block text-sm font-medium text-roast mb-1">Description</label>
        <div class="border border-steam/30 rounded-lg overflow-hidden">
          <div v-if="foodEditor" class="flex gap-1 p-1.5 border-b border-steam/15 bg-cream/50">
            <button type="button" :class="['p-1 rounded text-xs', foodEditor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']" @click="foodEditor.chain().focus().toggleBold().run()">B</button>
            <button type="button" :class="['p-1 rounded text-xs italic', foodEditor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']" @click="foodEditor.chain().focus().toggleItalic().run()">I</button>
            <button type="button" :class="['p-1 rounded text-xs', foodEditor.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-roast hover:bg-linen']" @click="foodEditor.chain().focus().toggleBulletList().run()">•</button>
          </div>
          <EditorContent :editor="foodEditor" class="bg-white [&_.tiptap]:px-3 [&_.tiptap]:py-2 [&_.tiptap]:text-sm [&_.tiptap]:text-espresso [&_.tiptap]:outline-none [&_.tiptap]:min-h-[60px] [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5" />
        </div>
        <p class="text-xs text-steam">Ex: Carte de snacks et boissons chaudes, plat du jour le midi à 12€...</p>
      </div>
    </BaseCard>

    <!-- Google infos (readonly) -->
    <BaseCard title="Informations Google">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex items-center gap-2">
          <Star :size="16" class="text-edison" />
          <span class="text-sm text-espresso font-semibold">
            {{ form.google_rating?.toFixed(1) || '-' }}
          </span>
          <span class="text-xs text-steam">
            ({{ form.google_reviews_count || 0 }} avis)
          </span>
        </div>
        <div>
          <p class="text-xs text-roast">Statut</p>
          <BaseBadge :variant="form.business_status === 'OPERATIONAL' ? 'success' : 'warning'">
            {{ form.business_status || 'Inconnu' }}
          </BaseBadge>
        </div>
        <div>
          <p class="text-xs text-roast">Place ID</p>
          <p class="text-xs text-steam font-mono">{{ form.google_place_id }}</p>
        </div>
      </div>
    </BaseCard>

    <!-- Blog mentions (readonly) -->
    <BaseCard v-if="form.blog_mentions?.length" title="Mentions blog">
      <p class="text-sm text-roast mb-3">
        {{ form.blog_mentions_count }} mention{{ form.blog_mentions_count > 1 ? 's' : '' }}
      </p>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <a
          v-for="mention in form.blog_mentions.slice(0, 10)"
          :key="mention.url"
          :href="mention.url"
          target="_blank"
          class="block text-sm text-primary hover:underline truncate"
        >
          {{ mention.title }}
          <span class="text-xs text-steam ml-1">({{ mention.source }})</span>
        </a>
        <p v-if="form.blog_mentions.length > 10" class="text-xs text-steam">
          ... et {{ form.blog_mentions.length - 10 }} autres
        </p>
      </div>
    </BaseCard>

    <!-- Save button -->
    <div class="flex justify-end sticky bottom-6">
      <BaseButton type="submit" variant="primary" size="lg" :disabled="saving">
        <Save :size="18" />
        {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
      </BaseButton>
    </div>
  </form>
</template>
