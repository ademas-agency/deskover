<script setup lang="ts">
useHead({
  title: 'Politique de confidentialité - Deskover',
  meta: [{ name: 'description', content: 'Comment Deskover traite tes données personnelles.' }]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <div class="px-5 pt-4 pb-16 max-w-2xl mx-auto">
      <h1 class="font-display text-[28px] text-[var(--color-espresso)] leading-[1.05] uppercase mb-6">Confidentialité</h1>

      <div class="text-[14px] text-[var(--color-roast)] leading-relaxed space-y-4">
        <p>Dernière mise à jour : avril 2026</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Données collectées</h2>
        <p>Deskover collecte le minimum de données nécessaires au fonctionnement du service :</p>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Contributions (avis)</strong> : les notes que tu donnes aux lieux sont enregistrées avec un identifiant anonyme (fingerprint navigateur). Aucun compte n'est nécessaire.</li>
          <li><strong>Géolocalisation</strong> : utilisée uniquement pour afficher les lieux autour de toi et mesurer le WiFi. Jamais stockée. Tu peux la refuser.</li>
          <li><strong>Messages de contact</strong> : ton prénom, email et message sont stockés pour te répondre.</li>
          <li><strong>Suggestions de lieux</strong> : les lieux que tu proposes sont enregistrés pour modération.</li>
        </ul>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Ce qu'on ne fait pas</h2>
        <ul class="list-disc pl-5 space-y-1">
          <li>Pas de cookies publicitaires</li>
          <li>Pas de tracking cross-site</li>
          <li>Pas de revente de données</li>
          <li>Pas de compte utilisateur obligatoire</li>
        </ul>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Hébergement des données</h2>
        <p>Les données sont hébergées par Supabase (région EU-West, Paris). Les photos sont stockées sur Supabase Storage (même région).</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Tes droits</h2>
        <p>Conformément au RGPD, tu peux demander l'accès, la rectification ou la suppression de tes données en nous écrivant à contact@deskover.fr ou via la page <NuxtLink to="/contact" class="text-[var(--color-terracotta-500)] font-medium">contact</NuxtLink>.</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Conservation</h2>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Contributions</strong> : conservées indéfiniment (anonymes)</li>
          <li><strong>Messages de contact</strong> : supprimés après traitement (max 12 mois)</li>
          <li><strong>Géolocalisation</strong> : jamais stockée</li>
        </ul>
      </div>
    </div>

    <DeskoverFooter />
  </div>
</template>
