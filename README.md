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

Il harness applica il movimento ridotto tramite `use.contextOptions.reducedMotion`: la versione fissata di Playwright non inoltra `use.reducedMotion` al contesto della fixture. Il controllo HAR-02 verifica nel browser sia `matchMedia` sia lo `scroll-behavior: auto` effettivo, così un'opzione ignorata non può rendere intermittenti i test di resize durante lo scorrimento animato. Riferimento: [difetto del runner Playwright](https://github.com/microsoft/playwright/issues/42001).

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

Il 4 ottobre 2026 sono state applicate le impostazioni remote seguenti:

- **Settings → Pages → Source: GitHub Actions** (`build_type: workflow`).
- `main` richiede una pull request e il successo di **Quality checks**, proveniente dall'app GitHub Actions; il branch deve essere aggiornato rispetto a `main`.
- Le regole valgono anche per gli amministratori; force push e cancellazione di `main` sono vietati. Non è richiesta l'approvazione di un secondo manutentore.
- Le pull request sono abilitate per i collaboratori. Il metodo di integrazione già configurato nel repository è **rebase**.

Queste impostazioni sono esterne al checkout: in un nuovo repository vanno applicate e verificate prima del primo rilascio. La sola presenza del YAML non attiva il gate. Una run fallita deve impedire il merge e saltare `Package site` e `Deploy Pages`; la source legacy da branch consentirebbe invece una pubblicazione indipendente. Riferimenti: [workflow personalizzati Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [protezione dei branch](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [Playwright in CI](https://playwright.dev/docs/ci-intro).

## Rilascio e tracciabilità

Partire da un checkout pulito e aggiornato di `origin/main`, con Node e browser indicati sopra. Creare un branch `codex/<nome-intervento>`, applicare la modifica e aggiornare il changelog. Eseguire `npm run check` e `npm test`; per modifiche al harness eseguire anche `npm run test:regressions` con la cronologia originale disponibile.

Preparare e controllare il pacchetto con `npm run package:site`: gli otto file di `scripts/site-files.cjs` devono coincidere con i sorgenti. `_site/` è ricreata dal comando e non va modificata a mano né aggiunta a Git. Il pacchetto seleziona esplicitamente gli asset: README, analisi, test, manifest e dipendenze restano fuori dalla pubblicazione. I font e le licenze sono già nel checkout; non si scaricano font durante il packaging.

Committare, inviare il branch con `git push -u origin HEAD` e aprire una pull request verso `main` (`gh pr create`). Attendere il successo di `Quality checks` sul commit corrente (`gh pr checks --watch`); se `main` è avanzata, aggiornare il branch e attendere la nuova verifica. Integrare tramite rebase (`gh pr merge --rebase`). Il normale rilascio non richiede modifiche alla protezione né bypass amministrativi.

Dopo il merge controllare la run **Site quality and Pages** sul nuovo SHA di `main`: devono riuscire, in ordine, `Quality checks`, `Package site` e `Deploy Pages`. Conservare nei riferimenti del rilascio SHA, URL della pull request e URL della run. Una CI positiva sulla pull request non dimostra da sola che il deploy di `main` sia riuscito.

Verificare infine [il sito pubblico](https://yudeglispettri.github.io/cv/), i frammenti, i font e il caricamento senza errori. Per riscontrare la revisione servita, confrontare gli otto asset pubblici con quelli di quel commit (byte/hash); l'HTML contiene un canonical stabile, non un numero di versione. Un fallimento mantiene il deployment precedente: correggere il branch e ripetere il percorso. I report di errore CI scadono dopo sette giorni, quindi scaricare subito le evidenze necessarie tramite la pagina della run o `gh run download <run-id>`.

## Rollback

Individuare l'ultimo rilascio funzionante nelle run con **Deploy Pages** riuscito e annotarne SHA e URL. Da `origin/main` creare un nuovo branch `codex/rollback-<nome>` e usare `git revert <commit-difettoso>`; se il problema coinvolge più commit, ripristinarli dal più recente al più vecchio, verificando il diff finale. La cronologia lineare del rebase consente il revert dei singoli commit senza un merge parent.

Eseguire gli stessi controlli e preparare il pacchetto; verificare che gli asset corrispondano alla revisione funzionante scelta oppure documentare le modifiche successive conservate intenzionalmente. Aprire una pull request e attendere il controllo obbligatorio, poi integrare e verificare la nuova run di deploy e gli asset pubblici. Il rollback è un nuovo rilascio verificato: conserva la cronologia e usa lo stesso gate. Se il difetto riguarda il workflow, correggere anche quel file nella pull request; il percorso di packaging e deploy deve restare dipendente dal controllo qualità.

## Perimetro di supporto

Il sito è una pagina italiana con direzione LTR. La baseline automatizzata comprende Chromium e WebKit forniti da Playwright **1.62.1**, su macOS e Ubuntu **24.04**, con font locali e fallback. Sono coperti viewport da **320 a 1440px**, portrait e landscape, testo al **200%**, spaziatura personalizzata, collegamenti nativi senza JavaScript o senza una delle API observer, movimento ridotto e regole print.

Lo scrollspy è un miglioramento progressivo per i motori moderni con `IntersectionObserver`, `ResizeObserver`, CSS Grid e sintassi JavaScript ES2022 (compreso `Array.prototype.at`). Senza JavaScript restano disponibili contenuto e link HTML; l'offset dell'header usa il valore CSS nominale. L'assenza delle API observer è provata sui motori correnti, e non certifica parser JavaScript storici.

WebKit automatizzato non equivale a una prova su Safari/iOS installati. Firefox, browser integrati e dispositivi fisici non fanno parte della matrice verificata. Screen reader, sequenza completa di tabulazione, zoom reale del browser e paginazione A4/Letter richiedono verifiche manuali dedicate: non vengono dichiarati verificati dalla suite. Multilingua e RTL richiedono un'estensione esplicita del perimetro e dei controlli.
