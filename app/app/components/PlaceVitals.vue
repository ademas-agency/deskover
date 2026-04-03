<script setup lang="ts">
interface Vital {
  icon: string       // lucide icon name
  label: string      // "WIFI", "PRISES", "FOOD", "STYLE"
  value: string      // "Rapide", "Partout", "Complet", "Canon"
  status: 'good' | 'medium' | 'none'
}

withDefaults(defineProps<{
  vitals: Vital[]
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md'
})

const statusColor = (status: string) => {
  switch (status) {
    case 'good': return 'text-[var(--color-monstera)]'
    case 'medium': return 'text-[var(--color-edison)]'
    default: return 'text-[var(--color-steam)]'
  }
}

const iconSize = (size: string) => {
  switch (size) {
    case 'sm': return 'w-3.5 h-3.5'
    case 'lg': return 'w-7 h-7'
    default: return 'w-[22px] h-[22px]'
  }
}
</script>

<template>
  <div class="bg-[var(--color-linen)] rounded-[14px] flex" :class="size === 'lg' ? 'py-4' : 'py-3.5'">
    <div
      v-for="(vital, i) in vitals"
      :key="vital.label"
      class="flex-1 flex flex-col items-center gap-[3px] relative"
    >
      <!-- Separator -->
      <div v-if="i > 0" class="absolute left-0 top-2 bottom-2 w-px bg-[var(--color-parchment)]" />
      <!-- Icon -->
      <UIcon :name="vital.icon" :class="[iconSize(size), statusColor(vital.status)]" />
      <!-- Label -->
      <span class="text-[9px] uppercase tracking-[0.06em] text-[var(--color-steam)]" :class="size === 'lg' && 'text-[10px]'">{{ vital.label }}</span>
      <!-- Value -->
      <span class="font-bold" :class="[size === 'lg' ? 'text-xs' : 'text-[11px]', statusColor(vital.status)]">{{ vital.value }}</span>
    </div>
  </div>
</template>
