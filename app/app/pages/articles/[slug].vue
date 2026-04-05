<script setup lang="ts">
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const route = useRoute()
const slug = route.params.slug as string
const client = useSupabaseClient()

const { data: article, status } = await useAsyncData(
  `article-${slug}`,
  async () => {
    const { data } = await client
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single()
    return data
  }
)
const loading = computed(() => status.value === 'pending')

// Photo carousel
const currentPhoto = ref(0)
const allPhotos = computed(() => {
  if (!article.value?.cover_image) return ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop']
  return [article.value.cover_image]
})
let autoSlide: ReturnType<typeof setInterval> | null = null
function startAutoSlide() {
  if (allPhotos.value.length <= 1) return
  autoSlide = setInterval(() => {
    currentPhoto.value = (currentPhoto.value + 1) % allPhotos.value.length
  }, 4000)
}
onMounted(() => startAutoSlide())
onUnmounted(() => { if (autoSlide) clearInterval(autoSlide) })

// Map for article places
const mapContainer = ref<HTMLElement | null>(null)
const { getByCity } = usePlaces()

const { data: articlePlaces } = await useAsyncData(
  `article-places-${slug}`,
  async () => {
    if (!article.value?.city_slug) return []
    return getByCity(article.value.city_slug)
  }
)

const categoryColors: Record<string, string> = {
  cafe: '#AA4C4D',
  coffee_shop: '#8B3A3B',
  coworking: '#5B7A5E',
  tiers_lieu: '#D4A84B',
  library: '#6B5B4E'
}

onMounted(() => {
  if (!mapContainer.value || !articlePlaces.value?.length) return

  const placesWithCoords = articlePlaces.value.filter(p => p.latitude && p.longitude)
  if (!placesWithCoords.length) return

  // Calculate bounds
  const lngs = placesWithCoords.map(p => p.longitude)
  const lats = placesWithCoords.map(p => p.latitude)
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

  const map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }
      },
      layers: [{ id: 'carto', type: 'raster', source: 'carto', minzoom: 0, maxzoom: 20 }]
    },
    center: [centerLng, centerLat],
    zoom: 12,
    attributionControl: false,
    interactive: true
  })

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

  map.on('load', () => {
    placesWithCoords.forEach(p => {
      const color = categoryColors[p.category] || '#AA4C4D'
      const el = document.createElement('div')
      el.style.cursor = 'pointer'

      if (p.photoUrl) {
        el.innerHTML = `<div style="width:44px;height:56px;border-radius:8px;overflow:hidden;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);background:${color};">
          <img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">${p.name.charAt(0)}</div>
        </div>`
      } else {
        el.innerHTML = `<div style="width:44px;height:56px;border-radius:8px;border:2px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.2);background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700;">
          ${p.name.charAt(0)}
        </div>`
      }

      el.addEventListener('click', () => {
        navigateTo(`/lieu/${p.id}`)
      })

      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map)
    })

    // Fit bounds if multiple places
    if (placesWithCoords.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      placesWithCoords.forEach(p => bounds.extend([p.longitude, p.latitude]))
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 })
    }
  })
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

      <!-- Header sticky mobile -->
      <div class="sticky top-0 z-50 bg-[var(--color-cream)] shadow-[0_1px_8px_rgba(44,40,37,0.06)] px-5 py-4 flex justify-between items-center lg:hidden">
        <NuxtLink to="/" class="flex items-center">
          <UIcon name="lucide:chevron-left" class="w-6 h-6 text-[var(--color-espresso)]" />
        </NuxtLink>
        <span class="font-display text-sm text-[var(--color-espresso)] tracking-[0.12em]">DESKOVER</span>
        <div class="w-6" />
      </div>

      <!-- Photo hero (même style que fiche lieu) -->
      <div class="relative h-[260px] lg:h-[400px] overflow-hidden">
        <img
          :src="allPhotos[currentPhoto]"
          :alt="article.title"
          class="w-full h-full object-cover transition-opacity duration-300 rounded-b-[24px] lg:rounded-b-none"
          :key="currentPhoto"
        >
        <div class="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent rounded-b-[24px] lg:rounded-b-none" />

        <!-- Top bar overlay (desktop) -->
        <div class="hidden lg:block absolute top-0 left-0 right-0 z-10">
          <div class="flex items-center justify-between px-10 pt-6 lg:container-deskover">
            <NuxtLink to="/" class="font-display text-base text-white tracking-[0.15em]">DESKOVER</NuxtLink>
            <NuxtLink to="/search">
              <UIcon name="lucide:search" class="w-[22px] h-[22px] text-white" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Desktop: 2 colonnes comme fiche lieu | Mobile: empilé -->
      <div class="lg:container-deskover lg:grid lg:grid-cols-[1fr_340px] lg:gap-10 lg:mt-8">

        <!-- Colonne principale -->
        <div>
          <!-- Chapeau -->
          <div class="px-5 pt-6 lg:px-0">
            <div class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-terracotta-500)] mb-2.5">
              GUIDE · {{ (article.city || '').toUpperCase() }}
            </div>
            <h1 class="font-display text-[28px] lg:text-[44px] text-[var(--color-espresso)] leading-[1.05] uppercase">
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
          <div class="mx-5 mt-8 bg-[var(--color-terracotta-500)] rounded-2xl p-5 lg:mx-0">
            <div class="font-display text-lg text-white">TU CONNAIS UN SPOT ?</div>
            <div class="text-sm text-white/80 mt-1.5">Contribue en 10 secondes et aide la communauté.</div>
            <NuxtLink to="/search" class="inline-block bg-white text-[var(--color-terracotta-500)] text-[13px] font-bold px-5 py-3 rounded-xl mt-3.5">
              Ajouter un lieu
            </NuxtLink>
          </div>
        </div>

        <!-- Sidebar desktop (carte + lien ville) -->
        <aside class="hidden lg:block">
          <div class="sticky top-[80px]">
            <!-- Mini carte -->
            <div v-if="articlePlaces?.length" class="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(44,40,37,0.06)]">
              <div ref="mapContainer" class="h-[280px] w-full" />
              <div class="p-4">
                <div class="font-display text-[13px] text-[var(--color-steam)] tracking-[0.1em] mb-1">CARTE</div>
                <p class="text-sm text-[var(--color-roast)]">{{ articlePlaces.length }} spots à {{ article.city }}</p>
              </div>
            </div>

            <!-- Lien vers la page ville (desktop) -->
            <NuxtLink
              v-if="article.city_slug"
              :to="`/ville/${article.city_slug}`"
              class="flex items-center justify-between bg-[var(--color-linen)] px-4 py-3.5 rounded-[14px] mt-4"
            >
              <div>
                <div class="text-[10px] font-bold uppercase text-[var(--color-terracotta-500)] tracking-wide">Explorer</div>
                <div class="text-[13px] font-semibold text-[var(--color-espresso)] mt-0.5">Tous les spots à {{ article.city }}</div>
              </div>
              <UIcon name="lucide:arrow-right" class="w-[18px] h-[18px] text-[var(--color-terracotta-500)]" />
            </NuxtLink>
          </div>
        </aside>

      </div>

      <!-- Lien vers la page ville (mobile only) -->
      <div v-if="article.city_slug" class="px-5 mt-6 mb-8 lg:hidden">
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

      <FabCarte />
      <DeskoverFooter />
    </template>
  </div>
