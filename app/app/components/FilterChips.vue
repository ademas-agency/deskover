<script setup lang="ts">
interface Filter {
  label: string
  value: string
  active?: boolean
}

defineProps<{
  filters: Filter[]
}>()

defineEmits<{
  toggle: [value: string]
}>()
</script>

<template>
  <div class="flex gap-2 overflow-x-auto no-scrollbar px-4 py-5">
    <button
      v-for="filter in filters"
      :key="filter.value"
      class="flex-shrink-0 px-[18px] py-2.5 rounded-[20px] text-[13px] font-semibold transition-all duration-200 whitespace-nowrap"
      :class="filter.active
        ? 'bg-[var(--color-terracotta-500)] text-white'
        : 'bg-white text-[var(--color-roast)] border-[1.5px] border-[var(--color-parchment)]'"
      @click="$emit('toggle', filter.value)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>
