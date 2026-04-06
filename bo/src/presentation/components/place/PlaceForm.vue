<script setup lang="ts">
import { ref, watch, computed } from 'vue'

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

watch(() => props.place, (newVal) => {
  form.value = { ...newVal }
}, { deep: true })

const allSignals = [
  'wifi', 'prises', 'calme', 'food', 'terrasse', 'laptop_friendly',
  'pas_cher', 'grandes_tables', 'ambiance', 'silencieux', 'musique', 'lumineux',
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

// --- Verification ---
function markAsVerified() {
  form.value.last_verified_at = new Date().toISOString()
}

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
  form.value.curation_score = Math.max(-10, Math.min(10, form.value.curation_score + delta))
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
    <!-- Vérification manuelle -->
    <BaseCard title="Vérification">
      <div class="flex items-center justify-between">
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
    </BaseCard>

    <!-- Poids / Curation -->
    <BaseCard title="Poids dans le classement">
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="w-10 h-10 rounded-lg border border-steam/30 bg-white hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors"
            @click="bumpScore(-1)"
          >
            <ChevronDown :size="20" class="text-red-500" />
          </button>

          <div class="flex-1">
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
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
            @click="bumpScore(1)"
          >
            <ChevronUp :size="20" class="text-green-500" />
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold text-espresso tabular-nums">{{ form.curation_score }}</span>
          <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', curationLabel.color]">
            {{ curationLabel.text }}
          </span>
        </div>

        <p class="text-xs text-steam">
          Les lieux sont triés par poids décroissant puis par note Google. Un poids de 0 = classement naturel.
        </p>
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
            class="relative group rounded-xl overflow-hidden bg-linen"
            style="aspect-ratio: 4/3;"
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
      </div>
    </BaseCard>

    <!-- Informations principales -->
    <BaseCard title="Informations principales">
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
    </BaseCard>

    <!-- Description -->
    <BaseCard title="Description">
      <div class="space-y-1">
        <label class="block text-sm font-medium text-roast">Description du lieu</label>
        <textarea
          v-model="form.description"
          rows="5"
          class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
          placeholder="Decrivez ce lieu pour les travailleurs nomades..."
        />
        <p class="text-xs text-steam">
          {{ form.description?.length || 0 }} caracteres
        </p>
      </div>
    </BaseCard>

    <!-- Signaux -->
    <BaseCard title="Signaux">
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
    </BaseCard>

    <!-- Conditions d'accès -->
    <BaseCard title="Conditions d'accès">
      <div class="space-y-1">
        <label class="block text-sm font-medium text-roast">Détail des conditions (tarif, réservation, etc.)</label>
        <textarea
          v-model="form.conditions"
          rows="2"
          class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
          placeholder="Ex: Pass journée 15€, réservation sur leur site..."
        />
        <p class="text-xs text-steam">
          Affiché sous les Vitals sur la fiche lieu. Laisse vide si c'est un café classique (consommation uniquement).
        </p>
      </div>
    </BaseCard>

    <!-- Contact & liens -->
    <BaseCard title="Contact et liens">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BaseInput
          v-model="form.website"
          label="Site web"
          placeholder="https://..."
        />
        <BaseInput
          v-model="form.phone"
          label="Telephone"
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
    </BaseCard>

    <!-- Instagram -->
    <BaseCard title="Instagram">
      <div class="space-y-4">
        <BaseInput
          v-model="form.instagram"
          label="Compte Instagram"
          placeholder="@nom_du_lieu"
        />
        <div v-if="form.instagram" class="rounded-xl bg-linen p-4">
          <a
            :href="`https://www.instagram.com/${form.instagram.replace('@', '')}/`"
            target="_blank"
            class="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Instagram :size="16" />
            Voir le profil @{{ form.instagram.replace('@', '') }}
          </a>
        </div>
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

    <!-- Horaires -->
    <BaseCard title="Horaires">
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
            class="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center text-steam hover:text-red-500 transition-colors"
            @click="form.opening_hours.splice(i, 1)"
          >
            <span class="text-xs font-bold">x</span>
          </button>
        </div>
      </div>
      <button
        class="mt-3 text-sm text-primary font-medium hover:underline"
        @click="if (!form.opening_hours) form.opening_hours = []; form.opening_hours.push('jour: 09:00 – 18:00')"
      >
        + Ajouter un horaire
      </button>
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
