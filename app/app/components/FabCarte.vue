<script setup lang="ts">
const loading = ref(false)
const router = useRouter()

async function handleClick(e: MouseEvent) {
  e.preventDefault()
  if (loading.value) return
  loading.value = true
  await router.push('/carte')
}
</script>

<template>
  <NuxtLink
    to="/carte"
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-[var(--color-espresso)] text-white px-6 py-3.5 rounded-full shadow-[0_4px_20px_rgba(44,40,37,0.3)] hover:shadow-[0_6px_28px_rgba(44,40,37,0.4)] transition-all duration-200 active:scale-95"
    :class="{ 'opacity-80 pointer-events-none': loading }"
    @click="handleClick"
  >
    <UIcon
      :name="loading ? 'lucide:loader-2' : 'lucide:map'"
      class="w-5 h-5"
      :class="{ 'animate-spin': loading }"
    />
    <span class="text-[14px] font-semibold">{{ loading ? 'Ouverture…' : 'Carte' }}</span>
  </NuxtLink>
</template>
