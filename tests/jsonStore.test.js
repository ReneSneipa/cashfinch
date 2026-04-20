/**
 * Tests für server/storage/jsonStore.js.
 *
 * Reines Node-Runner ohne Framework (Projekt hat aktuell kein Test-Framework).
 * Aufruf: node tests/jsonStore.test.js
 *
 * Fokus: Datenverlust-Schutz bei transienten Lesefehlern der config.json
 *        (OneDrive-Sync-Bug, siehe Bug #1 und #2).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// ── Test-Sandbox ──────────────────────────────────────────────────────────────
// Wir arbeiten in einem temporären Verzeichnis damit Produktions-Daten unberührt bleiben.
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'cashfinch-test-'));
const TMP_DATA = path.join(TMP_ROOT, 'data');
fs.mkdirSync(TMP_DATA, { recursive: true });

// Modul dynamisch laden mit gepatchtem DEFAULT_DATA_PATH.
// jsonStore bestimmt seine Pfade aus __dirname; wir überschreiben per Module-Replacement.
const jsonStorePath = path.resolve(__dirname, '../server/storage/jsonStore.js');
const jsonStoreSource = fs.readFileSync(jsonStorePath, 'utf8');

// Tests erstellen ein Wrapper-Skript, das DEFAULT_DATA_PATH auf TMP_DATA umbiegt.
const wrapperSource = jsonStoreSource
  .replace(
    "const DEFAULT_DATA_PATH = path.join(__dirname, '../../data');",
    `const DEFAULT_DATA_PATH = ${JSON.stringify(TMP_DATA)};`
  );
const wrapperPath = path.join(TMP_ROOT, 'jsonStore-under-test.js');
fs.writeFileSync(wrapperPath, wrapperSource, 'utf8');

// Crypto-/keyStore-Module als lokale Kopien verfügbar machen (relative require-Pfade)
const serverStorageDir = path.dirname(jsonStorePath);
fs.mkdirSync(path.join(TMP_ROOT, 'server-stubs'), { recursive: true });
for (const datei of ['keyStore.js', 'crypto.js']) {
  fs.copyFileSync(path.join(serverStorageDir, datei), path.join(TMP_ROOT, 'server-stubs', datei));
}
// Die Wrapper-Datei require't './keyStore' und './crypto' relativ zu ihrem Ort → wir legen sie daneben
fs.copyFileSync(path.join(serverStorageDir, 'keyStore.js'), path.join(TMP_ROOT, 'keyStore.js'));
fs.copyFileSync(path.join(serverStorageDir, 'crypto.js'),  path.join(TMP_ROOT, 'crypto.js'));

const jsonStore = require(wrapperPath);

// ── Test-Utilities ────────────────────────────────────────────────────────────
let bestanden = 0;
let gefailt = 0;

/**
 * Führt einen Test aus und protokolliert das Ergebnis.
 * @param {string} name - Test-Beschreibung
 * @param {Function} fn - Test-Funktion
 */
function test(name, fn) {
  try {
    fn();
    bestanden++;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    gefailt++;
    console.log(`  \u2717 ${name}`);
    console.log(`      ${err.message}`);
  }
}

/**
 * Leert den TMP_DATA-Ordner vor jedem Test.
 */
function reset() {
  for (const datei of fs.readdirSync(TMP_DATA)) {
    fs.rmSync(path.join(TMP_DATA, datei), { recursive: true, force: true });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
console.log('\njsonStore – Schutz gegen Config-Datenverlust\n');

test('writeConfig: legt Datei an wenn noch keine existiert', () => {
  reset();
  jsonStore.writeConfig({ datenpfad: '', onboardingGesehen: true });
  const geschrieben = JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'config.json'), 'utf8'));
  assert.strictEqual(geschrieben.onboardingGesehen, true);
});

