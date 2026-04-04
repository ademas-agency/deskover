<script setup lang="ts">
const route = useRoute()
const path = `/articles/${route.params.slug}`
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <ContentDoc :path="path" v-slot="{ doc }">
      <template v-if="doc">
        <!-- Header sticky -->
        <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center">
          <NuxtLink to="/" class="flex items-center">
            <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
          </NuxtLink>
          <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
          <div class="w-6" />
        </div>

        <!-- Photo hero -->
        <div class="relative h-[240px] overflow-hidden" style="border-radius: 0 0 20px 20px;">
          <img
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop"
            :alt="doc.title"
            class="w-full h-full object-cover"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        <!-- Chapeau -->
        <div class="px-5 pt-6">
          <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2.5">
            GUIDE · {{ (doc.city || '').toUpperCase() }}
          </div>
          <h1 class="font-display text-[28px] text-[var(--color-espresso)] leading-[1.05] uppercase">
            {{ doc.title }}
          </h1>
          <p class="text-[15px] text-[var(--color-roast)] leading-relaxed mt-3">
            {{ doc.description }}
          </p>
          <div class="text-xs text-[var(--color-steam)] mt-3">
            Mis à jour le {{ new Date(doc.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
          </div>
        </div>

        <!-- Contenu Markdown -->
        <ContentRenderer :value="doc" class="article-body" />

        <!-- Encart contribution -->
        <div class="mx-5 mt-8 bg-[var(--color-terracotta-500)] rounded-2xl p-5">
          <div class="font-display text-lg text-white">TU CONNAIS UN SPOT ?</div>
          <div class="text-sm text-white/80 mt-1.5">Contribue en 10 secondes et aide la communauté.</div>
          <button class="inline-block bg-white text-[var(--color-terracotta-500)] text-[13px] font-bold px-5 py-3 rounded-xl mt-3.5">
            Ajouter un lieu
          </button>
        </div>

        <!-- Footer spacer -->
        <div class="h-12" />
      </template>
    </ContentDoc>
  </div>
</template>

<style>
.article-body h2 {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-espresso);
  padding: 0 20px;
  margin-top: 48px;
  text-transform: uppercase;
}

.article-body h2::before {
  content: '· · ·';
  display: block;
  text-align: center;
  color: var(--color-steam);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  letter-spacing: 4px;
  margin-bottom: 32px;
  text-transform: none;
}

.article-body p {
  padding: 0 20px;
  margin-top: 8px;
  font-size: 15px;
  color: var(--color-roast);
  line-height: 1.7;
}

.article-body h2 + p {
  margin-top: 10px;
}

.article-body hr {
  border: none;
  text-align: center;
  margin: 8px 0 24px;
  color: var(--color-steam);
  font-size: 16px;
  letter-spacing: 4px;
}

.article-body hr::after {
  content: '· · ·';
}

.article-body ul, .article-body ol {
  padding: 12px 20px 0 40px;
  font-size: 15px;
  color: var(--color-roast);
  line-height: 1.7;
}

.article-body li {
  margin-bottom: 6px;
}

.article-body strong {
  color: var(--color-espresso);
  font-weight: 700;
}

.article-body h1 {
  display: none;
}
</style>
