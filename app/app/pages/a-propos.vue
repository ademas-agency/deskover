<script setup lang="ts">
useHead({
  title: 'Pourquoi Deskover - Adé & Thomas',
  meta: [
    { name: 'description', content: 'Deskover est né de galères bien réelles : WiFi qui lâche en pleine visio, zéro prise, et des heures perdues à chercher le bon café. Voici notre histoire.' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Header sticky -->
    <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center">
      <NuxtLink to="/" class="flex items-center">
        <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
      </NuxtLink>
      <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
      <div class="w-6" />
    </div>

    <div class="px-5 pt-4 pb-4">
      <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2.5">
        POURQUOI DESKOVER
      </div>
      <h1 class="font-display text-[28px] text-[var(--color-espresso)] leading-[1.05] uppercase">
        Pour ne plus galérer
      </h1>

      <p class="text-[15px] text-[var(--color-roast)] leading-relaxed mt-5">
        On est Adé et Thomas. On bosse régulièrement depuis des cafés, en déplacement, dans des villes qu'on ne connaît pas toujours. Et à chaque fois, c'est la même galère.
      </p>

      <!-- Photo terrasse -->
      <div class="mt-5 rounded-xl overflow-hidden">
        <img
          src="/img/ade-thomas-terrasse.png"
          alt="Adé et Thomas qui bossent en terrasse"
          class="w-full h-[240px] object-cover object-center"
        >
      </div>

      <p class="text-[15px] text-[var(--color-roast)] leading-relaxed mt-3">
        À Tours, on a une visio importante. On s'installe dans un café qui a l'air bien, on commande, on ouvre l'ordi. Le WiFi est tellement mauvais que la connexion coupe toutes les deux minutes. Impossible de tenir l'appel. On finit la réunion en partage de connexion, frustrés. Ensuite, plus de batterie. Pas une prise en vue. Résultat : on a passé plus de temps à chercher où se brancher qu'à bosser.
      </p>

      <p class="text-[15px] text-[var(--color-roast)] leading-relaxed mt-3">
        À Aix-en-Provence, on tombe sur un café en terrasse, place du marché, au soleil. On a de la 5G, le café est bon, on est bien. Mais c'est un coup de chance. On n'avait rien trouvé en amont, rien préparé. Et c'est ça le truc : quand tu arrives dans une ville que tu ne connais pas, trouver un endroit où tu te sens bien pour bosser, ça ne devrait pas être une question de chance.
      </p>

      <!-- Séparateur -->
      <div class="text-center text-[var(--color-steam)] text-base tracking-[4px] my-8">
        · · ·
      </div>

      <p class="text-[15px] text-[var(--color-roast)] leading-relaxed">
        Deskover, c'est le guide qu'on aurait voulu avoir à Tours ce jour-là. Une sélection de lieux testés, avec les infos qui comptent, ville par ville. Le WiFi, les prises, le calme, mais aussi l'ambiance, la lumière, le café. Parce qu'un bon spot pour bosser, c'est un endroit où tout fonctionne et où on a envie de rester.
      </p>

      <p class="text-[15px] text-[var(--color-espresso)] font-semibold leading-relaxed mt-5">
        Adé & Thomas
      </p>

      <!-- Photo café -->
      <div class="mt-5 rounded-xl overflow-hidden">
        <img
          src="/img/ade-thomas-cafe.png"
          alt="Adé et Thomas qui bossent dans un café"
          class="w-full h-[300px] object-cover object-center"
        >
      </div>
    </div>

    <!-- Footer -->
    <DeskoverFooter class="mt-6" />
  </div>
</template>
