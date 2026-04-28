import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { authClient } from './auth.js';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '531430422';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const PERIODS = args.all ? [7, 28, 90, 365] : [Number(args.days) || 28];

function ymd(d) { return d.toISOString().slice(0, 10); }
function rangeDates(days) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: ymd(start), endDate: ymd(end) };
}

async function runReport(auth, body) {
  const accessTokenRes = await auth.getAccessToken();
  const token = typeof accessTokenRes === 'string' ? accessTokenRes : accessTokenRes?.token;
  if (!token) throw new Error('Pas de token OAuth (re-authentification nécessaire)');

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

function rowsToObjects(report, dimNames, metricNames) {
  if (!report.rows) return [];
  return report.rows.map(r => {
    const obj = {};
    dimNames.forEach((n, i) => { obj[n] = r.dimensionValues[i]?.value ?? ''; });
    metricNames.forEach((n, i) => {
      const v = r.metricValues[i]?.value ?? '0';
      obj[n] = /^\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    });
    return obj;
  });
}

async function fetchPeriod(auth, days) {
  const { startDate, endDate } = rangeDates(days);
  console.log(`\n→ Période ${days}j : ${startDate} → ${endDate}`);

  const dateRange = [{ startDate, endDate }];

  // 1. Totals
  const totalsReport = await runReport(auth, {
    dateRanges: dateRange,
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'newUsers' },
    ],
  });
  const totalsRow = totalsReport.rows?.[0]?.metricValues || [];
  const totals = {
    activeUsers: Number(totalsRow[0]?.value || 0),
    sessions: Number(totalsRow[1]?.value || 0),
    screenPageViews: Number(totalsRow[2]?.value || 0),
    engagementRate: Number(totalsRow[3]?.value || 0),
    averageSessionDuration: Number(totalsRow[4]?.value || 0),
    newUsers: Number(totalsRow[5]?.value || 0),
  };

  // 2. Pages
  const pagesReport = await runReport(auth, {
    dateRanges: dateRange,
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 200,
  });
  const pages = rowsToObjects(pagesReport, ['page'], ['views', 'users', 'sessions', 'engagementRate', 'avgEngagementTime']);

  // 3. Sources
  const sourcesReport = await runReport(auth, {
    dateRanges: dateRange,
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 30,
  });
  const sources = rowsToObjects(sourcesReport, ['source', 'medium'], ['sessions', 'users']);

  // 4. Events
  const eventsReport = await runReport(auth, {
    dateRanges: dateRange,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 30,
  });
  const events = rowsToObjects(eventsReport, ['name'], ['count', 'users']);

  // 5. Pays
  const countriesReport = await runReport(auth, {
    dateRanges: dateRange,
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    limit: 20,
  });
  const countries = rowsToObjects(countriesReport, ['country'], ['users', 'sessions']);

  // 6. Devices
  const devicesReport = await runReport(auth, {
    dateRanges: dateRange,
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
  });
  const devices = rowsToObjects(devicesReport, ['category'], ['users', 'sessions']);

  console.log(`  ${totals.activeUsers} users, ${totals.sessions} sessions, ${totals.screenPageViews} views`);
  console.log(`  Engagement ${(totals.engagementRate * 100).toFixed(1)}%, durée moyenne ${totals.averageSessionDuration.toFixed(0)}s`);
  console.log(`  ${pages.length} pages, ${sources.length} sources, ${events.length} events`);

  const { error } = await supabase.from('ga4_snapshots').upsert({
    period_start: startDate,
    period_end: endDate,
    period_days: days,
    totals,
    pages,
    sources,
    events,
    countries,
    devices,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'period_start,period_end' });

  if (error) { console.error(`  ✗ ${error.message}`); return false; }
  console.log(`  ✓ Snapshot sauvegardé`);
  return true;
}

async function main() {
  console.log(`Property ID : ${PROPERTY_ID}`);
  console.log(`Périodes : ${PERIODS.join(', ')} jours`);

  const auth = await authClient();
  for (const days of PERIODS) {
    await fetchPeriod(auth, days);
  }
  console.log('\n✅ Sync GA4 terminée');
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
