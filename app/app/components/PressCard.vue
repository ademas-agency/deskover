<script setup lang="ts">
defineProps<{
  source: string
  title: string
  url?: string
}>()
</script>

<template>
  <a :href="url || '#'" target="_blank" rel="noopener" class="block bg-white rounded-xl p-3.5 shadow-[0_2px_8px_rgba(44,40,37,0.06)] min-w-[200px] flex-shrink-0 hover:shadow-[0_4px_12px_rgba(44,40,37,0.1)] transition-shadow">
    <div class="text-[10px] text-[var(--color-terracotta-500)] font-bold uppercase">{{ source }}</div>
    <div class="text-[13px] text-[var(--color-espresso)] font-semibold mt-1">{{ title }}</div>
  </a>
</template>
