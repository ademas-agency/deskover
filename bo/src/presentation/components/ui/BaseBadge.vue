<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      {
        'bg-primary/10 text-primary': variant === 'primary' || !variant,
        'bg-monstera/10 text-monstera': variant === 'success',
        'bg-edison/10 text-edison': variant === 'warning',
        'bg-red-50 text-red-700': variant === 'danger',
        'bg-blue-50 text-blue-700': variant === 'info',
        'bg-linen text-roast': variant === 'neutral',
      },
    ]"
  >
    <slot />
  </span>
</template>
