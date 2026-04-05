<template>
  <footer class="bg-[var(--color-espresso)] rounded-t-3xl px-5 pt-10 pb-12">
    <!-- Accroche -->
    <div class="font-display text-sm text-[var(--color-terracotta-500)] tracking-[0.15em]">DESKOVER</div>
    <p class="text-[15px] text-white/80 leading-relaxed mt-2 max-w-[280px]">
      Les meilleurs spots pour bosser, ville par ville. Testés, triés, approuvés.
    </p>

    <!-- Guides par ville -->
    <div class="mt-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Guides par ville</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2">
        <NuxtLink v-for="city in cities" :key="city.slug" :to="`/articles/${city.slug}`" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">
          {{ city.name }}
        </NuxtLink>
      </div>
      <NuxtLink to="/articles" class="inline-block mt-3 text-xs text-[var(--color-terracotta-500)] font-semibold">Tous nos guides →</NuxtLink>
    </div>

    <!-- Deskover -->
    <div class="mt-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Deskover</div>
      <div class="flex flex-col gap-2.5">
        <NuxtLink to="/a-propos" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Qui sommes-nous</NuxtLink>
        <NuxtLink to="/ajouter" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Proposer un lieu</NuxtLink>
        <NuxtLink to="/contact" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Contact</NuxtLink>
      </div>
    </div>

    <!-- Suivre -->
    <div class="mt-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Suivre Deskover</div>
      <div class="flex gap-4">
        <a href="https://instagram.com/deskover" target="_blank" rel="noopener" class="text-white/50 hover:text-[var(--color-terracotta-500)] transition-colors">
          <UIcon name="lucide:instagram" class="w-5 h-5" />
        </a>
        <a href="https://tiktok.com/@deskover" target="_blank" rel="noopener" class="text-white/50 hover:text-[var(--color-terracotta-500)] transition-colors">
          <UIcon name="lucide:music-2" class="w-5 h-5" />
        </a>
      </div>
    </div>

    <!-- Signature -->
    <div class="mt-8 pt-7 border-t border-white/[0.08]">
      <p class="text-[11px] text-white/25">&copy; 2026 Deskover · Adé &amp; Thomas</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const cities = [
  { name: 'Paris', slug: 'travailler-paris-1e' },
  { name: 'Lyon', slug: 'travailler-lyon' },
  { name: 'Bordeaux', slug: 'travailler-bordeaux' },
  { name: 'Nantes', slug: 'travailler-nantes' },
  { name: 'Toulouse', slug: 'travailler-toulouse' },
  { name: 'Montpellier', slug: 'travailler-montpellier' },
  { name: 'Rennes', slug: 'travailler-rennes' },
  { name: 'Strasbourg', slug: 'travailler-strasbourg' },
  { name: 'Nice', slug: 'travailler-nice' },
  { name: 'Grenoble', slug: 'travailler-grenoble' }
]
</script>