</template>


<style>
.article-body > div > h2 {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  color: var(--color-espresso);
  padding: 0 20px;
  margin-top: 48px;
  text-transform: uppercase;
}

@media (min-width: 1024px) {
  .article-body > div > h2 {
    font-size: 26px;
    padding: 0;
  }
  .article-body > div > p {
    font-size: 16px;
    padding: 0;
  }
  .article-body > div > h3 {
    padding: 0;
  }
  .article-body > div > ul {
    padding-left: 20px;
    padding-right: 0;
  }
}

.article-body > div > h2::before {
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

.article-body > div > h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-espresso);
  padding: 0 20px;
  margin-top: 20px;
}

.article-body > div > p {
  padding: 0 20px;
  margin-top: 8px;
  font-size: 15px;
  color: var(--color-roast);
  line-height: 1.7;
}

.article-body > div > h2 + p {
  margin-top: 10px;
}

.article-body > div > hr {
  border: none;
  text-align: center;
  margin: 8px 0 24px;
  color: var(--color-steam);
  font-size: 16px;
  letter-spacing: 4px;
}

.article-body > div > hr::after {
  content: '· · ·';
}

.article-body > div > ul {
  padding: 12px 20px 0 40px;
  font-size: 15px;
  color: var(--color-roast);
  line-height: 1.7;
}

.article-body > div > ul > li {
  margin-bottom: 6px;
}

.article-body > div strong {
  color: var(--color-espresso);
  font-weight: 700;
}

.article-body > div a {
  color: var(--color-terracotta-500);
  font-weight: 500;
  text-decoration: none;
}

.article-body > div > h1 {
  display: none;
}
</style>