test('writeConfig: mergt Updates mit bestehender Config', () => {
  reset();
  // Bestehende Config mit Salt und Reihenfolge
  const bestehend = {
    datenpfad: '',
    salt: 'abc123',
    verifier: { iv: 'iv', ciphertext: 'ct', authTag: 'tag' },
    kontenReihenfolge: ['Giro', 'Spar'],
    encHintGesehen: true,
  };
  fs.writeFileSync(path.join(TMP_DATA, 'config.json'), JSON.stringify(bestehend), 'utf8');

  // Nur ein Feld updaten
  jsonStore.writeConfig({ onboardingGesehen: true });

  const danach = JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'config.json'), 'utf8'));
  assert.strictEqual(danach.salt, 'abc123', 'Salt muss erhalten bleiben');
  assert.deepStrictEqual(danach.verifier, bestehend.verifier, 'Verifier muss erhalten bleiben');
  assert.deepStrictEqual(danach.kontenReihenfolge, ['Giro', 'Spar'], 'Reihenfolge muss erhalten bleiben');
  assert.strictEqual(danach.encHintGesehen, true);
  assert.strictEqual(danach.onboardingGesehen, true);
});

test('writeConfig: WIRFT Fehler wenn existierende Config nicht lesbar (Bug #1 Schutz)', () => {
  reset();
  const configPath = path.join(TMP_DATA, 'config.json');
  // Datei existiert mit invalidem JSON (simuliert transienten Lese-/Parse-Fehler,
  // analog zu OneDrive-Placeholder-Rehydration-Timeout oder EBUSY).
  fs.writeFileSync(configPath, '{ "salt": "abc", BROKEN', 'utf8');

  // Muss werfen – darf NICHT die Datei überschreiben und dabei salt verlieren
  assert.throws(
    () => jsonStore.writeConfig({ onboardingGesehen: true }),
    (err) => err instanceof SyntaxError || err.message.includes('JSON')
  );

  // Datei muss unverändert sein (nicht durch {onboardingGesehen:true} ersetzt worden)
  const danach = fs.readFileSync(configPath, 'utf8');
  assert.strictEqual(danach, '{ "salt": "abc", BROKEN', 'Config darf nicht überschrieben werden wenn vorher unlesbar');
});

test('migrateDatapfad: WIRFT Fehler wenn bestehende Config nicht lesbar (Bug #2 Schutz)', () => {
  reset();
  const configPath = path.join(TMP_DATA, 'config.json');
  fs.writeFileSync(configPath, 'not json at all', 'utf8');

  const zielPfad = path.join(TMP_ROOT, 'ziel');
  fs.mkdirSync(zielPfad, { recursive: true });

  assert.throws(
    () => jsonStore.migrateDatapfad(zielPfad),
    (err) => err instanceof SyntaxError || err.message.includes('JSON')
  );

  // Ursprüngliche Config muss unverändert sein
  const danach = fs.readFileSync(configPath, 'utf8');
  assert.strictEqual(danach, 'not json at all');
});

test('migrateDatapfad: funktioniert normal wenn Config lesbar ist', () => {
  reset();
  const bestehend = { datenpfad: '', salt: 'xyz', verifier: { iv: 'i' } };
  fs.writeFileSync(path.join(TMP_DATA, 'config.json'), JSON.stringify(bestehend), 'utf8');

  const zielPfad = path.join(TMP_ROOT, 'ziel');
  fs.mkdirSync(zielPfad, { recursive: true });

  jsonStore.migrateDatapfad(zielPfad);

  // Im Ziel liegt jetzt die volle Config (mit Salt) – aber datenpfad ist
  // absichtlich LEER, weil datenpfad OS-spezifisch ist und nicht in die
  // synchronisierte Config gehört (Cross-OS-Sync, v1.4.0).
  const zielConfig = JSON.parse(fs.readFileSync(path.join(zielPfad, 'config.json'), 'utf8'));
  assert.strictEqual(zielConfig.salt, 'xyz');
  assert.strictEqual(zielConfig.datenpfad, '', 'synced config darf keinen OS-spezifischen Pfad enthalten');

  // Im DEFAULT_DATA_PATH liegt nur noch der Pointer – dort steht der Pfad
  const pointer = JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'config.json'), 'utf8'));
  assert.strictEqual(pointer.datenpfad, zielPfad);
  assert.strictEqual(pointer.salt, undefined, 'Pointer darf keinen Salt enthalten');
});

