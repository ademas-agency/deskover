import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { authClient } from './auth.js';
import { generateInsights } from './lib/insights.js';
import { renderHtml } from './lib/html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const SITE_URL = process.env.GSC_SITE_URL || 'https://www.deskover.fr/';
const REPORTS_DIR = path.join(__dirname, 'reports');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const PERIOD_DAYS = Number(args.days) || 28;
const TOP_LIMIT = Number(args.top) || 50;
const MIN_IMPRESSIONS_OPPORTUNITY = Number(args['min-impressions']) || 100;

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function rangeDates(days) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: ymd(start), endDate: ymd(end) };
}

async function querySearchAnalytics(searchconsole, body) {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: body,
  });
  return res.data.rows || [];
}

function fmtPct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtPos(n) {
  return n.toFixed(1);
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function mdTable(headers, rows) {
  const lines = [];
  lines.push('| ' + headers.join(' | ') + ' |');
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
  for (const r of rows) lines.push('| ' + r.join(' | ') + ' |');
  return lines.join('\n');
}

async function main() {
  console.log(`Propriété : ${SITE_URL}`);
  console.log(`Période   : ${PERIOD_DAYS} derniers jours`);
  console.log(`Top       : ${TOP_LIMIT}`);
  console.log('');

  const auth = await authClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const { startDate, endDate } = rangeDates(PERIOD_DAYS);
  console.log(`Plage : ${startDate} → ${endDate}\n`);

  console.log('→ Top requêtes…');
  const queries = await querySearchAnalytics(searchconsole, {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: 1000,
  });

  console.log('→ Top pages…');
  const pages = await querySearchAnalytics(searchconsole, {
    startDate,
    endDate,
    dimensions: ['page'],
    rowLimit: 200,
  });

  console.log('→ Couples requête × page (pour opportunités)…');
  const queryPagePairs = await querySearchAnalytics(searchconsole, {
    startDate,
    endDate,
    dimensions: ['query', 'page'],
    rowLimit: 5000,
  });

  const totalClicks = queries.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = queries.reduce((s, r) => s + r.impressions, 0);
  const avgCtr = totalImpressions ? totalClicks / totalImpressions : 0;
  const avgPos =
    queries.reduce((s, r) => s + r.position * r.impressions, 0) /
    (totalImpressions || 1);

  const topByClicks = [...queries]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, TOP_LIMIT);

  const topByImpressions = [...queries]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_LIMIT);

  const opportunities = queryPagePairs
    .filter(
      (r) =>
        r.position >= 8 &&
        r.position <= 20 &&
        r.impressions >= MIN_IMPRESSIONS_OPPORTUNITY
    )
    .map((r) => ({
      ...r,
      potentialClicksAt3: Math.round(r.impressions * 0.1) - r.clicks,
    }))
    .sort((a, b) => b.potentialClicksAt3 - a.potentialClicksAt3)
    .slice(0, TOP_LIMIT);

  const lowCtrHighImpression = queries
    .filter(
      (r) =>
        r.impressions >= MIN_IMPRESSIONS_OPPORTUNITY &&
        r.position <= 10 &&
        r.ctr < avgCtr * 0.7
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_LIMIT);

  const topPages = [...pages]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, TOP_LIMIT);

  const lines = [];
  lines.push(`# Rapport SEO Deskover`);
  lines.push('');
  lines.push(`**Propriété :** ${SITE_URL}`);
  lines.push(`**Période :** ${startDate} → ${endDate} (${PERIOD_DAYS} jours)`);
  lines.push('');
  lines.push('## Vue d\'ensemble');
  lines.push('');
  lines.push(`- **Clics totaux :** ${totalClicks.toLocaleString('fr-FR')}`);
  lines.push(
    `- **Impressions totales :** ${totalImpressions.toLocaleString('fr-FR')}`
  );
  lines.push(`- **CTR moyen :** ${fmtPct(avgCtr)}`);
  lines.push(`- **Position moyenne :** ${fmtPos(avgPos)}`);
  lines.push(`- **Requêtes uniques détectées :** ${queries.length}`);
  lines.push('');

  lines.push(`## Top ${TOP_LIMIT} requêtes par clics`);
  lines.push('');
  lines.push(
    mdTable(
      ['#', 'Requête', 'Clics', 'Impr.', 'CTR', 'Position'],
      topByClicks.map((r, i) => [
        i + 1,
        r.keys[0],
        r.clicks,
        r.impressions,
        fmtPct(r.ctr),
        fmtPos(r.position),
      ])
    )
  );
  lines.push('');

  lines.push(`## Top ${TOP_LIMIT} requêtes par impressions (visibilité)`);
  lines.push('');
  lines.push(
    mdTable(
      ['#', 'Requête', 'Impr.', 'Clics', 'CTR', 'Position'],
      topByImpressions.map((r, i) => [
        i + 1,
        r.keys[0],
        r.impressions,
        r.clicks,
        fmtPct(r.ctr),
        fmtPos(r.position),
      ])
    )
  );
  lines.push('');

  lines.push(
    `## Opportunités — position 8-20 avec ≥${MIN_IMPRESSIONS_OPPORTUNITY} impressions`
  );
  lines.push('');
  lines.push(
    'Ces requêtes tapent à la porte de la première page. Pousser le contenu / netlinking de la page cible peut faire gagner beaucoup de clics.'
  );
  lines.push('');
  lines.push(
    mdTable(
      [
        '#',
        'Requête',
        'Page',
        'Position',
        'Impr.',
        'Clics actuels',
        'Gain potentiel*',
      ],
      opportunities.map((r, i) => [
        i + 1,
        r.keys[0],
        r.keys[1].replace(SITE_URL, '/'),
        fmtPos(r.position),
        r.impressions,
        r.clicks,
        Math.max(0, r.potentialClicksAt3),
      ])
    )
  );
  lines.push('');
  lines.push(
    '_*Gain potentiel = clics estimés si la page atteignait ~position 3 (CTR ~10%) moins les clics actuels._'
  );
  lines.push('');

  lines.push('## Requêtes en top 10 mais avec un CTR anormalement bas');
  lines.push('');
  lines.push(
    'Bon classement mais peu de clics → souvent un problème de title / meta description peu attirants.'
  );
  lines.push('');
  lines.push(
    mdTable(
      ['#', 'Requête', 'Position', 'Impr.', 'CTR', 'CTR moyen site'],
      lowCtrHighImpression.map((r, i) => [
        i + 1,
        r.keys[0],
        fmtPos(r.position),
        r.impressions,
        fmtPct(r.ctr),
        fmtPct(avgCtr),
      ])
    )
  );
  lines.push('');

  lines.push(`## Top ${TOP_LIMIT} pages par clics`);
  lines.push('');
  lines.push(
    mdTable(
      ['#', 'Page', 'Clics', 'Impr.', 'CTR', 'Position'],
      topPages.map((r, i) => [
        i + 1,
        r.keys[0].replace(SITE_URL, '/'),
        r.clicks,
        r.impressions,
        fmtPct(r.ctr),
        fmtPos(r.position),
      ])
    )
  );
  lines.push('');

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = `${ymd(new Date())}-${PERIOD_DAYS}d`;
  const outMd = path.join(REPORTS_DIR, `seo-report-${stamp}.md`);
  fs.writeFileSync(outMd, lines.join('\n'));

  console.log('→ Calcul des insights et plan d\'action…');
  const data = {
    queries,
    pages,
    queryPagePairs,
    totals: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCtr,
      position: avgPos,
    },
    period: { startDate, endDate },
    siteUrl: SITE_URL,
  };
  const insights = generateInsights(data);
  const html = renderHtml({ data, insights, params: { days: PERIOD_DAYS } });
  const outHtml = path.join(REPORTS_DIR, `seo-report-${stamp}.html`);
  fs.writeFileSync(outHtml, html);

  console.log('');
  console.log(`✅ Markdown : ${path.relative(ROOT, outMd)}`);
  console.log(`✅ HTML     : ${path.relative(ROOT, outHtml)}`);
  console.log('');
  console.log(
    `Récap : ${totalClicks.toLocaleString('fr-FR')} clics, ${totalImpressions.toLocaleString('fr-FR')} impressions, CTR ${fmtPct(avgCtr)}, position moyenne ${fmtPos(avgPos)}.`
  );
  const totalActions =
    insights.quickWins.length +
    insights.technicalIssues.length +
    insights.contentSuggestions.length +
    insights.placeImprovements.length;
  console.log(
    `${totalActions} actions identifiées : ${insights.quickWins.length} quick wins, ${insights.technicalIssues.length} techniques, ${insights.contentSuggestions.length} contenus, ${insights.placeImprovements.length} fiches lieu.`
  );

  if (!args['no-open']) {
    const cmd =
      process.platform === 'darwin'
        ? `open "${outHtml}"`
        : process.platform === 'win32'
          ? `start "" "${outHtml}"`
          : `xdg-open "${outHtml}"`;
    exec(cmd);
    console.log('');
    console.log('🌐 Ouverture du rapport dans le navigateur…');
  }
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message);
  if (err.response?.data?.error) {
    console.error('Détails API :', err.response.data.error);
  }
  process.exit(1);
});
