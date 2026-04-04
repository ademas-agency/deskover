<script setup lang="ts">
defineProps<{
  title?: string
  noPadding?: boolean
}>()
</script>

<template>
  <div class="bg-white rounded-xl border border-steam/15 shadow-sm">
    <div v-if="title" style="padding: 20px 32px" class="border-b border-steam/10">
      <h3 class="text-base font-bold text-espresso">{{ title }}</h3>
    </div>
    <div v-if="noPadding">
      <slot />
    </div>
    <div v-else style="padding: 32px">
      <slot />
    </div>
  </div>
</template>
