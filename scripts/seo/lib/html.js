function escape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(n) {
  return Number(n).toLocaleString('fr-FR');
}

function fmtPct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtPos(n) {
  return Number(n).toFixed(1);
}

function priorityBadge(p) {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  const labels = {
    critical: 'Critique',
    high: 'Haute',
    medium: 'Moyenne',
    low: 'Basse',
  };
  return `<span class="inline-block text-xs font-semibold uppercase tracking-wide border rounded px-2 py-0.5 ${colors[p] || colors.medium}">${labels[p] || p}</span>`;
}

function actionCard(a, opts = {}) {
  const pageHtml = a.page
    ? `<div class="text-xs mt-1"><a href="${escape(a.page)}" target="_blank" class="text-emerald-700 hover:underline font-mono">${escape(a.page.replace(/^https?:\/\/[^/]+/, ''))}</a></div>`
    : '';
  const stats = [];
  if (a.position !== undefined) stats.push(`<span class="text-stone-600">Position ${fmtPos(a.position)}</span>`);
  if (a.impressions !== undefined) stats.push(`<span class="text-stone-600">${fmtNum(a.impressions)} impr.</span>`);
  if (a.ctr !== undefined) stats.push(`<span class="text-stone-600">CTR ${fmtPct(a.ctr)}</span>`);

  return `
    <div class="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition">
      <div class="flex items-start justify-between gap-3 mb-2">
        <h3 class="font-semibold text-stone-900 flex-1">${escape(a.title)}</h3>
        ${priorityBadge(a.priority)}
      </div>
      <p class="text-sm text-stone-600 mb-3">${escape(a.description)}</p>
      ${pageHtml}
      ${stats.length ? `<div class="flex gap-3 text-xs mt-2 mb-3">${stats.join('')}</div>` : ''}
      <div class="text-sm bg-emerald-50 border border-emerald-100 rounded px-3 py-2 text-emerald-900">
        <strong class="font-semibold">À faire :</strong> ${escape(a.action)}
      </div>
    </div>
  `;
}

