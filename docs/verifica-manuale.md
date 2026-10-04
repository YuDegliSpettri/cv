# Verifica manuale di accessibilità e stampa

Protocollo HAR-03 per il sito CV italiano. Affianca `npm run check` e `npm test`; un risultato automatico positivo non certifica tutte le modalità d'uso. Le annotazioni della lingua seguono [WCAG 2.2, lingua delle parti](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html).

## Preparazione e registrazione

Usare un checkout pulito con Node e browser indicati nel README, installare dal lockfile e avviare `npm run dev`. Aprire `http://127.0.0.1:4173/cv/` nel browser da verificare, attendere i font e annotare:

- Data, esecutore, commit e SHA-256 di HTML/CSS/JS effettivamente serviti; URL locale o pubblico.
- Sistema operativo, browser e versione; screen reader, voci italiana/inglese, modalità di navigazione e impostazioni della tastiera.
- Dimensione della finestra, zoom, tema, preferenza di movimento e impostazioni di stampa.
- Per ogni caso: `pass`, `fail`, `non eseguito` o `non applicabile`, osservazione concreta ed evidenza. Un permesso o una voce mancanti sono `non eseguito`, non `pass`.

Conservare il riepilogo in `docs/verifiche/AAAA-MM-GG.md`. Immagini, PDF, trace e misure possono stare in `analisi/evidenze/`, gitignored: indicarne i nomi e gli hash nel riepilogo. Registrare anche gli eventuali difetti e il controllo ripetuto dopo la correzione. Per un altro manutentore, le note versionate devono essere comprensibili anche senza quei file locali.

Prima delle prove annotare le preferenze esistenti. Ripristinare zoom, opzioni della tastiera, screen reader e stampa al termine. Usare una finestra dedicata; non attivare l'invio email del contatto durante il test.

## Matrice minima

| Percorso | Ambiente previsto | Scopo |
| --- | --- | --- |
| Tastiera e zoom reale | Safari installato su macOS | Focus, link e reflow attraverso l'interfaccia reale |
| Lettura assistita | Safari + VoiceOver con voci italiana e inglese | Struttura, lettura continua e cambi di lingua |
| Stampa | Anteprima Safari, A4 e Letter, sfondi disattivati | Paginazione e leggibilità senza sfondi |
| Controllo complementare | Chromium/WebKit di Playwright, font locali e fallback | Geometria, CSP, frammenti, spaziatura e stampa CSS |

Firefox/NVDA su Windows e dispositivi iOS possono estendere la matrice quando disponibili; non dichiararli verificati sulla base di WebKit headless. Per una prova con un altro browser reale registrare la sostituzione e le sue impostazioni. Un PDF generato con Chromium e ispezionato visivamente è una prova della sua stampa, non dell'anteprima Safari.

## K — Tastiera senza screen reader

1. **K-01, ingresso:** con VoiceOver disattivato, caricare la pagina e usare solo Tab. Il primo controllo della pagina è “Vai al contenuto”, visibile quando focalizzato. Invio raggiunge il contenuto; Tab continua nel documento. Verificare il focus visibile anche in tema scuro.
2. **K-02, percorso completo:** ripartire dall'alto e visitare tutti i controlli con Tab, poi tornare con Maiusc+Tab. L'ordine previsto è salto al contenuto, marchio, menu superiore disponibile alla larghezza corrente, “Esplora il percorso”, freccia al profilo, sette voci dell'indice, email e ritorno all'inizio. La scomparsa di voci del menu superiore su mobile è prevista solo se l'indice conserva gli accessi alle sezioni. Nessun blocco del focus o `tabindex` positivo.
3. **K-03, attivazione:** raggiungere ogni voce dell'indice attraverso Tab e usare Invio. Controllare hash, inizio della sezione sotto l'header e indicazione corrente. Ripetere a fondo pagina e dopo resize portrait/landscape. Il salto non deve nascondere il focus del controllo successivo. Non sostituire questo percorso con `locator.focus()` o con click del mouse.
4. **K-04, continuità:** controllare il link email senza inviarlo, ritorno all'inizio, cronologia indietro/avanti e assenza di trappole. Ripetere il percorso essenziale senza JavaScript: contenuto e link devono restare disponibili; lo scrollspy e l'offset misurato possono essere assenti.

Safari può richiedere **Impostazioni → Avanzate → Premi Tab per evidenziare ogni elemento di una pagina web** o la combinazione prevista dalle sue preferenze. Annotare lo stato, usare la modalità che include i link e ripristinarla. L'esclusione dei link dovuta alla preferenza non è un difetto del sito. Riferimento: [scorciatoie Safari](https://support.apple.com/en-gb/guide/safari/cpsh003/mac).

## S — Safari e VoiceOver

