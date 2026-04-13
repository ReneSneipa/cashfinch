/**
 * Express-Server für cashfinch.
 *
 * Im Entwicklungsmodus (npm run dev):
 *   - Läuft auf Port 3001
 *   - Vite (Port 5173) proxied API-Anfragen hierher
 *
 * Im Produktionsmodus (npm start):
 *   - Läuft auf Port 3000
 *   - Serviert das gebaute Frontend aus ./dist
 *   - Und alle API-Routen unter /api
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const einnahmenRouter     = require('./routes/einnahmen');
const ausgabenRouter      = require('./routes/ausgaben');
const budgetsRouter       = require('./routes/budgets');
const einstellungenRouter = require('./routes/einstellungen');
const kontenRouter        = require('./routes/konten');
const kategorienRouter    = require('./routes/kategorien');
const konsistenzRouter    = require('./routes/konsistenz');
const authRouter          = require('./routes/auth');
const requireUnlocked     = require('./middleware/requireUnlocked');

const { readConfig }      = require('./storage/jsonStore');
const { setSetupDone }    = require('./storage/keyStore');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = IS_PROD ? 3000 : 3001;

// Verschlüsselungs-Status beim Start einlesen
const initConfig = readConfig();
setSetupDone(!!initConfig.salt);

// Middleware
app.use(cors());
app.use(express.json());

// Auth-Routen (immer zugänglich – kein Lock-Check)
app.use('/api/auth', authRouter);

// Lock-Middleware für alle anderen API-Routen
app.use('/api', requireUnlocked);

// Geschützte API-Routen
app.use('/api/einnahmen',     einnahmenRouter);
app.use('/api/ausgaben',      ausgabenRouter);
app.use('/api/budgets',       budgetsRouter);
app.use('/api/einstellungen', einstellungenRouter);
app.use('/api/konten',        kontenRouter);
app.use('/api/kategorien',    kategorienRouter);
app.use('/api/konsistenz',    konsistenzRouter);

// Im Produktionsmodus das gebaute Frontend ausliefern
if (IS_PROD) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // Alle nicht-API-Routen ans React SPA weiterleiten (app.use statt app.get('*') – Express 5)
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  const url = IS_PROD ? `http://localhost:${PORT}` : `http://localhost:5173`;
  console.log(`\n  cashfinch laeuft auf ${url}\n`);
});