function table(headers, rows) {
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b border-stone-200 bg-stone-50">
            ${headers.map((h) => `<th class="text-left font-semibold text-stone-700 px-3 py-2">${escape(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, i) => `
            <tr class="border-b border-stone-100 ${i % 2 === 1 ? 'bg-stone-50/50' : ''} hover:bg-emerald-50/30">
              ${r.map((c) => `<td class="px-3 py-2 text-stone-800">${c}</td>`).join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function kpi(label, value, sub) {
  return `
    <div class="bg-white border border-stone-200 rounded-lg p-4">
      <div class="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-1">${label}</div>
      <div class="text-3xl font-bold text-stone-900">${value}</div>
      ${sub ? `<div class="text-xs text-stone-500 mt-1">${sub}</div>` : ''}
    </div>
  `;
}

export function renderHtml({ data, insights, params }) {
  const { queries, pages, queryPagePairs, totals, period, siteUrl } = data;
  const { quickWins, technicalIssues, contentSuggestions, placeImprovements, strategy } = insights;

  const topByClicks = [...queries].sort((a, b) => b.clicks - a.clicks).slice(0, 30);
  const topByImpressions = [...queries].sort((a, b) => b.impressions - a.impressions).slice(0, 30);
  const topPages = [...pages].sort((a, b) => b.clicks - a.clicks).slice(0, 30);
  const opportunities = queryPagePairs
    .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);

  const allActions = [
    ...quickWins.map((a) => ({ ...a, category: 'Quick win' })),
    ...technicalIssues.map((a) => ({ ...a, category: 'Technique' })),
    ...contentSuggestions.map((a) => ({ ...a, category: 'Contenu' })),
    ...placeImprovements.map((a) => ({ ...a, category: 'Fiche lieu' })),
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport SEO Deskover — ${period.startDate} → ${period.endDate}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .scroll-mt { scroll-margin-top: 5rem; }
  </style>
</head>
<body class="bg-stone-50 text-stone-900">
  <header class="bg-white border-b border-stone-200 sticky top-0 z-10">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">Rapport SEO Deskover</h1>
        <p class="text-sm text-stone-500">${escape(siteUrl)} · ${period.startDate} → ${period.endDate} (${params.days} jours)</p>
      </div>
      <nav class="flex gap-1 text-sm">
        <a href="#actions" class="px-3 py-1.5 rounded hover:bg-stone-100">Plan d'action</a>
        <a href="#data" class="px-3 py-1.5 rounded hover:bg-stone-100">Données</a>
        <a href="#strategy" class="px-3 py-1.5 rounded hover:bg-stone-100">Stratégie</a>
      </nav>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-8 space-y-12">

    <section>
      <h2 class="text-2xl font-bold mb-4">Vue d'ensemble</h2>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        ${kpi('Clics', fmtNum(totals.clicks), 'sur la période')}
        ${kpi('Impressions', fmtNum(totals.impressions), 'visibilité totale')}
        ${kpi('CTR moyen', fmtPct(totals.ctr), 'objectif : > 3%')}
        ${kpi('Position moy.', fmtPos(totals.position), 'objectif : < 10')}
        ${kpi('Requêtes uniques', fmtNum(queries.length), 'mots-clés détectés')}
      </div>
    </section>

    <section id="actions" class="scroll-mt">
      <h2 class="text-2xl font-bold mb-2">🎯 Plan d'action</h2>
      <p class="text-stone-600 mb-6">${allActions.length} actions identifiées, classées par priorité et catégorie.</p>

      ${quickWins.length ? `
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
          <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-sm">⚡ Quick wins</span>
          <span class="text-sm font-normal text-stone-500">${quickWins.length} actions</span>
        </h3>
        <div class="grid md:grid-cols-2 gap-4">
          ${quickWins.map((a) => actionCard(a)).join('')}
        </div>
      </div>
      ` : ''}

      ${technicalIssues.length ? `
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
          <span class="bg-red-100 text-red-800 px-2 py-0.5 rounded text-sm">🔧 Technique</span>
          <span class="text-sm font-normal text-stone-500">${technicalIssues.length} actions</span>
        </h3>
        <div class="grid md:grid-cols-2 gap-4">
          ${technicalIssues.map((a) => actionCard(a)).join('')}
        </div>
      </div>
      ` : ''}

      ${contentSuggestions.length ? `
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
          <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm">📝 Contenu</span>
          <span class="text-sm font-normal text-stone-500">${contentSuggestions.length} articles à créer</span>
        </h3>
        <div class="grid md:grid-cols-2 gap-4">
          ${contentSuggestions.map((a) => actionCard(a)).join('')}
        </div>
      </div>
      ` : ''}

      ${placeImprovements.length ? `
      <div class="mb-8">
        <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
          <span class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-sm">📍 Fiches lieu</span>
          <span class="text-sm font-normal text-stone-500">${placeImprovements.length} fiches à enrichir</span>
        </h3>
        <div class="grid md:grid-cols-2 gap-4">
          ${placeImprovements.map((a) => actionCard(a)).join('')}
        </div>
      </div>
      ` : ''}
    </section>

    ${strategy.length ? `
    <section id="strategy" class="scroll-mt">
      <h2 class="text-2xl font-bold mb-2">🧭 Niches détectées</h2>
      <p class="text-stone-600 mb-6">Thématiques sur lesquelles tu apparais déjà — bons candidats pour clusters de contenu.</p>
      <div class="grid md:grid-cols-2 gap-4">
        ${strategy.map((s) => `
          <div class="bg-white border border-stone-200 rounded-lg p-4">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h3 class="font-semibold text-stone-900">${escape(s.niche)}</h3>
              <span class="text-sm text-stone-500">${fmtNum(s.impressions)} impr.</span>
            </div>
            <p class="text-xs text-stone-500 mb-3">Exemples : ${s.queries.map((q) => `<code class="bg-stone-100 px-1.5 py-0.5 rounded">${escape(q)}</code>`).join(' · ')}</p>
            <div class="text-sm bg-emerald-50 border border-emerald-100 rounded px-3 py-2 text-emerald-900">
              <strong class="font-semibold">Stratégie :</strong> ${escape(s.action)}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
    ` : ''}

    <section id="data" class="scroll-mt space-y-10">
      <h2 class="text-2xl font-bold">📊 Données détaillées</h2>

      <div>
        <h3 class="text-lg font-bold mb-3">Top 30 requêtes par clics</h3>
        ${table(
          ['#', 'Requête', 'Clics', 'Impr.', 'CTR', 'Position'],
          topByClicks.map((r, i) => [
            i + 1,
            `<span class="font-medium">${escape(r.keys[0])}</span>`,
            `<strong>${fmtNum(r.clicks)}</strong>`,
            fmtNum(r.impressions),
            fmtPct(r.ctr),
            fmtPos(r.position),
          ])
        )}
      </div>

      <div>
        <h3 class="text-lg font-bold mb-3">Top 30 requêtes par impressions (visibilité)</h3>
        ${table(
          ['#', 'Requête', 'Impr.', 'Clics', 'CTR', 'Position'],
          topByImpressions.map((r, i) => [
            i + 1,
            `<span class="font-medium">${escape(r.keys[0])}</span>`,
            `<strong>${fmtNum(r.impressions)}</strong>`,
            fmtNum(r.clicks),
            fmtPct(r.ctr),
            fmtPos(r.position),
          ])
        )}
      </div>

      <div>
        <h3 class="text-lg font-bold mb-3">Opportunités — position 8-20 avec ≥30 impressions</h3>
        ${opportunities.length ? table(
          ['#', 'Requête', 'Page', 'Position', 'Impr.', 'Clics'],
          opportunities.map((r, i) => [
            i + 1,
            escape(r.keys[0]),
            `<a href="${escape(r.keys[1])}" target="_blank" class="text-emerald-700 hover:underline font-mono text-xs">${escape(r.keys[1].replace(siteUrl, '/'))}</a>`,
            fmtPos(r.position),
            fmtNum(r.impressions),
            fmtNum(r.clicks),
          ])
        ) : '<p class="text-stone-500 italic">Aucune requête ne tape encore à la porte du top 10. Concentre-toi sur le plan d\'action ci-dessus.</p>'}
      </div>

      <div>
        <h3 class="text-lg font-bold mb-3">Top 30 pages par clics</h3>
        ${table(
          ['#', 'Page', 'Clics', 'Impr.', 'CTR', 'Position'],
          topPages.map((r, i) => [
            i + 1,
            `<a href="${escape(r.keys[0])}" target="_blank" class="text-emerald-700 hover:underline font-mono text-xs">${escape(r.keys[0].replace(siteUrl, '/'))}</a>`,
            `<strong>${fmtNum(r.clicks)}</strong>`,
            fmtNum(r.impressions),
            fmtPct(r.ctr),
            fmtPos(r.position),
          ])
        )}
      </div>
    </section>

    <footer class="text-center text-xs text-stone-500 pt-8 border-t border-stone-200">
      Généré le ${new Date().toLocaleString('fr-FR')} — Source : Google Search Console
    </footer>
  </main>
</body>
</html>`;
}
