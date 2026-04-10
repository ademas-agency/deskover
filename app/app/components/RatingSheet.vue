<script setup lang="ts">
const props = defineProps<{
  placeName: string
  fullscreen?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [ratings: { wifi: string; prises: string; pricing: string; mood: string }, speedTest: { download: number; upload: number; ping: number } | null]
}>()

const ratings = reactive({
  wifi: '',
  prises: '',
  pricing: '',
  mood: '',
})

const hasRated = computed(() => Object.values(ratings).some(v => v !== ''))

// Speed test
const isNearby = ref(false)
const runningSpeedTest = ref(false)
const speedTestResult = ref<{ download: number; upload: number; ping: number } | null>(null)
const speedTestProgress = ref('')

function wifiLabelFromSpeed(mbps: number): string {
  if (mbps >= 25) return 'Rapide'
  if (mbps >= 10) return 'Bon'
  return 'Faible'
}

async function runSpeedTest() {
  runningSpeedTest.value = true
  speedTestResult.value = null

  try {
    speedTestProgress.value = 'Ping...'
    const pings: number[] = []
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now()
      await fetch(`https://speed.cloudflare.com/__down?bytes=0&_=${Date.now()}${i}`, { cache: 'no-store' })
      pings.push(performance.now() - t0)
    }
    const ping = Math.round(pings.sort((a, b) => a - b)[1])

    speedTestProgress.value = 'Préparation...'
    await fetch(`https://speed.cloudflare.com/__down?bytes=1000000&_=${Date.now()}`, { cache: 'no-store' }).then(r => r.arrayBuffer())

    speedTestProgress.value = 'Téléchargement...'
    const dlResponse = await fetch(`https://speed.cloudflare.com/__down?bytes=100000000&_=${Date.now()}`, { cache: 'no-store' })
    const reader = dlResponse.body!.getReader()
    let totalBytes = 0
    const dlStart = performance.now()
    const checkpoints: { time: number; bytes: number }[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      checkpoints.push({ time: performance.now(), bytes: totalBytes })
      if (checkpoints.length % 20 === 0) {
        const elapsed = (performance.now() - dlStart) / 1000
        const mbps = Math.round((totalBytes * 8) / elapsed / 1000000)
        speedTestProgress.value = `${mbps} Mbps`
      }
    }

    const startIdx = Math.floor(checkpoints.length * 0.1)
    const endIdx = Math.floor(checkpoints.length * 0.9)
    let download: number
    if (endIdx > startIdx + 5) {
      const midBytes = checkpoints[endIdx].bytes - checkpoints[startIdx].bytes
      const midTime = (checkpoints[endIdx].time - checkpoints[startIdx].time) / 1000
      download = Math.round((midBytes * 8) / midTime / 1000000)
    } else {
      const dlDuration = (performance.now() - dlStart) / 1000
      download = Math.round((totalBytes * 8) / dlDuration / 1000000)
    }

    speedTestProgress.value = 'Upload...'
    const ulData = new Uint8Array(10000000)
    const ulStart = performance.now()
    try {
      await fetch(`https://speed.cloudflare.com/__up?_=${Date.now()}`, { method: 'POST', body: ulData, cache: 'no-store' })
    } catch {}
    const upload = Math.round((10000000 * 8) / ((performance.now() - ulStart) / 1000) / 1000000)

    speedTestResult.value = { download, upload, ping }
    ratings.wifi = wifiLabelFromSpeed(download)
  } catch {
    speedTestResult.value = null
  } finally {
    runningSpeedTest.value = false
    speedTestProgress.value = ''
  }
}

// Colors (identical to fiche lieu)
const optionColors: Record<string, Record<string, string>> = {
  wifi: { Faible: 'bg-[var(--color-terracotta-500)]', Bon: 'bg-[var(--color-edison)]', Rapide: 'bg-[var(--color-monstera)]' },
  prises: { Aucune: 'bg-[var(--color-terracotta-500)]', 'Quelques-unes': 'bg-[var(--color-edison)]', Plein: 'bg-[var(--color-monstera)]' },
  pricing: { Gratuit: 'bg-[var(--color-monstera)]', Payant: 'bg-[var(--color-edison)]' },
  mood: { Calme: 'bg-[var(--color-monstera)]', 'Animé': 'bg-[var(--color-edison)]' },
}

