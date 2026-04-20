# CLAUDE.md – cashfinch (Projekt-spezifische Regeln)

Ergänzt die globale `CLAUDE.md` in `~/.claude/`.

---

## 🔀 Git-Konventionen

- **Haupt-Branch:** `main` (GitHub-Default).
- **Immer auf `main` arbeiten und nach `main` pushen** – es gibt keinen separaten `master`-Branch mehr.
- Remote heißt `cashfinch-origin` (nicht `origin`).
- Vor jeder Session: `git fetch --prune && git pull`, um neuen Stand von macOS/Windows zu ziehen.
- Dieses Projekt wird auf **zwei Rechnern** parallel entwickelt (Windows + macOS) – daher immer erst pullen, bevor neue Commits gemacht werden, um Merge-Konflikte zu vermeiden.

## 📦 Release-Prozess

- Version in `package.json` bumpen (SemVer: `fix` = patch, `feat` = minor).
- `package-lock.json` mit `npm install --package-lock-only` synchronisieren.
- Commit-Message: `chore(release): v<version>`.
- Annotated Tag setzen: `git tag -a v<version> -m "..."`.
- Push mit `git push cashfinch-origin main` + `git push cashfinch-origin v<version>`.

## 🧪 Tests

- Test-Runner: plain Node (`node tests/jsonStore.test.js`), kein Jest/Vitest.
- Testdatei-Konvention: `tests/*.test.js`.
- Vor jedem Commit: `npm test` und `npm run build` müssen grün sein.

## 💾 Datenspeicher-Besonderheit

- `data/*.json` und `data/config.json` **niemals** einchecken (stehen in `.gitignore`).
- `data/config.json` ist der **lokale, OS-spezifische Pointer** – enthält den Datenpfad für diese Maschine.
- Die vollständige Config (Salt, Verifier, Reihenfolgen) liegt beim Datenordner selbst – so funktioniert Cross-OS-Sync über OneDrive/Dropbox zwischen Windows und macOS.
- Beim Anfassen von `server/storage/jsonStore.js`: Retry-Wrapper (`readFileSyncResilient` / `writeFileSyncResilient`) nutzen, **nicht** direktes `fs.readFileSync/writeFileSync`.
