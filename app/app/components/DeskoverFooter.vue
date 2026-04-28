<template>
  <footer class="bg-[var(--color-espresso)] rounded-t-3xl px-5 pt-10 pb-12 lg:rounded-none lg:px-8">
    <div class="lg:container-deskover">
      <!-- Mobile layout -->
      <div class="lg:hidden">
        <div class="font-display text-sm text-[var(--color-terracotta-500)] tracking-[0.15em]">DESKOVER</div>
        <p class="text-[14px] text-white/70 leading-relaxed mt-2 max-w-[280px]">
          Les meilleurs spots pour bosser, ville par ville. Testés, triés, approuvés.
        </p>
        <div class="flex gap-4 mt-4">
          <a href="https://instagram.com/deskover.fr" target="_blank" rel="noopener" class="text-white/40 hover:text-[var(--color-terracotta-500)] transition-colors">
            <UIcon name="lucide:instagram" class="w-5 h-5" />
          </a>
          <a href="https://tiktok.com/@deskover" target="_blank" rel="noopener" class="text-white/40 hover:text-[var(--color-terracotta-500)] transition-colors">
            <UIcon name="lucide:music-2" class="w-5 h-5" />
          </a>
        </div>

        <div class="mt-8">
          <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">À lire</div>
          <div class="flex flex-col gap-2.5">
            <NuxtLink v-for="city in cities.slice(0, 4)" :key="city.slug" :to="`/articles/${city.slug}`" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">
              Bosser à {{ city.name }}
            </NuxtLink>
            <NuxtLink to="/villes" class="inline-block mb-1 text-xs text-[var(--color-terracotta-500)] font-semibold">Toutes les villes →</NuxtLink>
            <NuxtLink to="/articles/cafe-ou-coworking" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Café ou coworking ?</NuxtLink>
            <NuxtLink to="/themes/terrasse-ete" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Bosser en terrasse cet été</NuxtLink>
          </div>
        </div>

        <div class="mt-8">
          <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Deskover</div>
          <div class="flex flex-col gap-2.5">
            <NuxtLink to="/a-propos" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Qui sommes-nous</NuxtLink>
            <NuxtLink to="/ajouter" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Proposer un lieu</NuxtLink>
            <NuxtLink to="/contact" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Contact</NuxtLink>
            <NuxtLink to="/mentions-legales" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Mentions légales</NuxtLink>
            <NuxtLink to="/confidentialite" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Confidentialité</NuxtLink>
          </div>
        </div>

        <div class="mt-8 pt-7 border-t border-white/[0.08]">
          <p class="text-[11px] text-white/25">&copy; 2026 Deskover - Adé &amp; Thomas</p>
          <p class="text-[11px] text-white/15 italic mt-1">Fait avec du bon café et beaucoup de WiFi.</p>
        </div>
      </div>

      <!-- Desktop layout -->
      <div class="hidden lg:block pt-16 pb-12">
        <div class="grid grid-cols-3 gap-12">
          <!-- Col 1: Logo + accroche -->
          <div>
            <div class="font-display text-lg text-[var(--color-terracotta-500)] tracking-[0.12em]">DESKOVER</div>
            <p class="text-[14px] text-white/70 leading-relaxed mt-3">
              Les meilleurs spots pour bosser, ville par ville. Testés, triés, approuvés.
            </p>
            <div class="flex gap-4 mt-5">
              <a href="https://instagram.com/deskover.fr" target="_blank" rel="noopener" class="text-white/40 hover:text-[var(--color-terracotta-500)] transition-colors">
                <UIcon name="lucide:instagram" class="w-5 h-5" />
              </a>
              <a href="https://tiktok.com/@deskover" target="_blank" rel="noopener" class="text-white/40 hover:text-[var(--color-terracotta-500)] transition-colors">
                <UIcon name="lucide:music-2" class="w-5 h-5" />
              </a>
            </div>
          </div>

          <!-- Col 2: À lire -->
          <div>
            <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">À lire</div>
            <div class="flex flex-col gap-2.5">
              <NuxtLink v-for="city in cities.slice(0, 4)" :key="city.slug" :to="`/articles/${city.slug}`" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">
                Bosser à {{ city.name }}
              </NuxtLink>
              <NuxtLink to="/villes" class="inline-block mb-4 text-xs text-[var(--color-terracotta-500)] font-semibold hover:underline">Toutes les villes →</NuxtLink>
              <NuxtLink to="/articles/cafe-ou-coworking" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Café ou coworking ?</NuxtLink>
              <NuxtLink to="/themes/terrasse-ete" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Bosser en terrasse cet été</NuxtLink>
            </div>

          </div>

          <!-- Col 3: Deskover -->
          <div>
            <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-4">Deskover</div>
            <div class="flex flex-col gap-2.5">
              <NuxtLink to="/a-propos" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Qui sommes-nous</NuxtLink>
              <NuxtLink to="/ajouter" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Proposer un lieu</NuxtLink>
              <NuxtLink to="/contact" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Contact</NuxtLink>
              <NuxtLink to="/mentions-legales" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Mentions légales</NuxtLink>
              <NuxtLink to="/confidentialite" class="text-[13px] text-white/60 hover:text-[var(--color-terracotta-500)] transition-colors">Confidentialité</NuxtLink>
            </div>
          </div>
        </div>

        <div class="mt-12 pt-6 border-t border-white/[0.06] flex items-center justify-between">
          <p class="text-[11px] text-white/25">&copy; 2026 Deskover - Adé &amp; Thomas</p>
          <p class="text-[11px] text-white/15 italic">Fait avec du bon café et beaucoup de WiFi.</p>
        </div>
      </div>
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
  { name: 'Grenoble', slug: 'travailler-grenoble' },
]
</script>
