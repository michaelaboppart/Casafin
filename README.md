# CasaFin — Swiss Financial OS

Statische Web-App (kein Server/Build nötig). Direkt auf GitHub Pages, Vercel oder Infomaniak deploybar.

## Inhalt
| Datei | Zweck |
|---|---|
| `index.html` | Landing-Page (bilingual DE/EN, Petrol-Brand) |
| `CasaFin.html` | Die App — verschlüsselt im Browser, Demo-Daten |
| `Datenschutz.html` | Datenschutzerklärung (DE/EN) |
| `assets/` | Logo (Kompass) |
| `landing-assets/` | App-Screenshots für die Landing |

## Deploy auf Vercel
1. Diesen Ordnerinhalt in ein GitHub-Repo `casafin` legen (oder per Drag & Drop hochladen).
2. Vercel → **Add New → Project → Repo importieren**.
3. Framework: **Other** · Build Command: *leer* · Output Directory: `.` (Root).
4. Deploy. Fertig — `index.html` wird automatisch als Startseite ausgeliefert.

## Hinweise
- Die App speichert alle Daten **lokal & verschlüsselt im Browser** des Nutzers (Web Crypto, AES-GCM). Kein Backend, keine Server-Datenbank → datenschutzfreundlich.
- Es ist eine **Demo** mit Beispieldaten. Echte Konto-/Banksync kommt in einer späteren Phase (Backend).
