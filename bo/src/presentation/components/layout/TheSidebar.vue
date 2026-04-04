<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  MapPin,
  Map,
  FileText,
  Settings,
} from 'lucide-vue-next'

const route = useRoute()

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Lieux', path: '/places', icon: MapPin },
  { name: 'Carte', path: '/map', icon: Map },
  { name: 'Articles', path: '/articles', icon: FileText },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside class="fixed inset-y-0 left-0 w-64 bg-sidebar flex flex-col z-30">
    <!-- Logo -->
    <div class="px-6 py-6 border-b border-white/10">
      <h1 class="text-xl font-bold text-white tracking-tight">
        <span class="text-primary">Desk</span>over
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
        {{ item.name }}
      </router-link>
    </nav>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-white/10">
      <p class="text-xs text-steam">Deskover v0.1</p>
    </div>
  </aside>
</template>
