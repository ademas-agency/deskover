<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title?: string
  noPadding?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
}>(), {
  collapsible: false,
  defaultCollapsed: false,
})

const collapsed = ref(props.defaultCollapsed)

function toggle() {
  if (props.collapsible) collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="bg-white rounded-xl border border-steam/15 shadow-sm">
    <div
      v-if="title"
      style="padding: 20px 32px"
      :class="['border-b border-steam/10 flex items-center justify-between', collapsible && 'cursor-pointer select-none', collapsed && 'border-b-0']"
      @click="toggle"
    >
      <h3 class="text-base font-bold text-espresso">{{ title }}</h3>
      <ChevronDown
        v-if="collapsible"
        :size="18"
        :class="['text-steam transition-transform', !collapsed && 'rotate-180']"
      />
    </div>
    <template v-if="!collapsed">
      <div v-if="noPadding">
        <slot />
      </div>
      <div v-else style="padding: 32px">
        <slot />
      </div>
    </template>
  </div>
</template>
