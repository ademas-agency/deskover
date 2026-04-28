<script setup lang="ts">
const client = useSupabaseClient()

const { data: articles } = await useAsyncData('terrasse-articles', async () => {
  const { data } = await client
    .from('articles')
    .select('slug, title, description, city, city_slug, cover_image, published_at')
    .eq('published', true)
    .like('slug', 'terrasse-%')
    .order('city', { ascending: true })
  return data || []
})

useSeoMeta({
  title: 'Où bosser en terrasse cet été : nos guides ville par ville — Deskover',
  ogTitle: 'Où bosser en terrasse cet été : nos guides ville par ville',
  description: 'Notre sélection des meilleures terrasses pour télétravailler dans 30 villes françaises. Cafés, coworkings, rooftops : tous les bons spots pour bosser dehors cet été.',
  ogDescription: 'Notre sélection des meilleures terrasses pour télétravailler dans 30 villes françaises.',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://www.deskover.fr/themes/terrasse-ete' }]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header mobile -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 pt-safe flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <!-- Header desktop -->
    <div class="hidden lg:block pt-6 pb-4">
      <div class="lg:container-deskover flex items-center justify-between">
        <NuxtLink to="/" class="font-display text-base text-[var(--color-espresso)] tracking-[0.15em]">DESKOVER</NuxtLink>
        <NuxtLink to="/search">
          <UIcon name="lucide:search" class="w-[22px] h-[22px] text-[var(--color-espresso)]" />
        </NuxtLink>
      </div>
    </div>

    <!-- Hero -->
    <div class="px-5 pt-6 lg:container-deskover">
      <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2">
        Dossier saisonnier · {{ articles?.length || 0 }} villes
      </div>
      <h1 class="font-display text-[26px] lg:text-[40px] text-[var(--color-espresso)] leading-[1.1] uppercase">
        Où bosser en terrasse cet été
      </h1>
      <p class="text-[15px] lg:text-[17px] text-[var(--color-roast)] leading-relaxed mt-3 max-w-2xl">
        Notre sélection des meilleures terrasses pour télétravailler en France. Cafés ombragés, coworkings avec rooftop, lobbys d'hôtel, péniches : on a trié les vrais bons spots, ville par ville, pour que tu puisses bosser dehors sans cuire ni galérer côté WiFi.
      </p>
    </div>

    <!-- Liste des articles -->
    <div class="px-5 pt-8 pb-12 lg:container-deskover">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="article in articles"
          :key="article.slug"
          :to="`/articles/${article.slug}`"
          class="group bg-[var(--color-linen)] rounded-[14px] overflow-hidden hover:shadow-md transition-shadow"
        >
          <div class="aspect-[16/9] bg-[var(--color-cream)] overflow-hidden">
            <img
              :src="article.cover_image || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=450&fit=crop'"
              :alt="article.title"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div class="px-4 py-3.5">
            <div class="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-terracotta-500)] mb-1">
              {{ article.city }}
            </div>
            <div class="text-[15px] font-semibold text-[var(--color-espresso)] leading-snug">
              {{ article.title }}
            </div>
            <p v-if="article.description" class="text-[13px] text-[var(--color-roast)] leading-relaxed mt-2 line-clamp-2">
              {{ article.description }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Bloc "À explorer aussi" -->
    <div class="px-5 pb-16 lg:container-deskover">
      <div class="bg-[var(--color-linen)] rounded-[18px] px-6 py-8 max-w-3xl">
        <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2">
          À explorer aussi
        </div>
        <h2 class="font-display text-[20px] lg:text-[26px] text-[var(--color-espresso)] leading-tight uppercase mb-3">
          D'autres façons de trouver ton spot
        </h2>
        <p class="text-[14px] text-[var(--color-roast)] leading-relaxed mb-4">
          Tu cherches autre chose qu'une terrasse ? On a aussi des guides complets par ville (cafés, coworkings, tiers-lieux confondus), et une carte qui regroupe tous les spots Deskover.
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/villes" class="inline-block px-4 py-2 rounded-full bg-white text-[13px] font-semibold text-[var(--color-espresso)] hover:bg-[var(--color-cream)]">
            Tous les guides ville
          </NuxtLink>
          <NuxtLink to="/carte" class="inline-block px-4 py-2 rounded-full bg-white text-[13px] font-semibold text-[var(--color-espresso)] hover:bg-[var(--color-cream)]">
            Voir la carte
          </NuxtLink>
        </div>
      </div>
    </div>

    <DeskoverFooter />
  </div>
</template>
