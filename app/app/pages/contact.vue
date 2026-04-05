<script setup lang="ts">
const client = useSupabaseClient()

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return

  submitting.value = true
  error.value = ''

  const { error: err } = await client.from('messages').insert({
    name: form.name.trim(),
    email: form.email.trim(),
    subject: form.subject.trim() || null,
    message: form.message.trim(),
  })

  submitting.value = false

  if (err) {
    error.value = 'Une erreur est survenue. Réessaie dans quelques instants.'
    return
  }

  submitted.value = true
}

const canSubmit = computed(() => form.name.trim() && form.email.trim() && form.message.trim())

useHead({
  title: 'Contact - Deskover',
  meta: [
    { name: 'description', content: 'Une question, un lieu à signaler, une idée ? Écris-nous.' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header desktop only -->
    <div class="hidden lg:block">
      <DeskoverHeader />
    </div>

    <!-- Header sticky mobile -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">CONTACT</span>
      <div class="w-6" />
    </div>

    <!-- Contenu -->
    <div class="px-5 pt-6 pb-24 lg:pb-0 lg:max-w-[600px] lg:mx-auto">
      <h1 class="font-display text-[22px] text-[var(--color-espresso)]">On t'écoute</h1>
      <p class="text-[14px] text-[var(--color-roast)] mt-2">
        Une question, un lieu à signaler, un bug, une idée ? Écris-nous, on lit tout.
      </p>

      <!-- Formulaire -->
      <form v-if="!submitted" class="mt-8 flex flex-col gap-5" @submit.prevent="handleSubmit">
        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Ton prénom</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Adé"
            class="w-full mt-2 bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)]"
          >
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Ton email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="ade@deskover.fr"
            class="w-full mt-2 bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)]"
          >
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Sujet (optionnel)</label>
          <input
            v-model="form.subject"
            type="text"
            placeholder="Un lieu fermé, une idée, un bug..."
            class="w-full mt-2 bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)]"
          >
        </div>

        <div>
          <label class="text-xs font-bold uppercase tracking-wide text-[var(--color-steam)]">Ton message</label>
          <textarea
            v-model="form.message"
            rows="5"
            placeholder="Dis-nous tout..."
            class="w-full mt-2 bg-white rounded-2xl px-4 py-3.5 text-[15px] text-[var(--color-espresso)] placeholder:text-[var(--color-steam)] outline-none shadow-[0_2px_8px_rgba(44,40,37,0.06)] resize-y"
          />
        </div>

        <p v-if="error" class="text-sm text-[var(--color-terracotta-500)] text-center">{{ error }}</p>
      </form>

      <!-- CTA fixe en bas -->
      <div v-if="!submitted" class="fixed bottom-0 left-0 right-0 p-4 pb-9 bg-gradient-to-t from-[var(--color-cream)] via-[var(--color-cream)] to-transparent z-40 lg:static lg:mt-8 lg:p-0 lg:bg-transparent lg:pb-0">
        <button
          class="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
          :class="canSubmit ? 'bg-[var(--color-terracotta-500)] text-white' : 'bg-[var(--color-parchment)] text-[var(--color-steam)]'"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          {{ submitting ? 'Envoi...' : 'Envoyer' }}
        </button>
      </div>

      <!-- Confirmation -->
      <div v-else class="mt-12 text-center">
        <UIcon name="lucide:check-circle" class="w-12 h-12 text-[var(--color-monstera)] mx-auto" />
        <h2 class="font-display text-[20px] text-[var(--color-espresso)] mt-4">Message envoyé</h2>
        <p class="text-[14px] text-[var(--color-roast)] mt-2 leading-relaxed">
          Merci {{ form.name }}, on te répond dès que possible.
        </p>
        <NuxtLink
          to="/"
          class="inline-block mt-8 px-8 py-3.5 rounded-2xl bg-[var(--color-terracotta-500)] text-white text-sm font-bold"
        >
          Retour à l'accueil
        </NuxtLink>
      </div>
    </div>

  </div>
</template>
