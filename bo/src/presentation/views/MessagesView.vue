<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../infrastructure/api/client'
import BaseBadge from '../components/ui/BaseBadge.vue'
import { Mail, MailOpen, Trash2, Clock } from 'lucide-vue-next'

interface Message {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  read: boolean
  created_at: string
}

const messages = ref<Message[]>([])
const loading = ref(true)
const selectedMessage = ref<Message | null>(null)

onMounted(async () => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  messages.value = data || []
  loading.value = false
})

const unreadCount = computed(() => messages.value.filter(m => !m.read).length)

async function markRead(msg: Message) {
  selectedMessage.value = msg
  if (!msg.read) {
    msg.read = true
    await supabase.from('messages').update({ read: true }).eq('id', msg.id)
  }
}

async function deleteMessage(id: string) {
  await supabase.from('messages').delete().eq('id', id)
  messages.value = messages.value.filter(m => m.id !== id)
  if (selectedMessage.value?.id === id) selectedMessage.value = null
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-espresso">
        Messages
        <BaseBadge v-if="unreadCount" variant="warning" class="ml-2">{{ unreadCount }} non lu{{ unreadCount > 1 ? 's' : '' }}</BaseBadge>
      </h1>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="messages.length === 0" class="text-center py-12 text-steam">
      Aucun message pour l'instant.
    </div>

    <div v-else class="flex gap-6">
      <!-- Liste -->
      <div class="w-1/3 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
        <button
          v-for="msg in messages"
          :key="msg.id"
          class="text-left p-4 rounded-xl border transition-all"
          :class="selectedMessage?.id === msg.id
            ? 'border-primary bg-primary/5'
            : msg.read
              ? 'border-steam/15 bg-white hover:border-steam/30'
              : 'border-primary/30 bg-primary/5 hover:border-primary/50'"
          @click="markRead(msg)"
        >
          <div class="flex items-center gap-2">
            <component :is="msg.read ? MailOpen : Mail" :size="14" :class="msg.read ? 'text-steam' : 'text-primary'" />
            <span class="text-sm font-semibold text-espresso truncate">{{ msg.name }}</span>
          </div>
          <p v-if="msg.subject" class="text-xs text-roast mt-1 truncate">{{ msg.subject }}</p>
          <p class="text-xs text-steam mt-1 truncate">{{ msg.message }}</p>
          <div class="flex items-center gap-1 mt-2">
            <Clock :size="10" class="text-steam" />
            <span class="text-[10px] text-steam">{{ timeAgo(msg.created_at) }}</span>
          </div>
        </button>
      </div>

      <!-- Détail -->
      <div class="flex-1">
        <div v-if="!selectedMessage" class="text-center py-20 text-steam text-sm">
          Sélectionne un message pour le lire
        </div>
        <div v-else class="bg-white rounded-xl border border-steam/15 p-6 space-y-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-bold text-espresso">{{ selectedMessage.name }}</h2>
              <a :href="`mailto:${selectedMessage.email}`" class="text-sm text-primary hover:underline">{{ selectedMessage.email }}</a>
            </div>
            <button
              class="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-steam hover:text-red-500 transition-colors"
              @click="deleteMessage(selectedMessage.id)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
          <div v-if="selectedMessage.subject" class="text-sm font-semibold text-roast">
            {{ selectedMessage.subject }}
          </div>
          <div class="text-[10px] text-steam">
            {{ new Date(selectedMessage.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
          </div>
          <div class="border-t border-steam/10 pt-4">
            <p class="text-sm text-roast whitespace-pre-wrap leading-relaxed">{{ selectedMessage.message }}</p>
          </div>
          <a
            :href="`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Deskover'}`"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Mail :size="14" />
            Répondre
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
