# Changelog

## 2026-10-04

- Navigazione più robusta: offset dell'header misurato, indice adattivo e gestione dei limiti delle API browser.
- Layout corretto con testo al 200% e spaziatura personalizzata; migliorata la leggibilità dei contatti in stampa.
- Font distribuiti localmente con licenze, senza richieste automatiche a Google Fonts.
- Aggiunte CSP e policy `no-referrer`; limiti degli header su GitHub Pages documentati nel README.
- Introdotti 194 test browser, sette controlli di regressione, packaging degli asset e workflow CI/Pages.
- Corretta l'emulazione del movimento ridotto nel harness; quattro controlli aggiuntivi verificano la preferenza e il CSS effettivi.
- Pages collegato ad Actions e `Quality checks` obbligatorio su `main`, anche per gli amministratori, tramite pull request dei collaboratori.
- Documentati rilascio, rollback, verifica degli asset pubblicati e perimetro di supporto dei browser.
