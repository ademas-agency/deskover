<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabaseAuth as supabase } from '../../infrastructure/api/client'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  error.value = ''

  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  loading.value = false

  if (err) {
    error.value = 'Email ou mot de passe incorrect'
    return
  }

  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-espresso">
          <span class="text-primary">Desk</span>over
        </h1>
        <p class="text-sm text-steam mt-1">Backoffice</p>
      </div>

      <form @submit.prevent="handleLogin" class="bg-white rounded-2xl border border-steam/15 shadow-sm p-8 space-y-5">
        <div>
          <label class="block text-xs font-medium text-roast mb-1.5">Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="adelaide@deskover.fr"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2.5 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-roast mb-1.5">Mot de passe</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full rounded-lg border border-steam/30 bg-white px-3 py-2.5 text-sm text-espresso placeholder-steam outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            required
          />
        </div>

        <p v-if="error" class="text-sm text-primary text-center">{{ error }}</p>

        <button
          type="submit"
          class="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>
