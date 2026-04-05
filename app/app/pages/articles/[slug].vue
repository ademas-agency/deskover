<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string
const client = useSupabaseClient()

const article = ref<any>(null)
const loading = ref(true)

onMounted(async () => {
  const { data } = await client
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  article.value = data
  loading.value = false
})

const contentBlocks = computed(() => {
  if (!article.value?.content) return []
  const lines = article.value.content.split('\n')
  const blocks: { type: string; html?: string; placeId?: string }[] = []
  let htmlBuffer: string[] = []

  function flushHtml() {
    if (htmlBuffer.length) {
      blocks.push({ type: 'html', html: htmlBuffer.join('\n') })
      htmlBuffer = []
    }
  }

  for (const line of lines) {
    const embedMatch = line.match(/^::place-embed\{id="([^"]+)"\}/)
    if (embedMatch) {
      flushHtml()
      blocks.push({ type: 'place', placeId: embedMatch[1] })
      continue
    }
    if (line.trim() === '::') continue

    // Convert markdown to HTML
    if (line.startsWith('# ') && !line.startsWith('## ')) continue // skip h1
    if (line.startsWith('## ')) { htmlBuffer.push(`<h2>${line.slice(3)}</h2>`); continue }
    if (line.startsWith('### ')) { htmlBuffer.push(`<h3>${line.slice(4)}</h3>`); continue }
    if (line.trim() === '---') { htmlBuffer.push('<hr>'); continue }
    if (line.startsWith('- ')) { htmlBuffer.push(`<li>${formatInline(line.slice(2))}</li>`); continue }
    if (line.trim() === '') continue
    htmlBuffer.push(`<p>${formatInline(line)}</p>`)
  }
  flushHtml()

  // Wrap consecutive <li> in <ul>
  for (const block of blocks) {
    if (block.html) {
      block.html = block.html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    }
  }

  return blocks
})

function formatInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

useHead({
  title: () => article.value?.title || 'Article - Deskover',
  meta: [
    { name: 'description', content: () => article.value?.description || '' },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-cream)]">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center h-screen">
      <div class="w-8 h-8 border-3 border-[var(--color-terracotta-500)] border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- 404 -->
    <div v-else-if="!article" class="flex flex-col items-center justify-center h-screen px-6 text-center">
      <p class="font-display text-xl text-[var(--color-espresso)]">Article introuvable</p>
      <NuxtLink to="/" class="text-sm text-[var(--color-terracotta-500)] mt-3">Retour à l'accueil</NuxtLink>
    </div>

    <template v-else>
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
          :src="article.cover_image || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop'"
          :alt="article.title"
          class="w-full h-full object-cover"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
      </div>

      <!-- Chapeau -->
      <div class="px-5 pt-6">
        <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2.5">
          GUIDE · {{ (article.city || '').toUpperCase() }}
        </div>
        <h1 class="font-display text-[28px] text-[var(--color-espresso)] leading-[1.05] uppercase">
          {{ article.title }}
        </h1>
        <p class="text-[15px] text-[var(--color-roast)] leading-relaxed mt-3">
          {{ article.description }}
        </p>
        <div class="text-xs text-[var(--color-steam)] mt-3">
          Mis à jour le {{ new Date(article.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
        </div>
      </div>

      <!-- Contenu Markdown rendu -->
      <div class="article-body">
        <template v-for="(block, i) in contentBlocks" :key="i">
          <div v-if="block.type === 'html'" v-html="block.html" />
          <PlaceEmbed v-else-if="block.type === 'place'" :id="block.placeId" />
        </template>
      </div>

      <!-- Encart contribution -->
      <div class="mx-5 mt-8 bg-[var(--color-terracotta-500)] rounded-2xl p-5">
        <div class="font-display text-lg text-white">TU CONNAIS UN SPOT ?</div>
        <div class="text-sm text-white/80 mt-1.5">Contribue en 10 secondes et aide la communauté.</div>
        <NuxtLink to="/search" class="inline-block bg-white text-[var(--color-terracotta-500)] text-[13px] font-bold px-5 py-3 rounded-xl mt-3.5">
          Ajouter un lieu
        </NuxtLink>
      </div>

      <!-- Lien vers la page ville -->
      <div v-if="article.city_slug" class="px-5 mt-6 mb-8">
        <NuxtLink
          :to="`/ville/${article.city_slug}`"
          class="flex items-center justify-between bg-[var(--color-linen)] px-4 py-3.5 rounded-[14px]"
        >
          <div>
            <div class="text-[10px] font-bold uppercase text-[var(--color-terracotta-500)] tracking-wide">Explorer</div>
            <div class="text-[13px] font-semibold text-[var(--color-espresso)] mt-0.5">Tous les spots à {{ article.city }}</div>
          </div>
          <UIcon name="lucide:arrow-right" class="w-[18px] h-[18px] text-[var(--color-terracotta-500)]" />
        </NuxtLink>
      </div>

      <DeskoverFooter />
    </template>
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

.article-body h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-espresso);
  padding: 0 20px;
  margin-top: 20px;
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

.article-body ul {
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

.article-body a {
  color: var(--color-terracotta-500);
  font-weight: 500;
  text-decoration: none;
}

.article-body h1 {
  display: none;
}
</style>
