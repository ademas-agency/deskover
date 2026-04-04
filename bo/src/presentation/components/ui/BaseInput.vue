<script setup lang="ts">
defineProps<{
  label?: string
  modelValue?: string
  placeholder?: string
  type?: string
  readonly?: boolean
  error?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium text-roast">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type || 'text'"
      :placeholder="placeholder"
      :readonly="readonly"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm text-espresso placeholder-steam transition-colors outline-none',
        readonly
          ? 'bg-linen border-steam/20 cursor-not-allowed'
          : 'bg-white border-steam/30 focus:border-primary focus:ring-1 focus:ring-primary/20',
        error ? 'border-red-400' : '',
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
