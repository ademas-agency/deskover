<template>
  <Transition name="cookie-banner">
    <div v-if="visible" class="fixed bottom-0 inset-x-0 z-50 p-4 lg:p-6">
      <div class="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <p class="text-[13px] text-gray-600 leading-snug flex-1">
          On utilise des cookies pour comprendre comment tu utilises Deskover.
          <NuxtLink to="/confidentialite" class="underline text-[var(--color-terracotta-500)]">En savoir plus</NuxtLink>
        </p>
        <div class="flex gap-2 shrink-0">
          <button
            class="px-4 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
            @click="decline"
          >
            Refuser
          </button>
          <button
            class="px-4 py-2 text-[13px] font-semibold text-white bg-[var(--color-terracotta-500)] rounded-lg hover:bg-[var(--color-terracotta-600)] transition-colors"
            @click="accept"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { gtag } = useGtag()

const visible = ref(false)

onMounted(() => {
  const consent = localStorage.getItem('deskover-cookies')
  if (consent === 'granted') {
    grantConsent()
  } else if (consent !== 'denied') {
    visible.value = true
  }
})

function grantConsent() {
  gtag('consent', 'update', {
    analytics_storage: 'granted'
  })
}

function accept() {
  localStorage.setItem('deskover-cookies', 'granted')
  grantConsent()
  visible.value = false
}

function decline() {
  localStorage.setItem('deskover-cookies', 'denied')
  visible.value = false
}
</script>

<style scoped>
.cookie-banner-enter-active,
.cookie-banner-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.cookie-banner-enter-from,
.cookie-banner-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
