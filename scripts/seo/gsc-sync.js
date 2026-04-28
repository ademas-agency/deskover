import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { authClient } from './auth.js';
import { generateInsights } from './lib/insights.js';

const SITE_URL = process.env.GSC_SITE_URL || 'https://www.deskover.fr/';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const PERIODS = args.all
  ? [7, 28, 90, 365]
  : [Number(args.days) || 28];

function ymd(d) { return d.toISOString().slice(0, 10); }

function rangeDates(days) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: ymd(start), endDate: ymd(end) };
}

async function fetchDailyHistory(searchconsole) {
  // Pull TOUT l'historique disponible (jusqu'à 16 mois) avec dimensions [date, query]
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setMonth(start.getMonth() - 16);

  console.log(`\n→ Historique journalier (date × query) : ${ymd(start)} → ${ymd(end)}`);
  const rows = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: ymd(start),
      endDate: ymd(end),
      dimensions: ['date', 'query'],
      rowLimit: 25000,
    },
  }).then(r => r.data.rows || []);

  console.log(`  ${rows.length} lignes (date × query)`);
  if (rows.length === 0) return;

  // Upsert en base par chunks de 500
  const chunks = [];
  for (let i = 0; i < rows.length; i += 500) chunks.push(rows.slice(i, i + 500));

  let upserted = 0;
  for (const chunk of chunks) {
    const data = chunk.map(r => ({
      date: r.keys[0],
      query: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
      ctr: r.ctr,
    }));
    const { error } = await supabase.from('gsc_query_daily').upsert(data, { onConflict: 'date,query' });
    if (error) {
      console.error(`  ✗ Chunk failed: ${error.message}`);
    } else {
      upserted += data.length;
    }
  }
  console.log(`  ✓ ${upserted} lignes upsertées dans gsc_query_daily`);
}

async function fetchPeriod(searchconsole, days) {
  const { startDate, endDate } = rangeDates(days);
  console.log(`\n→ Période ${days}j : ${startDate} → ${endDate}`);

  const [queries, pages, pairs] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 1000 },
    }).then(r => r.data.rows || []),
    searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 200 },
    }).then(r => r.data.rows || []),
    searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: { startDate, endDate, dimensions: ['query', 'page'], rowLimit: 5000 },
    }).then(r => r.data.rows || []),
  ]);

  const totalClicks = queries.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = queries.reduce((s, r) => s + r.impressions, 0);
  const ctr = totalImpressions ? totalClicks / totalImpressions : 0;
  const position = queries.reduce((s, r) => s + r.position * r.impressions, 0) / (totalImpressions || 1);

  // Normaliser : on garde keys[0] = query, keys[1] = page si dispo
  const queriesData = queries.map(r => ({
    query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  }));
  const pagesData = pages.map(r => ({
    page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  }));
  const pairsData = pairs.map(r => ({
    query: r.keys[0], page: r.keys[1], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
  }));

  // Pour generateInsights on a besoin du format keys[]
  const insights = generateInsights({
    queries,
    pages,
    queryPagePairs: pairs,
    totals: { clicks: totalClicks, impressions: totalImpressions, ctr, position },
  });

  console.log(`  ${totalClicks} clics, ${totalImpressions} impressions, CTR ${(ctr*100).toFixed(2)}%, position ${position.toFixed(1)}`);
  console.log(`  ${queries.length} requêtes, ${pages.length} pages, ${pairs.length} paires`);
  console.log(`  ${insights.quickWins.length} quick wins, ${insights.technicalIssues.length} issues, ${insights.contentSuggestions.length} content`);

  // Upsert dans Supabase
  const { error } = await supabase.from('gsc_snapshots').upsert({
    period_start: startDate,
    period_end: endDate,
    period_days: days,
    totals: { clicks: totalClicks, impressions: totalImpressions, ctr, position },
    queries: queriesData,
    pages: pagesData,
    pairs: pairsData,
    insights,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'period_start,period_end' });

  if (error) {
    console.error(`  ✗ Insert failed: ${error.message}`);
    return false;
  }
  console.log(`  ✓ Snapshot sauvegardé en base`);
  return true;
}

async function main() {
  console.log(`Propriété : ${SITE_URL}`);
  console.log(`Périodes : ${PERIODS.join(', ')} jours`);

  const auth = await authClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  for (const days of PERIODS) {
    await fetchPeriod(searchconsole, days);
  }
  await fetchDailyHistory(searchconsole);
  console.log('\n✅ Sync terminée');
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  if (err.response?.data?.error) console.error(err.response.data.error);
  process.exit(1);
});
