<script setup lang="ts">
const props = defineProps<{ placeId: string; placeName: string }>()
const emit = defineEmits<{ close: []; submitted: [] }>()

const client = useSupabaseClient()

const criteria = [
  { key: 'wifi', icon: 'lucide:wifi', label: 'WiFi', options: ['Nul', 'Moyen', 'Bon'] },
  { key: 'power', icon: 'lucide:zap', label: 'Prises', options: ['Aucune', 'Rares', 'Partout'] },
  { key: 'noise', icon: 'lucide:ear', label: 'Bruit', options: ['Bruyant', 'Ok', 'Calme'] },
  { key: 'comfort', icon: 'lucide:armchair', label: 'Confort', options: ['Bof', 'Correct', 'Top'] },
]

const values = ref<Record<string, number>>({})
const step = ref(0) // 0-3 = criteria, 4 = submitting, 5 = done
const submitting = ref(false)
const error = ref('')

const currentCriterion = computed(() => criteria[step.value])
const allDone = computed(() => Object.keys(values.value).length === 4)

function select(value: number) {
  values.value[currentCriterion.value.key] = value
  if (step.value < 3) {
    step.value++
  } else {
    submit()
  }
}

function getFingerprint() {
  const stored = localStorage.getItem('deskover_fp')
  if (stored) return stored
  const fp = crypto.randomUUID()
  localStorage.setItem('deskover_fp', fp)
  return fp
}

async function submit() {
  submitting.value = true
  error.value = ''

  const { error: err } = await client.from('ratings').insert({
    place_id: props.placeId,
    fingerprint: getFingerprint(),
    wifi: values.value.wifi,
    power: values.value.power,
    noise: values.value.noise,
    comfort: values.value.comfort,
  })

  submitting.value = false

  if (err) {
    if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
      error.value = 'Tu as déjà noté ce lieu.'
    } else {
      error.value = 'Oups, une erreur est survenue.'
    }
    return
  }

  step.value = 5
  setTimeout(() => emit('submitted'), 1500)
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-[100] flex items-end justify-center" @click.self="emit('close')">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

    <!-- Modal -->
    <div
      class="relative w-full max-w-[430px] bg-[var(--color-cream)] rounded-t-[24px] px-6 pt-6 pb-10 z-10"
      style="animation: slideUp 0.3s ease-out;"
    >
      <!-- Handle -->
      <div class="w-10 h-1 bg-[var(--color-parchment)] rounded-full mx-auto mb-5" />

      <!-- Step: Criteria -->
      <template v-if="step < 4 && !submitting && step !== 5">
        <h3 class="font-display text-lg text-[var(--color-espresso)] text-center">
          {{ placeName }}
        </h3>

        <!-- Progress -->
        <div class="flex gap-1.5 mt-4 mb-6">
          <div
            v-for="i in 4"
            :key="i"
            class="h-1 flex-1 rounded-full transition-colors duration-300"
            :class="i - 1 <= step ? 'bg-[var(--color-terracotta-500)]' : 'bg-[var(--color-parchment)]'"
          />
        </div>

        <!-- Question -->
        <div class="text-center mb-6">
          <UIcon :name="currentCriterion.icon" class="w-8 h-8 text-[var(--color-steam)] mx-auto mb-2" />
          <p class="text-[15px] text-[var(--color-roast)] font-medium">
            {{ currentCriterion.label }}, c'est comment ?
          </p>
        </div>

        <!-- Options (3 choix) -->
        <div class="flex gap-3">
          <button
            v-for="(option, i) in currentCriterion.options"
            :key="i"
            class="flex-1 py-4 rounded-2xl text-center transition-all duration-200 border-2"
            :class="values[currentCriterion.key] === i + 1
              ? 'bg-[var(--color-terracotta-500)] text-white border-[var(--color-terracotta-500)]'
              : 'bg-white text-[var(--color-espresso)] border-[var(--color-parchment)] hover:border-[var(--color-terracotta-500)]'"
            @click="select(i + 1)"
          >
            <span class="text-xs font-semibold">{{ option }}</span>
          </button>
        </div>
      </template>

      <!-- Step: Submitting -->
      <template v-if="submitting">
        <div class="text-center py-8">
          <div class="w-8 h-8 border-3 border-[var(--color-terracotta-500)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p class="text-sm text-[var(--color-steam)] mt-3">Envoi en cours...</p>
        </div>
      </template>

      <!-- Step: Done -->
      <template v-if="step === 5 && !submitting">
        <div class="text-center py-8">
          <UIcon name="lucide:check-circle" class="w-12 h-12 text-[var(--color-monstera)] mx-auto" />
          <p class="font-display text-lg text-[var(--color-espresso)] mt-3">Merci pour ton avis</p>
          <p class="text-sm text-[var(--color-steam)] mt-1">Ça aide toute la communauté.</p>
        </div>
      </template>

      <!-- Error -->
      <p v-if="error" class="text-center text-sm text-[var(--color-terracotta-500)] mt-4">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<style>
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
