# Doppio18 💙

Web app mobile-first per il gioco di carte per due giocatori **Doppio18**.
Un'esperienza interattiva elegante, fluida e accessibile, progettata con palette dark teal/petrolio, animazioni 3D delle carte a 60fps e piena compatibilità con GitHub Pages.

---

## 🃏 Regole del Gioco

1. **Il Mazzo**: 36 carte totali suddivise in 3 categorie:
   - ⚔️ **21 Sfide**
   - ⚡ **7 Obblighi**
   - ✨ **8 Carte Speciali**
2. **Distribuzione**: Le carte vengono mescolate casualmente e divise in due mazzi da 18 carte ciascuno (**Mazzo 1** e **Mazzo 2**).
3. **Turno di Gioco**:
   - I due giocatori si alternano per 18 turni totali (9 turni ciascuno).
   - All'inizio del turno, il giocatore preme **"Scopri Carte"** per rivelare la carta in cima a ciascun mazzo.
   - Il giocatore di turno sceglie una delle due carte e scarta l'altra.
   - Entrambe le carte vengono rimosse dai rispettivi mazzi e archiviate nella cronologia del giocatore.
4. **Punteggio**:
   - Assegnazione manuale dei punti per le sfide vinte o perse tramite i pulsanti `+` e `−` dedicati a ciascun giocatore.
5. **Fine Partita**:
   - La partita termina quando i mazzi si esauriscono (dopo 18 turni).
   - Viene annunciato il vincitore o il pareggio con statistiche complete e opzione di rivincita immediata.

---

## ✨ Funzionalità e Miglioramenti

- **🔄 Annullamento Ultima Mossa (Undo)**: Pulsante per annullare l'ultima scelta, con ripristino istantaneo di mazzi, carte, turno, giocatore attivo e punteggi.
- **📱 Mobile-First Ergonomico**: Eliminati pulsanti laterali sovrapposti; controlli touch-friendly (≥44px), supporto safe-area iOS/Android e layout responsive fluido.
- **💾 Salvataggio Automatico e Resiliente (v2)**: Persistenza istantanea in `localStorage` con schema validato, ripristino sicuro dopo refresh o chiusura del browser e conservazione dei nomi personalizzati tra partite diverse.
- **🏆 Tabellone & Statistiche**:
  - Pulsanti `+` e `−` con protezione dai punteggi negativi e animazioni numeriche reattive.
  - Ridenominazione rapida dei giocatori con icona matita.
  - Indicatore luminoso dinamico del giocatore attivo ("Tocca a te").
- **📜 Cronologia e Archivio Partite**:
  - Vista separata per Giocatore 1, Giocatore 2, Timeline globale di tutti i turni e Archivio delle partite concluse.
  - Badge e contatori distinti per Sfide (turchese), Obblighi (rosso) e Carte Speciali (viola).
- **🎲 Dadi & Modalità Random**:
  - *Random Totale*: estrazione casuale da tutte le 36 carte.
  - *Sfida Casuale*: estrazione casuale tra le 21 carte Sfida.
  - *Random Passato*: estrazione tra le carte già giocate (con avviso amichevole se nessuna carta è ancora uscita).
- **♿ Accessibilità e Semantica**:
  - Elementi semantici HTML5 (`main`, `header`, `section`, `nav`).
  - Navigazione da tastiera completa (`Spazio`/`Invio` per scoprire, `1`/`2` o frecce per scegliere le carte, `Ctrl+Z` per annullare, `Esc` per chiudere i modali).
  - Rispetto di `prefers-reduced-motion` per ridurre le animazioni.
  - Sanitizzazione rigorosa degli input testuali per prevenire vulnerabilità XSS.

---

## 🛠️ Architettura del Codice

```
Doppio18/
├── index.html            # Markup semantico e accessibile
├── style.css             # Design system mobile-first, animazioni 3D e dark teal theme
├── game-core.js          # Motore di gioco puro (logica, shuffle, turni, undo, serializzazione)
├── app.js                # Controller UI, eventi, modali, haptic feedback e audio-visuals
├── doppio18_logo.png     # Logo originale del gioco
├── README.md             # Documentazione completa
└── tests/
    └── game.test.js      # Suite di 14 test unitari automatizzati su Node.js
```

---

## 🧪 Esecuzione dei Test

Per eseguire la suite di 14 test unitari (senza dipendenze esterne, basata sul test runner nativo di Node.js):

```bash
node --test tests/game.test.js
```

Tutti i test coprono:
1. Inizializzazione nuova partita
2. Distribuzione corretta delle 36 carte (21 sfide, 7 obblighi, 8 speciali)
3. Alternanza turni e giocatori
4. Blocco selezioni prima di scoprire le carte
5. Blocco doppie scelte nello stesso turno
6. Rimozione e classificazione carte
7. Funzionamento dell'Annulla (Undo)
8. Persistenza e validazione schema salvataggio
9. Punteggio (+, -, limite >= 0)
10. Conclusione con vincitore
11. Conclusione con pareggio
12. Funzioni random (Totale, Sfida, Passato)
13. Cronologia e statistiche
14. Conservazione nomi giocatori

---

## 🚀 Pubblicazione su GitHub Pages

Il progetto è al 100% statico e non richiede alcun processo di build:
1. Vai su **Settings** > **Pages** nel repository GitHub.
2. Sotto **Branch**, seleziona `main` e la cartella `/ (root)`.
3. Clicca su **Save**. La web app sarà subito attiva e giocabile online.