test('migrateDatapfad: funktioniert auch ohne bestehende Config (Erstmigration)', () => {
  reset();
  const zielPfad = path.join(TMP_ROOT, 'erstmigration');
  fs.mkdirSync(zielPfad, { recursive: true });

  // Kein writeFileSync – config.json existiert nicht
  jsonStore.migrateDatapfad(zielPfad);

  // Synced Ziel-Config hat datenpfad='' (Cross-OS-Sync), Pointer hat den Pfad
  const zielConfig = JSON.parse(fs.readFileSync(path.join(zielPfad, 'config.json'), 'utf8'));
  assert.strictEqual(zielConfig.datenpfad, '', 'synced config darf keinen OS-spezifischen Pfad enthalten');

  const pointer = JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'config.json'), 'utf8'));
  assert.strictEqual(pointer.datenpfad, zielPfad, 'Pointer enthält den tatsächlichen Pfad');
});

test('readConfig: gibt Defaults zurück wenn keine Config existiert', () => {
  reset();
  const config = jsonStore.readConfig();
  assert.strictEqual(config.datenpfad, '');
  assert.strictEqual(config.salt, null);
  assert.strictEqual(config.verifier, null);
  assert.deepStrictEqual(config.kontenReihenfolge, []);
});

test('readConfig: gibt auch bei kaputter Config Defaults zurück (kein Throw an APIs)', () => {
  reset();
  fs.writeFileSync(path.join(TMP_DATA, 'config.json'), '{ broken', 'utf8');
  // readConfig muss weich sein – sonst crashen alle Routen
  const config = jsonStore.readConfig();
  assert.strictEqual(config.salt, null);
});

test('writeConfig: datenpfad-Pointer-Logik funktioniert nach migrateDatapfad', () => {
  reset();
  const zielPfad = path.join(TMP_ROOT, 'pointer-test');
  fs.mkdirSync(zielPfad, { recursive: true });

  // Initial migrieren
  jsonStore.migrateDatapfad(zielPfad);

  // Jetzt einen writeConfig ausführen – muss in ZIELPFAD schreiben, nicht DEFAULT_DATA_PATH
  jsonStore.writeConfig({ onboardingGesehen: true });

  const zielConfig = JSON.parse(fs.readFileSync(path.join(zielPfad, 'config.json'), 'utf8'));
  assert.strictEqual(zielConfig.onboardingGesehen, true, 'Update muss im Zielpfad landen');

  // Pointer-Datei darf weiterhin nur datenpfad enthalten
  const pointer = JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'config.json'), 'utf8'));
  assert.strictEqual(pointer.onboardingGesehen, undefined);
});

// ── Simulation des Original-Bugs (vor Fix) ────────────────────────────────────

// ── Retry-Layer Tests ─────────────────────────────────────────────────────────

test('retryOnTransient: gibt Ergebnis zurück wenn Operation direkt erfolgreich', () => {
  const { retryOnTransient } = jsonStore._internals;
  let aufrufe = 0;
  const ergebnis = retryOnTransient(() => { aufrufe++; return 'ok'; });
  assert.strictEqual(ergebnis, 'ok');
  assert.strictEqual(aufrufe, 1, 'Nur ein Aufruf nötig');
});

