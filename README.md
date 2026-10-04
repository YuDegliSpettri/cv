# Sito CV

Sito statico pubblicato sotto `/cv/`. Gli asset serviti sono `index.html`, `styles.css`, `navigation.js`, `favicon.svg`, due font WOFF2 e le rispettive licenze in `fonts/`; non è necessaria una build per visitarli. La pagina carica Manrope e DM Sans dallo stesso hosting, senza richieste a Google Fonts. Provenienza, pesi e hash sono in [fonts/README.md](fonts/README.md).

## Policy del browser

`index.html` dichiara una Content Security Policy in meta, subito dopo il charset e prima delle risorse. Script, CSS, immagini e font sono limitati alla stessa origine; script e stili inline non sono autorizzati. Sono vietati oggetti incorporati, modifiche alla base degli URL e invii di form. Il runtime può continuare a impostare le variabili CSS tramite CSSOM. Nuove risorse esterne devono essere valutate insieme alla policy; evitare wildcard o `unsafe-inline` per aggirare un errore.

Il meta `no-referrer` omette il Referer delle navigazioni e delle richieste governate dal documento. I font in un CSS esterno seguono invece la policy della risposta CSS e rimangono locali. Queste regole viaggiano con l'HTML anche nel pacchetto Pages. Il server di sviluppo non aggiunge header che farebbero apparire più protetta l'anteprima rispetto al deployment.

GitHub Pages non offre header HTTP personalizzati nella configurazione attuale. Il meta CSP non può applicare `frame-ancestors`; `X-Content-Type-Options: nosniff` richiede a sua volta un header. Queste due protezioni restano un limite documentato dell'hosting: aggiungere un meta o un file `_headers` non lo risolve. Se in futuro si dispone di header configurabili, applicare le protezioni all'origine e verificarle sulla risposta pubblica. Riferimenti: [CSP in HTML](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors), [Referrer-Policy e CSS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy), [header su Pages](https://github.com/orgs/community/discussions/54257).

## Sviluppo e verifiche

Usare Node **24.21.0**, indicato in `.node-version`. Playwright **1.62.1** è una dipendenza di sviluppo fissata nel manifest e nel lockfile; la versione determina anche le revisioni dei browser installati.

```sh
npm ci --ignore-scripts
npx playwright install chromium webkit
npm run dev
```

Il server ascolta solo su `127.0.0.1:4173`, reindirizza a `/cv/` e seleziona gli asset consentiti. `analisi/`, test, dipendenze e metadati Git non sono serviti. Su Linux, l'installazione dei browser può richiedere `npx playwright install --with-deps chromium webkit`.

```sh
npm run check
npm test
npm run test:regressions
```

`check` verifica sintassi JavaScript e presenza degli asset. `test` avvia e arresta autonomamente il server; la porta deve essere libera. Copre Chromium e WebKit sia con font locali sia con richieste font bloccate per verificare il fallback: geometria in otto viewport, testo al 200%, spaziatura personalizzata, sette frammenti, sezione corrente, header adattivo, cronologia, stampa, link senza JavaScript/API observer e riferimenti HTML. Le richieste fuori dall'origine locale sono bloccate, salvo le risposte innocue controllate dai test SEC-01 su una seconda origine di loopback. I test dei font verificano anche caricamento effettivo, licenze, assenza di tentativi di richieste esterne e aggiornamento dell'header dopo un caricamento ritardato. Le assertion usano il browser e il vero `IntersectionObserver`.

La fixture registra le violazioni CSP e fa fallire i normali test se ne rileva. `tests/security.spec.cjs` verifica il blocco nativo degli script esterni e inline, la posizione della CSP prima delle risorse e l'assenza del Referer nei collegamenti in uscita. Le risposte di prova sono controllate e i test ripetono gli stessi stimoli senza il rispettivo meta per confermare che l'effetto dipenda dalla policy. Le sole violazioni ammesse sono quelle attese nel test del blocco CSP.

`test:regressions` esporta in una cartella temporanea i quattro asset della revisione `4e4f03962aa7abe2aff7644e80a3a3ff3b06c579` e controlla sette casi noti, inclusi il caricamento dei font esterni e l'assenza della CSP. Ogni test selezionato deve fallire per il motivo atteso, con exit code 1; il comando complessivo passa soltanto se tutti i difetti vengono rilevati. La cronologia Git deve contenere quella revisione. I sorgenti di lavoro non vengono modificati.

```sh
npm run test:fonts
npm run test:report
```

`test:fonts` esegue soltanto i test dedicati ai font locali, già inclusi in `npm test` e nel gate CI. Dopo l'installazione iniziale di strumenti e browser, nessuna suite richiede accesso a Google. Il CSS conserva `font-display: swap` e Arial/sans-serif come fallback; i progetti `chromium-fallback` e `webkit-fallback` ne verificano la resa bloccando i download WOFF2.

Un fallimento produce screenshot, trace e dettagli in `test-results/` e un report HTML in `playwright-report/`; `test:report` apre quest'ultimo. Queste cartelle e `node_modules/` sono gitignored. I test falliti restituiscono un codice non zero e non vengono ritentati automaticamente. Le verifiche automatiche non sostituiscono Safari/iOS reali, screen reader, zoom del browser o controlli di paginazione A4/Letter.

## CI e pubblicazione

`.github/workflows/site.yml` esegue `npm ci --ignore-scripts`, installazione esplicita dei browser e controlli su pull request, push a `main` ed esecuzione manuale. Usa Ubuntu 24.04, la versione Node del file e azioni ufficiali fissate a SHA. Le evidenze dei fallimenti vengono conservate per sette giorni e associate al commit.

Su un push a `main`, il job `Package site` dipende da `Quality checks`, e `Deploy Pages` dipende dal pacchetto. Pull request ed esecuzioni manuali eseguono soltanto i controlli. Il pacchetto `_site/` contiene esclusivamente gli otto file elencati in `scripts/site-files.cjs`, inclusi i due font e le due licenze; `npm run package:site` consente di prepararlo anche localmente. Nessun download di font viene eseguito durante la build. Nessuna cartella di analisi o del harness viene inclusa.

Per attivare il gate sul sito ospitato:

1. In **Settings → Pages → Build and deployment → Source**, scegliere **GitHub Actions** prima di integrare il workflow su `main`. La pubblicazione diretta da una branch aggira questo workflow.
2. Pubblicare i file del harness e del workflow con il normale processo Git. Verificare una prima esecuzione di `Quality checks` e un deploy riuscito dello stesso commit.
3. Se si vuole impedire anche il merge di cambiamenti non verificati, impostare `Quality checks` come controllo obbligatorio su `main` tramite branch protection o ruleset, e richiedere il normale percorso di pull request.
4. Provare in una pull request una regressione nota: il controllo deve fallire, conservare le evidenze e non attivare i job di pubblicazione. Correggerla prima del merge.

Alla lettura del 3 ottobre 2026, il repository usava Pages dalla root di `main` (`build_type: legacy`) e `main` risultava non protetta. La preparazione locale del workflow non modifica queste impostazioni remote. Il blocco operativo va confermato dopo l'attivazione; non si può dedurre dalla sola presenza del YAML. Riferimenti: [workflow personalizzati Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Playwright in CI](https://playwright.dev/docs/ci-intro).
