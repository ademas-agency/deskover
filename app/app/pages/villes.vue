<script setup lang="ts">
const { getCities } = usePlaces()
const client = useSupabaseClient()
const { data: cities } = await useAsyncData('all-cities', async () => {
  const raw = await getCities()
  return raw.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
})

const requestedCity = ref<string | null>(null)

async function requestCity(cityName: string) {
  await client.from('messages').insert({
    name: 'Visiteur',
    email: 'auto@deskover.fr',
    subject: `Demande de spots : ${cityName}`,
    message: `Un visiteur cherche des spots pour travailler à ${cityName}.`
  })
  requestedCity.value = cityName
}

useSeoMeta({
  title: 'Toutes les villes — Deskover',
  ogTitle: 'Toutes les villes — Deskover',
  description: 'Retrouve tous les guides par ville pour trouver les meilleurs spots où bosser en France. Cafés, coworkings, tiers-lieux — ville par ville.',
  ogDescription: 'Tous les guides par ville pour trouver les meilleurs spots où bosser en France.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://www.deskover.fr/villes' }]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 pt-safe flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <!-- Desktop header -->
    <div class="hidden lg:block pt-6 pb-4">
      <div class="lg:container-deskover flex items-center justify-between">
        <NuxtLink to="/" class="font-display text-base text-[var(--color-espresso)] tracking-[0.15em]">DESKOVER</NuxtLink>
        <NuxtLink to="/search">
          <UIcon name="lucide:search" class="w-[22px] h-[22px] text-[var(--color-espresso)]" />
        </NuxtLink>
      </div>
    </div>

    <div class="px-5 pt-6 lg:container-deskover">
      <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2">
        {{ cities?.length || 0 }} villes
      </div>
      <h1 class="font-display text-[26px] lg:text-[36px] text-[var(--color-espresso)] leading-[1.1] uppercase">
        Toutes les villes
      </h1>
      <p class="text-[15px] text-[var(--color-roast)] leading-relaxed mt-3 max-w-lg">
        Nos guides par ville pour trouver le spot parfait près de chez toi.
      </p>
    </div>

    <div class="px-5 pt-8 pb-12 lg:container-deskover">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <template v-for="city in cities" :key="city.slug">
          <!-- Ville avec des spots -->
          <div
            v-if="city.count > 0"
            class="bg-[var(--color-linen)] px-4 py-3.5 rounded-[14px]"
          >
            <NuxtLink :to="`/ville/${city.slug}`" class="flex items-center justify-between">
              <div>
                <div class="text-[14px] font-semibold text-[var(--color-espresso)]">{{ city.name }}</div>
                <div class="text-[12px] text-[var(--color-steam)] mt-0.5">{{ city.count }} spots</div>
              </div>
              <UIcon name="lucide:chevron-right" class="w-4 h-4 text-[var(--color-steam)] shrink-0" />
            </NuxtLink>
            <NuxtLink to="/ajouter" class="inline-block mt-2 text-[12px] font-semibold text-[var(--color-terracotta-500)]">Proposer un spot</NuxtLink>
          </div>

          <!-- Ville sans spots -->
          <div
            v-else
            class="bg-[var(--color-linen)] px-4 py-3.5 rounded-[14px]"
          >
            <div class="text-[14px] font-semibold text-[var(--color-espresso)]">{{ city.name }}</div>
            <div class="text-[12px] text-[var(--color-steam)] mt-0.5">Pas encore de spots</div>
            <div class="flex gap-3 mt-2.5">
              <NuxtLink to="/ajouter" class="text-[12px] font-semibold text-[var(--color-terracotta-500)]">Proposer un spot</NuxtLink>
              <button @click="requestCity(city.name)" class="text-[12px] font-semibold text-[var(--color-terracotta-500)]">Je cherche un spot</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Modal confirmation -->
    <Transition name="fade">
      <div v-if="requestedCity" class="fixed inset-0 z-50 flex items-center justify-center px-6" @click="requestedCity = null">
        <div class="absolute inset-0 bg-black/40" />
        <div class="relative bg-white rounded-2xl px-6 py-8 max-w-sm w-full text-center shadow-xl" @click.stop>
          <UIcon name="lucide:search-check" class="w-10 h-10 text-[var(--color-monstera)] mx-auto" />
          <p class="text-[15px] text-[var(--color-espresso)] font-semibold mt-4 leading-snug">
            Merci, on va chercher activement des spots pour travailler à {{ requestedCity }}
          </p>
          <button @click="requestedCity = null" class="mt-5 px-6 py-2.5 rounded-xl bg-[var(--color-terracotta-500)] text-white text-[13px] font-bold">
            OK
          </button>
        </div>
      </div>
    </Transition>

    <DeskoverFooter />
  </div>
</template>
