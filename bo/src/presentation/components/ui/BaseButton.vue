<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>()
</script>

<template>
  <button
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 cursor-pointer',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      {
        'bg-primary text-white hover:bg-primary-dark shadow-sm': variant === 'primary' || !variant,
        'bg-white text-espresso border border-steam/30 hover:bg-linen shadow-sm': variant === 'secondary',
        'text-roast hover:text-espresso hover:bg-linen': variant === 'ghost',
        'bg-red-600 text-white hover:bg-red-700 shadow-sm': variant === 'danger',
      },
      {
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-4 py-2 text-sm': size === 'md' || !size,
        'px-6 py-3 text-base': size === 'lg',
      },
    ]"
  >
    <slot />
  </button>
</template>
