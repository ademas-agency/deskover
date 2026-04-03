import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const CATEGORY_LABELS = {
  cafe: '☕ Café',
  coffee_shop: '🫘 Coffee Shop',
  coworking: '💻 Coworking',
  tiers_lieu: '🏠 Tiers-lieu',
};

const CATEGORY_COLORS = {
  cafe: '#d97706',
  coffee_shop: '#9333ea',
  coworking: '#2563eb',
  tiers_lieu: '#059669',
};

const SIGNAL_EMOJIS = {
  wifi: '📶 WiFi',
  prises: '🔌 Prises',
  calme: '🤫 Calme',
  grandes_tables: '🪑 Grandes tables',
  laptop_friendly: '💻 Laptop OK',
  terrasse: '☀️ Terrasse',
  food: '🍽️ Restauration',
  pas_cher: '💰 Pas cher',
  ambiance: '✨ Ambiance',
};

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function starRating(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + ' ' + rating.toFixed(1);
}

async function main() {
  // Utiliser enriched si disponible, sinon deduped
  const enrichedFile = new URL('./data/enriched-places.json', import.meta.url);
  const dedupedFile = new URL('./data/deduped-places.json', import.meta.url);
  const inputFile = existsSync(enrichedFile) ? enrichedFile : dedupedFile;
  const isEnriched = existsSync(enrichedFile);

  const places = JSON.parse(await readFile(inputFile, 'utf-8'));

  // Grouper par city_key
  const byCity = {};
  for (const p of places) {
    const key = p.city_key || 'inconnu';
    if (!byCity[key]) byCity[key] = [];
    byCity[key].push(p);
  }

  // Trier villes
  const sortedCities = Object.entries(byCity).sort((a, b) => {
    const aP = a[0].startsWith('paris'), bP = b[0].startsWith('paris');
    if (aP && !bP) return -1;
    if (!aP && bP) return 1;
    if (aP && bP) return (parseInt(a[0].replace(/\D/g, '')) || 0) - (parseInt(b[0].replace(/\D/g, '')) || 0);
    return b[1].length - a[1].length;
  });

  for (const [, cp] of sortedCities) cp.sort((a, b) => (b.blog_mentions_count || 0) - (a.blog_mentions_count || 0));

  // Stats
  const total = places.length;
  const withAddr = places.filter(p => p.address).length;
  const withPhoto = places.filter(p => p.photo_local || p.photo_url).length;
  const withRating = places.filter(p => p.google_rating).length;
  const multiMention = places.filter(p => (p.blog_mentions_count || 0) >= 2).length;
  const byCat = {};
  for (const p of places) byCat[p.category] = (byCat[p.category] || 0) + 1;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OuBosser — ${total} lieux extraits</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e5e5e5; }

  .header { background: #1a1a1a; border-bottom: 1px solid #333; padding: 24px 32px; position: sticky; top: 0; z-index: 100; }
  .header h1 { font-size: 24px; font-weight: 700; }
  .header h1 span { color: #f59e0b; }
  .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
  .stat { background: #262626; padding: 6px 14px; border-radius: 8px; font-size: 13px; }
  .stat strong { color: #f59e0b; font-size: 16px; }

  .filters { background: #1a1a1a; padding: 12px 32px; border-bottom: 1px solid #333; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; position: sticky; top: 80px; z-index: 99; }
  .filter-btn { padding: 5px 12px; border-radius: 20px; border: 1px solid #444; background: transparent; color: #ccc; cursor: pointer; font-size: 12px; transition: all 0.2s; }
  .filter-btn:hover, .filter-btn.active { background: #f59e0b; color: #000; border-color: #f59e0b; }
  .search-input { padding: 7px 14px; border-radius: 20px; border: 1px solid #444; background: #262626; color: #e5e5e5; font-size: 13px; width: 240px; }
  .search-input:focus { outline: none; border-color: #f59e0b; }

  .container { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }
  .city-section { margin-bottom: 40px; }
  .city-header { font-size: 20px; font-weight: 700; padding: 10px 0; border-bottom: 2px solid #f59e0b; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: baseline; }
  .city-header .count { font-size: 13px; color: #888; font-weight: 400; }

  .place-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; margin-bottom: 12px; transition: border-color 0.2s; display: flex; }
  .place-card:hover { border-color: #444; }

  .place-photo { width: 180px; min-height: 140px; background-size: cover; background-position: center; background-color: #262626; flex-shrink: 0; }
  .place-photo.no-photo { display: flex; align-items: center; justify-content: center; color: #555; font-size: 40px; }

  .place-content { padding: 14px 18px; flex: 1; min-width: 0; }
  .place-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .place-name { font-size: 15px; font-weight: 600; }
  .place-category { font-size: 11px; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }

  .place-meta { display: flex; gap: 16px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
  .place-address { color: #aaa; font-size: 12px; }
  .place-rating { color: #f59e0b; font-size: 12px; font-weight: 600; }
  .place-reviews { color: #888; font-size: 11px; }

  .place-desc { color: #bbb; font-size: 12px; margin-top: 6px; line-height: 1.4; }
  .place-signals { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
  .signal { font-size: 10px; background: #262626; padding: 2px 7px; border-radius: 10px; color: #aaa; }
  .place-mentions { margin-top: 8px; font-size: 11px; color: #888; }
  .place-mentions summary { cursor: pointer; }
  .place-mentions a { color: #60a5fa; text-decoration: none; }
  .place-mentions a:hover { text-decoration: underline; }
  .mention-list { margin-top: 4px; padding-left: 14px; }
  .mention-list li { margin-bottom: 3px; }
  .mentions-badge { display: inline-block; background: #f59e0b; color: #000; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; margin-left: 6px; }
  .place-links { margin-top: 6px; font-size: 11px; }
  .place-links a { color: #60a5fa; text-decoration: none; margin-right: 12px; }
  .hidden { display: none !important; }

  @media (max-width: 700px) {
    .place-card { flex-direction: column; }
    .place-photo { width: 100%; height: 160px; }
    .filters { padding: 10px 16px; }
    .container { padding: 16px; }
    .header { padding: 16px; }
  }
</style>
</head>
<body>

<div class="header">
  <h1><span>OuBosser</span> — Lieux extraits</h1>
  <div class="stats">
    <div class="stat"><strong>${total}</strong> lieux</div>
    <div class="stat"><strong>${withPhoto}</strong> photos</div>
    <div class="stat"><strong>${withAddr}</strong> adresses</div>
    <div class="stat"><strong>${withRating}</strong> notes Google</div>
    <div class="stat"><strong>${multiMention}</strong> multi-mentions</div>
    <div class="stat"><strong>${sortedCities.length}</strong> villes</div>
  </div>
</div>

<div class="filters">
  <button class="filter-btn active" data-filter="all">Tous</button>
  <button class="filter-btn" data-filter="cafe">☕ ${byCat.cafe || 0} Cafés</button>
  <button class="filter-btn" data-filter="coffee_shop">🫘 ${byCat.coffee_shop || 0} Coffee</button>
  <button class="filter-btn" data-filter="coworking">💻 ${byCat.coworking || 0} Cowork</button>
  <button class="filter-btn" data-filter="tiers_lieu">🏠 ${byCat.tiers_lieu || 0} Tiers-lieux</button>
  <button class="filter-btn" data-filter="multi">⭐ 2+ mentions</button>
  <input type="text" class="search-input" placeholder="Rechercher..." id="search">
</div>

<div class="container">
${sortedCities.map(([cityKey, cityPlaces]) => {
  const cityLabel = cityKey.startsWith('paris-')
    ? cityKey.replace('paris-', 'Paris ').replace(/(\d+)e/, '$1ᵉ')
    : cityKey.charAt(0).toUpperCase() + cityKey.slice(1).replace(/-/g, ' ');
  return `
  <div class="city-section" data-city="${cityKey}">
    <div class="city-header">${cityLabel}<span class="count">${cityPlaces.length} lieux</span></div>
    ${cityPlaces.map(p => {
      const photoSrc = p.photo_local
        ? `../scripts/data/${p.photo_local}`
        : p.photo_url || '';
      const catIcon = { cafe: '☕', coffee_shop: '🫘', coworking: '💻', tiers_lieu: '🏠' }[p.category] || '📍';
      return `
    <div class="place-card" data-category="${p.category}" data-mentions="${p.blog_mentions_count || 0}" data-name="${escHtml(p.name.toLowerCase())}">
      ${photoSrc
        ? `<div class="place-photo" style="background-image:url('${escHtml(photoSrc)}')"></div>`
        : `<div class="place-photo no-photo">${catIcon}</div>`}
      <div class="place-content">
        <div class="place-top">
          <div>
            <span class="place-name">${escHtml(p.name)}</span>
            ${(p.blog_mentions_count || 0) >= 2 ? `<span class="mentions-badge">${p.blog_mentions_count}×</span>` : ''}
          </div>
          <span class="place-category" style="background:${CATEGORY_COLORS[p.category]}20;color:${CATEGORY_COLORS[p.category]}">${CATEGORY_LABELS[p.category] || p.category}</span>
        </div>
        <div class="place-meta">
          <span class="place-address">${p.address ? '📍 ' + escHtml(p.address) : ''}</span>
          ${p.google_rating ? `<span class="place-rating">${starRating(p.google_rating)}</span>` : ''}
          ${p.google_reviews_count ? `<span class="place-reviews">(${p.google_reviews_count} avis)</span>` : ''}
        </div>
        <div class="place-desc">${escHtml(p.description || '')}</div>
        <div class="place-signals">${(p.signals || []).map(s => `<span class="signal">${SIGNAL_EMOJIS[s] || s}</span>`).join('')}</div>
        <div class="place-links">
          ${p.google_maps_url ? `<a href="${escHtml(p.google_maps_url)}" target="_blank">📍 Google Maps</a>` : ''}
          ${p.website ? `<a href="${escHtml(p.website)}" target="_blank">🌐 Site web</a>` : ''}
        </div>
        ${(p.blog_mentions || []).length > 0 ? `
        <details class="place-mentions">
          <summary>📰 ${p.blog_mentions.length} source${p.blog_mentions.length > 1 ? 's' : ''}</summary>
          <ul class="mention-list">${p.blog_mentions.map(m => `<li><a href="${escHtml(m.url)}" target="_blank">${escHtml(m.title || m.source)}</a></li>`).join('')}</ul>
        </details>` : ''}
      </div>
    </div>`;
    }).join('')}
  </div>`;
}).join('')}
</div>

<script>
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
});
document.getElementById('search').addEventListener('input', applyFilters);

function applyFilters() {
  const active = document.querySelector('.filter-btn.active').dataset.filter;
  const search = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('.place-card').forEach(card => {
    let show = true;
    if (active === 'multi') show = parseInt(card.dataset.mentions) >= 2;
    else if (active !== 'all') show = card.dataset.category === active;
    if (show && search) {
      const city = card.closest('.city-section').dataset.city;
      show = card.dataset.name.includes(search) || city.includes(search);
    }
    card.classList.toggle('hidden', !show);
  });
  document.querySelectorAll('.city-section').forEach(s => {
    s.classList.toggle('hidden', s.querySelectorAll('.place-card:not(.hidden)').length === 0);
  });
}
</script>
</body>
</html>`;

  await writeFile(new URL('../mockups/lieux-extraits.html', import.meta.url), html);
  console.log(`✅ HTML généré → mockups/lieux-extraits.html (${total} lieux, ${sortedCities.length} villes)`);
}

main().catch(console.error);
