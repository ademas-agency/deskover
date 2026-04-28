import { createClient } from '@supabase/supabase-js'
import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabase.url,
    config.public.supabase.key
  )

  const urls: { loc: string; lastmod?: string; priority?: number; changefreq?: string }[] = []

  // Places
  const { data: places } = await supabase
    .from('places')
    .select('id, slug, updated_at')
    .eq('status', 'published')

  if (places) {
    for (const p of places) {
      urls.push({
        loc: `/lieu/${p.slug || p.id}`,
        lastmod: p.updated_at,
        priority: 0.8,
        changefreq: 'weekly'
      })
    }
  }

  // Cities
  const { data: cities } = await supabase
    .from('cities')
    .select('city_key')

  if (cities) {
    for (const c of cities) {
      urls.push({
        loc: `/ville/${c.city_key}`,
        priority: 0.9,
        changefreq: 'weekly'
      })
    }
  }

  // Articles
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_at')
    .eq('published', true)

  if (articles) {
    for (const a of articles) {
      urls.push({
        loc: `/articles/${a.slug}`,
        lastmod: a.updated_at,
        priority: 0.7,
        changefreq: 'monthly'
      })
    }
  }

  // Hubs thématiques
  urls.push({
    loc: '/themes/terrasse-ete',
    priority: 0.8,
    changefreq: 'weekly'
  })

  return urls
})
