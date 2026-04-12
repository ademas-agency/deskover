<script setup lang="ts">
useHead({
  title: 'Politique de confidentialité - Deskover',
  meta: [
    { name: 'description', content: 'Comment Deskover traite tes données personnelles.' },
    { name: 'robots', content: 'noindex, follow' }
  ],
  link: [{ rel: 'canonical', href: 'https://www.deskover.fr/confidentialite' }]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">

    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 pt-safe flex justify-between items-center lg:hidden">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <div class="px-5 pt-4 pb-16 max-w-2xl mx-auto lg:max-w-[720px]">
      <h1 class="font-display text-[28px] text-[var(--color-espresso)] leading-[1.05] uppercase mb-6">Confidentialité</h1>

      <div class="text-[14px] text-[var(--color-roast)] leading-relaxed space-y-4">
        <p>Dernière mise à jour : avril 2026</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Données collectées</h2>
        <p>Deskover collecte le minimum de données nécessaires au fonctionnement du service :</p>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Contributions (notes)</strong> : les notes que tu donnes aux lieux (WiFi, prises, calme, ambiance) sont enregistrées avec un identifiant anonyme généré localement dans ton navigateur. Cet identifiant sert uniquement à éviter les votes en double — il n'est lié à aucune donnée personnelle. Aucun compte n'est nécessaire.</li>
          <li><strong>Géolocalisation</strong> : utilisée uniquement pour afficher les lieux autour de toi et mesurer le WiFi quand tu es sur place. Jamais envoyée à notre serveur, jamais stockée. Tu peux la refuser.</li>
          <li><strong>Messages de contact</strong> : ton prénom, ton email, le sujet (optionnel) et ton message sont stockés pour qu'on puisse te répondre.</li>
          <li><strong>Suggestions de lieux</strong> : les lieux que tu proposes (nom, adresse, ville, catégorie, coordonnées) sont enregistrés pour modération. Le même identifiant local que pour les notes est associé, uniquement pour prévenir les abus.</li>
        </ul>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Mesure d'audience</h2>
        <p>On utilise Google Analytics 4 pour comprendre comment le site est utilisé (pages vues, temps passé, appareil). C'est désactivé par défaut : rien n'est envoyé tant que tu n'as pas accepté via le bandeau en bas de page. Tu peux refuser, et revenir sur ton choix à tout moment en effaçant les données du site dans ton navigateur.</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Données stockées dans ton navigateur</h2>
        <p>On utilise le stockage local (<em>localStorage</em>) de ton navigateur pour deux choses :</p>
        <ul class="list-disc pl-5 space-y-1">
          <li>L'identifiant anonyme de contribution (pour éviter les votes en double)</li>
          <li>Ton choix concernant la mesure d'audience (pour ne pas te redemander à chaque visite)</li>
        </ul>
        <p>Ces données ne quittent jamais ton navigateur — on ne les lit pas côté serveur.</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Ce qu'on ne fait pas</h2>
        <ul class="list-disc pl-5 space-y-1">
          <li>Pas de cookies publicitaires</li>
          <li>Pas de tracking cross-site</li>
          <li>Pas de revente de données</li>
          <li>Pas de compte utilisateur obligatoire</li>
          <li>Pas de profilage individuel</li>
        </ul>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Hébergement des données</h2>
        <p>Les données sont hébergées par Supabase (région EU-West, Paris). Les photos sont stockées sur Supabase Storage (même région). Le site est servi par Vercel.</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Tes droits</h2>
        <p>Conformément au RGPD, tu peux demander l'accès, la rectification ou la suppression de tes données en nous écrivant à contact@deskover.fr ou via la page <NuxtLink to="/contact" class="text-[var(--color-terracotta-500)] font-medium">contact</NuxtLink>.</p>

        <h2 class="font-display text-[18px] text-[var(--color-espresso)] mt-6">Conservation</h2>
        <ul class="list-disc pl-5 space-y-1">
          <li><strong>Contributions</strong> : conservées indéfiniment (anonymes)</li>
          <li><strong>Messages de contact</strong> : supprimés après traitement (max 12 mois)</li>
          <li><strong>Suggestions de lieux</strong> : conservées tant que le lieu reste publié</li>
          <li><strong>Données Google Analytics</strong> : 14 mois (durée de conservation Google)</li>
          <li><strong>Géolocalisation</strong> : jamais stockée</li>
        </ul>
      </div>
    </div>

    <FabCarte />
    <DeskoverFooter />
  </div>
</template>
