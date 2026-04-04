<script setup lang="ts">
import { ref, watch, computed } from 'vue'

import type { Place, PlaceCategory } from '../../../core/domain/entities/Place'
import { CATEGORY_LABELS, SIGNAL_LABELS } from '../../../core/domain/entities/Place'
import BaseInput from '../ui/BaseInput.vue'
import BaseButton from '../ui/BaseButton.vue'
import BaseCard from '../ui/BaseCard.vue'
import BaseBadge from '../ui/BaseBadge.vue'
import { Save, ExternalLink, Star, Clock, Globe, Phone, Instagram } from 'lucide-vue-next'

const props = defineProps<{
  place: Place
}>()

const emit = defineEmits<{
  save: [place: Place]
}>()

const form = ref<Place>({ ...props.place })

watch(() => props.place, (newVal) => {
  form.value = { ...newVal }
}, { deep: true })

const allSignals = [
  'wifi', 'prises', 'calme', 'food', 'terrasse', 'laptop_friendly',
  'pas_cher', 'grandes_tables', 'ambiance', 'silencieux', 'musique', 'lumineux',
]

const categories: PlaceCategory[] = ['cafe', 'coffee_shop', 'coworking', 'tiers_lieu']

const SUPABASE_STORAGE_BASE = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos'

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const supabasePhotoUrl = computed(() => {
  if (form.value.city_key && form.value.name) {
    const path = `${form.value.city_key}/${slugify(form.value.name)}.jpg`
    return `${SUPABASE_STORAGE_BASE}/${path}`
  }
  return null
})

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
    <!-- Photo de couverture -->
    <BaseCard title="Photo de couverture">
      <div class="space-y-4">
        <div v-if="supabasePhotoUrl || form.photo_url" class="relative rounded-xl overflow-hidden bg-linen w-64" style="aspect-ratio: 16/9;">
          <img :src="supabasePhotoUrl || form.photo_url" :alt="form.name" class="w-full h-full object-cover" />
        </div>
        <div v-else class="rounded-xl bg-linen flex items-center justify-center text-steam w-64" style="aspect-ratio: 16/9;">
          Aucune photo
        </div>
        <p v-if="supabasePhotoUrl" class="text-xs text-steam truncate">
          <a :href="supabasePhotoUrl" target="_blank" class="text-primary hover:underline">{{ supabasePhotoUrl }}</a>
        </p>
        <p v-else-if="form.photo_url" class="text-xs text-steam truncate">
          <a :href="form.photo_url" target="_blank" class="text-primary hover:underline">{{ form.photo_url }}</a>
        </p>
        <p v-else class="text-xs text-steam">Aucune image</p>
      </div>
    </BaseCard>

    <!-- Informations principales -->
    <BaseCard title="Informations principales">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BaseInput
          :modelValue="form.name"
          label="Nom"
          readonly
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
          :modelValue="form.address"
          label="Adresse"
          readonly
        />
        <BaseInput
          :modelValue="form.city"
          label="Ville"
          readonly
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

    <!-- Horaires (readonly) -->
    <BaseCard v-if="form.opening_hours?.length" title="Horaires">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
        <div
          v-for="hours in form.opening_hours"
          :key="hours"
          class="flex items-center gap-2 text-sm"
        >
          <Clock :size="12" class="text-steam flex-shrink-0" />
          <span class="text-roast">{{ hours }}</span>
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
      <BaseButton type="submit" variant="primary" size="lg">
        <Save :size="18" />
        Sauvegarder
      </BaseButton>
    </div>
  </form>
</template>
