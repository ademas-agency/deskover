<script setup lang="ts">
defineProps<{
  variant?: 'light' | 'dark' | 'transparent'
}>()
</script>

<template>
  <header
    class="flex items-center justify-between px-5 pt-[52px] pb-4"
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
</template>
