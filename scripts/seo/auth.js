import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const CLIENT_FILE = path.join(ROOT, '.secrets/oauth-client.json');
const TOKEN_FILE = path.join(ROOT, '.secrets/oauth-token.json');

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

function loadClient() {
  if (!fs.existsSync(CLIENT_FILE)) {
    throw new Error(
      `Fichier client OAuth introuvable : ${CLIENT_FILE}\n` +
        `→ Télécharge le JSON du client OAuth Desktop depuis Google Cloud Console et place-le dans ce chemin.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const conf = raw.installed || raw.web;
  if (!conf) throw new Error('Format client OAuth invalide');
  return conf;
}

async function runFlow(oauth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url, 'http://localhost');
        if (!u.searchParams.has('code')) {
          res.writeHead(400);
          res.end('Pas de code dans la callback.');
          return;
        }
        const code = u.searchParams.get('code');
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<h2>Authentification réussie ✅</h2><p>Tu peux fermer cet onglet.</p>'
        );
        server.close();
        resolve(tokens);
      } catch (err) {
        res.writeHead(500);
        res.end('Erreur : ' + err.message);
        server.close();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const redirectUri = `http://127.0.0.1:${port}`;
      oauth2Client.redirectUri = redirectUri;
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
      });
      console.log('');
      console.log('Ouverture du navigateur pour authentification…');
      console.log('Si rien ne s\'ouvre, copie cette URL :');
      console.log(authUrl);
      console.log('');
      openBrowser(authUrl);
    });
  });
}

export async function authClient() {
  const conf = loadClient();
  const oauth2Client = new google.auth.OAuth2(
    conf.client_id,
    conf.client_secret,
    'http://127.0.0.1'
  );

  if (fs.existsSync(TOKEN_FILE)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    oauth2Client.setCredentials(tokens);
    oauth2Client.on('tokens', (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(merged, null, 2));
    });
    return oauth2Client;
  }

  await runFlow(oauth2Client);
  return oauth2Client;
}