1. **S-01, struttura:** avviare VoiceOver e annotare le voci disponibili. Usare il rotore per titoli, punti di riferimento e link. Attendere un solo h1 (“Mirko Petrucci”), sette titoli di sezione h2 e i relativi h3; navigazioni con nomi distinti, contenuto principale e contatti raggiungibili. I numeri delle sezioni possono essere annunciati come testo: non devono creare falsi controlli.
2. **S-02, lingua:** con voce italiana di base e cambio lingua automatico attivo, leggere continuamente dalla hero al profilo, poi Competenze e Interventi. Campioni: “Product Manager / Banking & Financial Services”, “Product strategy · Portfolio management · People leadership”, “Sono Product Manager in Finomnia”, “Business analysis & dati”, “Digital Customer Services / per il mondo Leasing”. Le parti inglesi hanno `lang="en"`; le frasi italiane e le congiunzioni fuori da quelle parti restano italiane.
3. **S-03, navigazione e stato:** attivare i link di sezione con i comandi VoiceOver e verificare destinazione, testo e stato di posizione corrente. Raggiungere i contatti dal rotore e confermare che l'email sia un link riconoscibile. Verificare ritorno all'inizio senza perdere la possibilità di continuare la lettura.
4. **S-04, interpretazione:** confrontare l'output con il markup. Il nome accessibile di un link o titolo può essere esposto come una stringa piatta senza cambi di lingua interni; registrare tale limite del browser/screen reader. Nomi propri, prodotti, acronimi e prestiti tecnici isolati non richiedono tutti una nuova lingua. Non correggere la pronuncia aggiungendo testo nascosto o riscrivendo i nomi accessibili senza una necessità dimostrata.

Registrare voce, modalità e campione effettivamente letto. Un albero AX o `ariaSnapshot()` non costituisce ascolto di VoiceOver. Se l'audio non è osservabile, la pronuncia resta `non eseguito` anche quando la semantica della lingua è corretta.

## Z — Zoom reale e reflow

1. **Z-01:** usare lo zoom della pagina del browser a 100%, 125%, 150% e 200%; confermare la percentuale nell'interfaccia. Verificare testo, menu, badge, griglie, contatti e navigazione senza perdita di contenuto. Usare una finestra desktop e una finestra stretta; annotare la dimensione effettiva. Ripetere almeno l'accesso a Esperienze e Contatti da tastiera al 200%.
2. **Z-02:** con un'area di pagina larga circa 1280px a 100%, portare lo zoom al 400%, equivalente a circa 320 CSS px, e controllare lo scorrimento prevalentemente verticale e l'accesso a tutte le sezioni. Annotare il viewport effettivo: non dedurlo dalle sole dimensioni esterne della finestra.
3. **Z-03:** verificare anche la spaziatura con interlinea 1,5, spazio dopo i paragrafi 2em, lettere 0,12em e parole 0,16em. Il harness fornisce questo controllo complementare; se applicata manualmente, usare una stylesheet consentita dalla CSP o un meccanismo del browser e documentarlo.

Il cambio di `font-size`, lo zoom CSS, `deviceScaleFactor` e il pinch zoom non equivalgono alla prova dello zoom pagina attraverso i comandi del browser. Riferimenti: [ridimensionamento del testo](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

## P — Stampa e paginazione

1. **P-01:** azzerare lo zoom, aprire l'anteprima di stampa con carta A4, scala 100%, margini 12mm, sfondi e intestazioni/piè di pagina del browser disattivati. Se il browser non consente il valore esatto dei margini, annotare quello disponibile. Esaminare tutte le pagine, senza affidarsi solo alla prima.
2. **P-02:** ripetere su Letter e in tema scuro. Verificare che titoli, esperienze, badge, lingue, intervento ed email siano leggibili; nessun contenuto tagliato, sovrapposto o pagina vuota ingiustificata. Una voce più alta di una pagina può spezzarsi: le righe devono restare tutte presenti. Annotare titoli isolati a fondo pagina o grandi spazi evitabili.
3. **P-03:** salvare il PDF e controllare visivamente tutte le pagine a dimensione leggibile. Verificare anche il testo estratto e la presenza del contatto; la presenza del testo non dimostra da sola che sia visibile. Annotare numero di pagine, formato, hash e impostazioni. Se i font mancano, ripetere un campione con fallback.
4. **P-04:** chiudere l'anteprima e confermare il ritorno alla pagina con tema e navigazione corretti. Ripristinare le preferenze iniziali.

## Regole per il risultato

Una checklist preparata non è una checklist eseguita. HAR-03 rimane parziale se mancano le prove reali di tastiera, lettura assistita o zoom; elencare il motivo e il responsabile del prossimo controllo. I18N-01 può essere corretto nel markup con la verifica vocale ancora pendente: riportare entrambe le condizioni. Eventuali nuovi difetti diventano finding con criticità e riproduzione, non un generico punteggio di accessibilità.

Ripetere K/S dopo modifiche a link, struttura, lingua o runtime; Z/P dopo modifiche a CSS, font o contenuto; ripetere i percorsi interessati anche quando si cambia un'impostazione rilevante del browser. Questo protocollo è una verifica mirata, non una certificazione WCAG dell'intero sito.
