<script setup lang="ts">
defineProps<{ name?: string }>()
</script>

<template>
  <div class="relative w-full h-full overflow-hidden bg-[var(--color-monstera)] flex flex-col items-center justify-center gap-2.5">
    <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
      <UIcon name="lucide:coffee" class="w-6 h-6 text-white/90" />
    </div>
    <div class="text-[10px] uppercase tracking-[0.12em] font-bold text-white/85">
      Photo à venir
    </div>
  </div>
</template>
