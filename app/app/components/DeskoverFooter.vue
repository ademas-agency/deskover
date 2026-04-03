<template>
  <footer class="bg-[var(--color-espresso)] rounded-t-3xl px-5 pt-9 pb-12">
    <!-- Accroche -->
    <div class="font-display text-sm text-[var(--color-terracotta-500)] tracking-[0.15em] mb-2">DESKOVER</div>
    <p class="text-[15px] text-white/90 leading-relaxed">Tout ce qu'il faut savoir avant de poser son laptop.</p>

    <!-- Où bosser -->
    <div class="mt-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Où bosser</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2">
        <NuxtLink v-for="city in cities" :key="city.slug" :to="`/${city.slug}`" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">
          Bosser à {{ city.name }}
        </NuxtLink>
      </div>
      <NuxtLink to="/villes" class="inline-block mt-3 text-xs text-[var(--color-terracotta-500)] font-semibold">Toutes les villes →</NuxtLink>
    </div>

    <!-- Le guide -->
    <div class="mt-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Le guide</div>
      <div class="flex flex-col gap-2.5">
        <NuxtLink v-for="guide in guides" :key="guide.slug" :to="`/guide/${guide.slug}`" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">
          {{ guide.title }}
        </NuxtLink>
      </div>
    </div>

    <!-- Deskover -->
    <div class="mt-8">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 mb-3.5">Deskover</div>
      <div class="flex flex-col gap-2.5">
        <NuxtLink to="/a-propos" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Notre histoire</NuxtLink>
        <NuxtLink to="/comment-ca-marche" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Comment ça marche</NuxtLink>
        <NuxtLink to="/contribuer" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Devenir contributeur</NuxtLink>
        <NuxtLink to="/pro" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Pour les pros</NuxtLink>
        <NuxtLink to="/contact" class="text-[13px] text-white/70 hover:text-[var(--color-terracotta-500)] transition-colors">Contact</NuxtLink>
      </div>
    </div>

    <!-- Signature -->
    <div class="mt-7 pt-7 border-t border-white/[0.08]">
      <p class="text-xs text-white/30 italic">Fait avec amour et beaucoup de café.</p>
      <p class="text-[11px] text-white/20 mt-1.5">&copy; 2026 Deskover</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const cities = [
  { name: 'Paris', slug: 'paris' },
  { name: 'Lyon', slug: 'lyon' },
  { name: 'Bordeaux', slug: 'bordeaux' },
  { name: 'Marseille', slug: 'marseille' },
  { name: 'Nantes', slug: 'nantes' },
  { name: 'Toulouse', slug: 'toulouse' },
  { name: 'Lille', slug: 'lille' },
  { name: 'Strasbourg', slug: 'strasbourg' },
  { name: 'Grenoble', slug: 'grenoble' },
  { name: 'Montpellier', slug: 'montpellier' }
]

const guides = [
  { title: 'Les meilleurs cafés pour bosser', slug: 'cafes-pour-bosser' },
  { title: 'Bibliothèques : le secret le mieux gardé', slug: 'bibliotheques' },
  { title: 'Coworking sans se ruiner', slug: 'coworking-pas-cher' },
  { title: 'Travailler le dimanche, c\'est possible', slug: 'travailler-dimanche' },
  { title: 'WiFi de compète : notre top', slug: 'meilleur-wifi' },
  { title: 'Le guide du digital nomad en France', slug: 'digital-nomad-france' }
]
</script>
