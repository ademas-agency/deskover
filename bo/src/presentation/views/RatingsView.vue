<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../infrastructure/api/client'
import { useRatingsNotificationsStore } from '../../stores/ratingsNotifications'
import BaseCard from '../components/ui/BaseCard.vue'
import { Trash2, MapPin } from 'lucide-vue-next'

interface RatingRow {
  id: string
  fingerprint: string
  wifi: number | null
  power: number | null
  pricing: number | null
  mood: number | null
  created_at: string
  place_id: string
  place: { id: string; name: string; city: string; slug: string } | null
}

const router = useRouter()
const ratingsNotifs = useRatingsNotificationsStore()

const ratings = ref<RatingRow[]>([])
const loading = ref(true)
const errorMsg = ref('')

const WIFI_LABELS: Record<number, string> = { 1: 'Faible', 2: 'Bon', 3: 'Rapide' }
const POWER_LABELS: Record<number, string> = { 1: 'Aucune', 2: 'Quelques-unes', 3: 'Plein' }
const PRICING_LABELS: Record<number, string> = { 1: 'Gratuit', 2: 'Payant' }
const MOOD_LABELS: Record<number, string> = { 1: 'Calme', 2: 'Animé' }

const newSinceLastSeen = computed(() => ratingsNotifs.lastSeenAt)

function isNew(createdAt: string): boolean {
  return new Date(createdAt) > new Date(newSinceLastSeen.value)
}

onMounted(async () => {
  loading.value = true
  errorMsg.value = ''
  const { data, error } = await supabase
    .from('ratings')
    .select('id, fingerprint, wifi, power, pricing, mood, created_at, place_id, place:places(id, name, city, slug)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    errorMsg.value = error.message
  } else {
    ratings.value = (data as any) || []
  }
  loading.value = false

  // On marque comme vu après avoir affiché — la column "Nouveau" reste figée
  // sur la base du timestamp précédent jusqu'au prochain refresh.
  ratingsNotifs.markAsSeen()
})

async function deleteRating(id: string) {
  if (!confirm('Supprimer cet avis ?')) return
  await supabase.from('ratings').delete().eq('id', id)
  ratings.value = ratings.value.filter(r => r.id !== id)
}

function ratingValueColor(v: number | null): string {
  if (v === null || v === undefined) return 'bg-steam/10 text-steam'
  if (v >= 3) return 'bg-monstera/15 text-monstera'
  if (v === 2) return 'bg-edison/15 text-edison'
  return 'bg-red-50 text-red-600'
}

function timeAgo(date: string) {
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

function goToPlace(placeId: string) {
  router.push({ name: 'place-edit', params: { id: placeId } })
}
</script>

<template>
  <div class="space-y-6">
    <BaseCard :title="`Tous les avis${ratings.length ? ' (' + ratings.length + ')' : ''}`">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <p v-else-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
      <p v-else-if="ratings.length === 0" class="text-sm text-steam py-2">
        Aucun avis pour l'instant.
      </p>
      <div v-else class="overflow-hidden border border-steam/15 rounded-lg">
        <table class="w-full text-sm">
          <thead class="bg-cream/50 border-b border-steam/15">
            <tr class="text-left">
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Lieu</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">WiFi</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Prises</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Accès</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Mood</th>
              <th class="px-3 py-2 text-xs font-semibold text-roast uppercase tracking-wide">Quand</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in ratings"
              :key="r.id"
              :class="['border-b border-steam/10 last:border-0 hover:bg-cream/30', isNew(r.created_at) && 'bg-primary/5']"
            >
              <td class="px-3 py-2">
                <button
                  type="button"
                  class="flex items-center gap-1.5 text-sm font-semibold text-espresso hover:text-primary transition-colors text-left"
                  @click="goToPlace(r.place_id)"
                >
                  <MapPin :size="12" class="text-steam flex-shrink-0" />
                  <span>{{ r.place?.name || '—' }}</span>
                  <span v-if="r.place?.city" class="text-xs font-normal text-steam">· {{ r.place.city }}</span>
                </button>
              </td>
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
              <td class="px-3 py-2 text-xs text-steam whitespace-nowrap">
                <span v-if="isNew(r.created_at)" class="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 align-middle" />
                {{ timeAgo(r.created_at) }}
              </td>
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
  </div>
</template>