function ratingBtnClass(vital: string, opt: string, currentValue: string) {
  if (currentValue === opt) {
    return (optionColors[vital]?.[opt] || 'bg-[var(--color-monstera)]') + ' text-white shadow-sm'
  }
  return 'bg-white text-[var(--color-roast)]'
}

function ratingIconActive(vital: string) {
  const val = ratings[vital as keyof typeof ratings]
  if (!val) return 'text-[var(--color-steam)]'
  const colors = optionColors[vital] || {}
  const cls = colors[val] || ''
  if (cls.includes('monstera')) return 'text-[var(--color-monstera)]'
  if (cls.includes('edison')) return 'text-[var(--color-edison)]'
  if (cls.includes('terracotta')) return 'text-[var(--color-terracotta-500)]'
  return 'text-[var(--color-steam)]'
}

// Geoloc check
onMounted(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(() => {
      isNearby.value = true
    }, () => {}, { timeout: 3000 })
  }
})

function handleSubmit() {
  emit('submit', { ...ratings }, speedTestResult.value)
}
</script>

<template>
  <div class="bg-[var(--color-cream)]" :class="fullscreen ? 'min-h-screen' : 'rounded-t-3xl max-h-[92vh] overflow-y-auto'">
    <div :class="fullscreen ? 'lg:max-w-[680px] lg:mx-auto lg:px-8' : ''">
    <!-- Handle (bottom sheet only) -->
    <div v-if="!fullscreen" class="flex justify-center pt-3 pb-1">
      <div class="w-10 h-1 rounded-full bg-[var(--color-parchment)]" />
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5" :class="fullscreen ? 'pt-6 pb-3' : 'pb-3'">
      <h3 class="font-display text-base text-[var(--color-espresso)] tracking-[0.05em]">{{ placeName }}</h3>
      <button v-if="!fullscreen" @click="emit('close')" class="w-8 h-8 rounded-full bg-[var(--color-linen)] flex items-center justify-center">
        <UIcon name="lucide:x" class="w-4 h-4 text-[var(--color-steam)]" />
      </button>
    </div>

    <p v-if="fullscreen" class="px-5 text-[14px] text-[var(--color-roast)] mb-4">Comment c'est pour bosser ?</p>

    <!-- Rating cards -->
    <div class="px-5 flex flex-col gap-3 pb-4">
      <!-- WiFi -->
      <div class="bg-[var(--color-linen)] rounded-2xl p-4">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <UIcon name="lucide:wifi" class="w-5 h-5" :class="ratingIconActive('wifi')" />
          </div>
          <span class="text-[13px] font-bold text-[var(--color-espresso)]">WiFi</span>
        </div>

        <!-- Speed test -->
        <template v-if="isNearby">
          <div class="h-[48px] flex items-center">
            <button
              v-if="!speedTestResult && !runningSpeedTest"
              class="w-full h-[48px] rounded-xl text-[13px] font-semibold bg-white text-[var(--color-espresso)] flex items-center justify-center gap-2 active:scale-[0.98]"
              @click="runSpeedTest"
            >
              <UIcon name="lucide:gauge" class="w-4 h-4 text-[var(--color-terracotta-500)]" />
              Tester le débit
            </button>
            <div v-else-if="runningSpeedTest" class="w-full h-[48px] bg-white rounded-xl flex items-center justify-center gap-2.5">
              <div class="w-5 h-5 rounded-full border-2 border-[var(--color-terracotta-500)] border-t-transparent animate-spin flex-shrink-0" />
              <p class="text-xs font-semibold text-[var(--color-espresso)]">{{ speedTestProgress || 'Mesure en cours...' }}</p>
            </div>
            <div v-else-if="speedTestResult" class="w-full h-[48px] bg-white rounded-xl px-3 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex flex-col items-center justify-center flex-shrink-0" :class="speedTestResult.download >= 25 ? 'bg-[#e8f5e9]' : speedTestResult.download >= 10 ? 'bg-[#fff8e1]' : 'bg-[#fce4ec]'">
                <span class="font-mono text-sm font-bold leading-none" :class="speedTestResult.download >= 25 ? 'text-[var(--color-monstera)]' : speedTestResult.download >= 10 ? 'text-[var(--color-edison)]' : 'text-[var(--color-terracotta-500)]'">{{ speedTestResult.download }}</span>
                <span class="font-mono text-[7px] text-[var(--color-steam)]">Mbps</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold" :class="speedTestResult.download >= 25 ? 'text-[var(--color-monstera)]' : speedTestResult.download >= 10 ? 'text-[var(--color-edison)]' : 'text-[var(--color-terracotta-500)]'">{{ ratings.wifi }}</p>
                <p class="font-mono text-[9px] text-[var(--color-steam)] truncate">{{ speedTestResult.download }} Mbps / {{ speedTestResult.ping }}ms</p>
              </div>
              <button @click="runSpeedTest" class="w-8 h-8 rounded-full bg-[var(--color-linen)] flex items-center justify-center flex-shrink-0">
                <UIcon name="lucide:refresh-cw" class="w-3.5 h-3.5 text-[var(--color-steam)]" />
              </button>
            </div>
          </div>
          <p class="text-[10px] text-[var(--color-steam)] text-center mt-1.5 italic">Vérifie que tu es sur le WiFi du lieu, pas en partage de co.</p>
        </template>

        <!-- Manual buttons -->
        <template v-else>
          <div class="flex gap-2">
            <button
              v-for="opt in ['Faible', 'Bon', 'Rapide']" :key="opt"
              class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
              :class="ratingBtnClass('wifi', opt, ratings.wifi)"
              @click="ratings.wifi = ratings.wifi === opt ? '' : opt"
            >{{ opt }}</button>
          </div>
          <p class="text-[10px] text-[var(--color-steam)] text-center mt-2 italic">N'indique la qualité du WiFi que si tu as vraiment testé</p>
        </template>
      </div>

      <!-- Prises -->
      <div class="bg-[var(--color-linen)] rounded-2xl p-4">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <UIcon name="lucide:zap" class="w-5 h-5" :class="ratingIconActive('prises')" />
          </div>
          <span class="text-[13px] font-bold text-[var(--color-espresso)]">Prises</span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="opt in ['Aucune', 'Quelques-unes', 'Plein']" :key="opt"
            class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
            :class="ratingBtnClass('prises', opt, ratings.prises)"
            @click="ratings.prises = ratings.prises === opt ? '' : opt"
          >{{ opt }}</button>
        </div>
      </div>

      <!-- Tarif -->
      <div class="bg-[var(--color-linen)] rounded-2xl p-4">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <UIcon name="lucide:euro" class="w-5 h-5" :class="ratingIconActive('pricing')" />
          </div>
          <span class="text-[13px] font-bold text-[var(--color-espresso)]">Accès</span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="opt in ['Gratuit', 'Payant']" :key="opt"
            class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
            :class="ratingBtnClass('pricing', opt, ratings.pricing)"
            @click="ratings.pricing = ratings.pricing === opt ? '' : opt"
          >{{ opt }}</button>
        </div>
      </div>

      <!-- Mood -->
      <div class="bg-[var(--color-linen)] rounded-2xl p-4">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
            <UIcon name="lucide:activity" class="w-5 h-5" :class="ratingIconActive('mood')" />
          </div>
          <span class="text-[13px] font-bold text-[var(--color-espresso)]">Mood</span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="opt in ['Calme', 'Animé']" :key="opt"
            class="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
            :class="ratingBtnClass('mood', opt, ratings.mood)"
            @click="ratings.mood = ratings.mood === opt ? '' : opt"
          >{{ opt }}</button>
        </div>
      </div>
    </div>

    <!-- Submit -->
    <div class="px-5 pb-10">
      <slot name="error" />
      <button
        class="w-full py-3.5 rounded-[14px] text-sm font-bold transition-all duration-200"
        :class="hasRated ? 'bg-[var(--color-terracotta-500)] text-[var(--color-cream)]' : 'bg-[var(--color-parchment)] text-[var(--color-steam)]'"
        :disabled="!hasRated"
        @click="handleSubmit"
      >
        <slot name="submit-label">Envoyer</slot>
      </button>
      <slot name="footer" />
    </div>
    </div>
  </div>
</template>
