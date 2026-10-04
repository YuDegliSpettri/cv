# Font del CV

Manrope e DM Sans sono distribuiti dal medesimo hosting della pagina. I file WOFF2 sono copie senza modifiche dei subset `latin` serviti da Google Fonts al sito il 4 ottobre 2026; non è previsto alcun download dal provider durante la visita o la build.

| Famiglia | File | Byte | Pesi dichiarati nel CSS |
| --- | --- | ---: | --- |
| Manrope | `manrope-latin-variable.woff2` | 24.576 | 400–800 |
| DM Sans | `dm-sans-latin-variable.woff2` | 36.980 | 400–700 |

I due file hanno un asse variabile `wght`: Manrope 200–800 e DM Sans 100–1000. Il CSS espone soltanto l'intervallo necessario al CV e conserva `font-display: swap`, gli stessi intervalli Unicode e Arial/sans-serif come fallback. Il subset comprende le lettere accentate italiane; i simboli non compresi continuano a usare i caratteri di sistema. Per ulteriori alfabeti, riesaminare i subset.

Entrambe le famiglie sono distribuite con SIL Open Font License 1.1. I copyright e i testi integrali sono in [Manrope-OFL.txt](Manrope-OFL.txt) e [DM-Sans-OFL.txt](DM-Sans-OFL.txt), inclusi nel pacchetto pubblico insieme ai font.

## Provenienza e integrità

- Manrope: [WOFF2 originale](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSvfedN4.woff2), SHA-256 `e310b55a7fd9677f5e3555e6c6c4d064fa1f1d24393f0ddbe217cea12a8c432f`.
- DM Sans: [WOFF2 originale](https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K6z9mXg.woff2), SHA-256 `468d56b6b25b05b70190b6c233d773f6f1770e8579827ce022a57f03fa8002fb`.
- Licenze recuperate dal repository ufficiale `google/fonts`, revisione `9710da1eacb3be272583c3224dcb70f9da6eadbb`: [Manrope](https://github.com/google/fonts/blob/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/manrope/OFL.txt), [DM Sans](https://github.com/google/fonts/blob/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/dmsans/OFL.txt).

Gli aggiornamenti sono espliciti: verificare fonte, licenza, pesi, copertura e hash, poi eseguire la suite con font locali e fallback. Conservare il contenuto accessibile anche se i font non sono disponibili.
