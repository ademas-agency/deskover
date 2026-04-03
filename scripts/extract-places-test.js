// Test rapide : extraction LLM sur 3 articles
import 'dotenv/config';
import { readFile } from 'fs/promises';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';

const PROMPT = `Tu extrais les cafés, coffee shops, coworkings et tiers-lieux mentionnés dans cet article de blog français.

Pour chaque lieu, retourne :
- name : nom exact tel qu'écrit dans l'article
- address : adresse complète si mentionnée, sinon null
- city : ville
- arrondissement : numéro d'arrondissement si Paris (ex: "11"), sinon null
- description : 1 phrase résumant pourquoi c'est bien pour travailler
- category : "cafe" | "coffee_shop" | "coworking" | "tiers_lieu"
- signals : liste parmi ["wifi", "prises", "calme", "grandes_tables", "laptop_friendly", "terrasse", "food", "pas_cher", "ambiance"]

Règles :
- Uniquement les lieux recommandés POUR TRAVAILLER
- Ignorer les lieux mentionnés négativement
- Conserver l'orthographe exacte avec accents
- Ne PAS inventer d'adresse

Retourne UNIQUEMENT un JSON array valide. Aucun commentaire.`;

async function callClaude(content, title) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${PROMPT}\n\nTitre : ${title}\n\nTexte :\n---\n${content.slice(0, 10000)}\n---`,
      }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content[0]?.text || '[]';
  try { return JSON.parse(text); } catch {
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

async function main() {
  const lines = (await readFile(new URL('./data/all-articles.jsonl', import.meta.url), 'utf-8'))
    .split('\n').filter(Boolean).slice(0, 3).map(l => JSON.parse(l));

  for (const article of lines) {
    console.log(`\n📰 "${article.title}" (${article.city_name})`);
    console.log(`   ${article.url}\n`);
    const places = await callClaude(article.content, article.title);
    for (const p of places) {
      console.log(`   ✅ ${p.name} (${p.category}) — ${p.city}${p.arrondissement ? ' ' + p.arrondissement + 'e' : ''}`);
      console.log(`      ${p.description}`);
      console.log(`      Signaux: ${p.signals?.join(', ')}`);
    }
    console.log(`   → ${places.length} lieux extraits`);
  }
}

main().catch(console.error);