test('retryOnTransient: wiederholt bei EBUSY und gibt nach Erfolg zurück', () => {
  const { retryOnTransient } = jsonStore._internals;
  let aufrufe = 0;
  const ergebnis = retryOnTransient(() => {
    aufrufe++;
    if (aufrufe < 3) {
      const err = new Error('busy');
      err.code = 'EBUSY';
      throw err;
    }
    return 'finally-ok';
  }, { delaysMs: [0, 0] }); // kein echter Sleep im Test
  assert.strictEqual(ergebnis, 'finally-ok');
  assert.strictEqual(aufrufe, 3);
});

test('retryOnTransient: propagiert ENOENT sofort ohne Retry', () => {
  const { retryOnTransient } = jsonStore._internals;
  let aufrufe = 0;
  assert.throws(() => retryOnTransient(() => {
    aufrufe++;
    const err = new Error('not found');
    err.code = 'ENOENT';
    throw err;
  }), /not found/);
  assert.strictEqual(aufrufe, 1, 'ENOENT darf NICHT wiederholt werden');
});

test('retryOnTransient: propagiert SyntaxError sofort (nicht transient)', () => {
  const { retryOnTransient } = jsonStore._internals;
  let aufrufe = 0;
  assert.throws(() => retryOnTransient(() => {
    aufrufe++;
    throw new SyntaxError('bad json');
  }), /bad json/);
  assert.strictEqual(aufrufe, 1);
});

test('retryOnTransient: wirft nach erschöpften Versuchen den letzten Fehler', () => {
  const { retryOnTransient } = jsonStore._internals;
  let aufrufe = 0;
  assert.throws(() => retryOnTransient(() => {
    aufrufe++;
    const err = new Error(`busy-${aufrufe}`);
    err.code = 'EBUSY';
    throw err;
  }, { delaysMs: [0, 0] }), /busy-3/);
  assert.strictEqual(aufrufe, 3);
});

test('retryOnTransient: kennt alle OneDrive-typischen Fehlercodes', () => {
  const { TRANSIENT_ERRORS } = jsonStore._internals;
  for (const code of ['EBUSY', 'EIO', 'EPERM', 'EACCES', 'ETXTBSY']) {
    assert.ok(TRANSIENT_ERRORS.has(code), `${code} muss transient sein`);
  }
  // ENOENT darf NICHT transient sein (sonst Performance-Killer)
  assert.ok(!TRANSIENT_ERRORS.has('ENOENT'), 'ENOENT darf nicht transient sein');
});

test('Regressionstest: Bug-Szenario ohne Fix würde salt/verifier verlieren', () => {
  // Dieser Test dokumentiert das Angriffsszenario: unlesbare Config + writeConfig.
  // Mit Fix: writeConfig wirft Fehler, Datei bleibt unverändert.
  reset();
  const configPath = path.join(TMP_DATA, 'config.json');
  // Kaputte config mit eigentlich wichtigen Daten (vom Nutzer gesetzter Salt!)
  fs.writeFileSync(configPath, 'CORRUPTED-salt=originalUserSalt', 'utf8');

  // Vor dem Fix hätte writeConfig hier silent ein leeres current verwendet
  // und {encHintGesehen:true} als einzigen Inhalt geschrieben – Datenverlust!
  // Nach dem Fix: wirft.
  let warfFehler = false;
  try {
    jsonStore.writeConfig({ encHintGesehen: true });
  } catch {
    warfFehler = true;
  }
  assert.strictEqual(warfFehler, true, 'writeConfig muss bei kaputter Config werfen');

  // Wichtig: die "kaputte" Datei ist noch da, kann vom Nutzer oder Admin repariert werden
  assert.strictEqual(
    fs.readFileSync(configPath, 'utf8'),
    'CORRUPTED-salt=originalUserSalt',
    'Beschädigte Datei darf nicht durch writeConfig überschrieben werden'
  );
});

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`\n${bestanden} bestanden, ${gefailt} gefailt\n`);

// Cleanup
fs.rmSync(TMP_ROOT, { recursive: true, force: true });

process.exit(gefailt > 0 ? 1 : 0);
