<script setup lang="ts">
const route = useRoute()

defineProps<{
  variant?: 'light' | 'dark' | 'transparent'
}>()

const navLinks = [
  { label: 'Guides', path: '/' },
  { label: 'Carte', path: '/carte' },
  { label: 'Ajouter un lieu', path: '/ajouter' },
  { label: 'À propos', path: '/a-propos' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <!-- Mobile header -->
  <header
    class="lg:hidden flex items-center justify-between px-5 pt-safe pb-4"
    :class="{
      'bg-[var(--color-cream)]': variant === 'light',
      'bg-[var(--color-espresso)]': variant === 'dark',
    }"
  >
    <NuxtLink to="/" class="font-display text-base tracking-[0.15em]" :class="variant === 'dark' || variant === 'transparent' ? 'text-white' : 'text-[var(--color-espresso)]'">
      DESKOVER
    </NuxtLink>
    <NuxtLink to="/search">
      <UIcon name="lucide:search" class="w-[22px] h-[22px]" :class="variant === 'dark' || variant === 'transparent' ? 'text-white' : 'text-[var(--color-steam)]'" />
    </NuxtLink>
  </header>

  <!-- Desktop header -->
  <header class="hidden lg:block sticky top-0 z-50 bg-white shadow-[0_1px_4px_rgba(44,40,37,0.04)]">
    <div class="container-deskover h-16 flex items-center justify-between gap-8">
      <!-- Logo -->
      <NuxtLink to="/" class="font-display text-lg tracking-[0.06em] text-[var(--color-terracotta-500)] flex-shrink-0">
        DESKOVER
      </NuxtLink>

      <!-- Search bar -->
      <NuxtLink
        to="/search"
        class="flex-1 max-w-[480px] h-11 bg-[var(--color-linen)] rounded-xl flex items-center px-4 gap-3 hover:bg-[var(--color-parchment)] transition-colors"
      >
        <UIcon name="lucide:search" class="w-[18px] h-[18px] text-[var(--color-steam)]" />
        <span class="text-sm text-[var(--color-steam)]">Une ville, un quartier, un lieu...</span>
      </NuxtLink>

      <!-- Nav links -->
      <nav class="flex items-center gap-7 flex-shrink-0">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="text-sm font-medium transition-colors"
          :class="isActive(link.path) ? 'text-[var(--color-terracotta-500)] font-semibold' : 'text-[var(--color-roast)] hover:text-[var(--color-terracotta-500)]'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
