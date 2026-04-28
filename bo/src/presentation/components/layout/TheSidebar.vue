<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  MapPin,
  Map,
  FileText,
  MessageSquare,
  Star,
  TrendingUp,
} from 'lucide-vue-next'
import { useRatingsNotificationsStore } from '../../../stores/ratingsNotifications'

const route = useRoute()
const ratingsNotifs = useRatingsNotificationsStore()

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, badgeKey: null },
  { name: 'Lieux', path: '/places', icon: MapPin, badgeKey: null },
  { name: 'Carte', path: '/map', icon: Map, badgeKey: null },
  { name: 'Articles', path: '/articles', icon: FileText, badgeKey: null },
  { name: 'SEO', path: '/seo', icon: TrendingUp, badgeKey: null },
  { name: 'Messages', path: '/messages', icon: MessageSquare, badgeKey: null },
  { name: 'Avis', path: '/avis', icon: Star, badgeKey: 'ratings' as const },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function badgeCount(key: string | null): number {
  if (key === 'ratings') return ratingsNotifs.unreadCount
  return 0
}

onMounted(() => {
  ratingsNotifs.fetchUnreadCount()
})
</script>

<template>
  <aside class="fixed inset-y-0 left-0 w-64 bg-sidebar flex flex-col z-30">
    <!-- Logo -->
    <div class="font-display px-6 py-6 border-b border-white/10">
      <h1 class="text-xl font-bold text-white tracking-tight">
        Deskover
      </h1>
      <p class="text-xs text-steam mt-0.5">Backoffice</p>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1">
      <router-link
        v-for="item in navigation"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive(item.path)
            ? 'bg-primary text-white shadow-md'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        ]"
      >
        <component :is="item.icon" :size="18" />
        <span class="flex-1">{{ item.name }}</span>
        <span
          v-if="badgeCount(item.badgeKey) > 0"
          class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold"
        >
          {{ badgeCount(item.badgeKey) }}
        </span>
      </router-link>
    </nav>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-white/10">
      <p class="text-xs text-steam">Deskover v0.1</p>
    </div>
  </aside>
</template>
