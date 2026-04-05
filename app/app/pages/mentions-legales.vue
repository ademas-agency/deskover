<script setup lang="ts">
useHead({
  title: 'Mentions légales - Deskover',
  meta: [{ name: 'description', content: 'Mentions légales du site Deskover.' }]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header desktop -->
    <DeskoverHeader class="hidden lg:block" />

    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <div class="px-5 pt-4 pb-16 max-w-2xl mx-auto lg:max-w-[720px]">
      <h1 class="font-display text-[28px] text-[var(--color-espresso)] leading-[1.05] uppercase mb-6">Mentions légales</h1>

      <div class="text-[14px] text-[var(--color-roast)] leading-relaxed space-y-4">
        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Éditeur du site</h2>
        <p>Deskover est édité par Ademas, micro-entreprise.</p>
        <p>Adresse : Paris, France</p>
        <p>Email : contact@deskover.fr</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Hébergement</h2>
        <p>Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</p>
        <p>Les données sont hébergées par Supabase Inc. (région EU-West, Paris).</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Propriété intellectuelle</h2>
        <p>L'ensemble du contenu de ce site (textes, images, design) est protégé par le droit d'auteur. Toute reproduction est interdite sans autorisation préalable.</p>
        <p>Les photos des lieux proviennent de Google Places API et sont affichées conformément aux conditions d'utilisation de Google.</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Données personnelles</h2>
        <p>Consulte notre <NuxtLink to="/confidentialite" class="text-[var(--color-terracotta-500)] font-medium">politique de confidentialité</NuxtLink> pour en savoir plus sur le traitement de tes données.</p>
      </div>
    </div>

    <DeskoverFooter />
  </div>
</template>
