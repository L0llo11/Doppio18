const test = require('node:test');
const assert = require('node:assert/strict');
const { Doppio18Game, TUTTE_LE_CARTE } = require('../game-core.js');

test('1. Avvio di una nuova partita inizializza correttamente tutti i campi', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  assert.equal(game.state.turno, 1);
  assert.equal(game.state.giocatore, 1);
  assert.equal(game.state.carteScoperte, false);
  assert.equal(game.state.cartaSinistra, null);
  assert.equal(game.state.cartaDestra, null);
  assert.equal(game.state.isFinished, false);
  assert.equal(game.state.score[1], 0);
  assert.equal(game.state.score[2], 0);
  assert.equal(game.state.mazzo1.length, 18);
  assert.equal(game.state.mazzo2.length, 18);
  assert.equal(game.state.undoStack.length, 0);
});

test('2. Corretta distribuzione delle 36 carte (18 per mazzo, nessuna carta persa)', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  assert.equal(TUTTE_LE_CARTE.length, 36);
  assert.equal(game.state.mazzo1.length, 18);
  assert.equal(game.state.mazzo2.length, 18);

  const tuttiIds = [...game.state.mazzo1, ...game.state.mazzo2].map(c => c.id);
  const uniqueIds = new Set(tuttiIds);
  assert.equal(uniqueIds.size, 36, 'Tutte le 36 carte devono essere univoche');

  // Verifica composizione categorie
  const totalSfide = [...game.state.mazzo1, ...game.state.mazzo2].filter(c => c.tipo === 'sfida').length;
  const totalObblighi = [...game.state.mazzo1, ...game.state.mazzo2].filter(c => c.tipo === 'obbligo').length;
  const totalSpeciali = [...game.state.mazzo1, ...game.state.mazzo2].filter(c => c.tipo === 'speciale').length;
  assert.equal(totalSfide, 21);
  assert.equal(totalObblighi, 7);
  assert.equal(totalSpeciali, 8);
});

test('3. Alternanza dei giocatori turno per turno', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  assert.equal(game.state.giocatore, 1);
  game.scopriCarte();
  game.scegliCarta('sinistra');
  assert.equal(game.state.giocatore, 2);
  assert.equal(game.state.turno, 2);

  game.scopriCarte();
  game.scegliCarta('destra');
  assert.equal(game.state.giocatore, 1);
  assert.equal(game.state.turno, 3);
});

test('4. Impossibilità di selezionare carte prima di scoprirle', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  assert.equal(game.state.carteScoperte, false);
  const successSinistra = game.scegliCarta('sinistra');
  assert.equal(successSinistra, false, 'Non deve permettere la scelta prima di scoprire');
  assert.equal(game.state.turno, 1);
  assert.equal(game.state.mazzo1.length, 18);

  const successDestra = game.scegliCarta('destra');
  assert.equal(successDestra, false);
  assert.equal(game.state.mazzo2.length, 18);
});

test('5. Impossibilità di effettuare due scelte nello stesso turno', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  game.scopriCarte();
  const primaScelta = game.scegliCarta('sinistra');
  assert.equal(primaScelta, true);

  // Subito dopo la scelta, carteScoperte deve essere false e un secondo clic deve fallire
  const secondaScelta = game.scegliCarta('destra');
  assert.equal(secondaScelta, false);
  assert.equal(game.state.turno, 2);
  assert.equal(game.state.mazzo1.length, 17);
});

test('6. Corretta rimozione delle carte e inserimento in scelte/scartate', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  const c1 = game.state.mazzo1[0];
  const c2 = game.state.mazzo2[0];

  game.scopriCarte();
  game.scegliCarta('sinistra');

  assert.equal(game.state.mazzo1.length, 17);
  assert.equal(game.state.mazzo2.length, 17);
  assert.equal(game.state.scelte[1].length, 1);
  assert.equal(game.state.scelte[1][0].id, c1.id);
  assert.equal(game.state.scartate[1].length, 1);
  assert.equal(game.state.scartate[1][0].id, c2.id);
});

test('7. Funzionamento dell\'annullamento (Undo)', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  game.modificaPunteggio(1, 1);
  assert.equal(game.state.score[1], 1);

  const c1 = game.state.mazzo1[0];
  const c2 = game.state.mazzo2[0];

  game.scopriCarte();
  game.scegliCarta('destra');

  assert.equal(game.state.turno, 2);
  assert.equal(game.state.giocatore, 2);
  assert.equal(game.state.mazzo1.length, 17);
  assert.equal(game.state.mazzo2.length, 17);

  // Esegui Annulla
  const undoResult = game.annullaUltimaMossa();
  assert.equal(undoResult, true);

  assert.equal(game.state.turno, 1);
  assert.equal(game.state.giocatore, 1);
  assert.equal(game.state.carteScoperte, false);
  assert.equal(game.state.mazzo1.length, 18);
  assert.equal(game.state.mazzo2.length, 18);
  assert.equal(game.state.mazzo1[0].id, c1.id);
  assert.equal(game.state.mazzo2[0].id, c2.id);
  assert.equal(game.state.scelte[1].length, 0);
  assert.equal(game.state.scartate[1].length, 0);
  assert.equal(game.state.score[1], 1, 'Il punteggio precedente deve essere preservato');
});

test('8. Persistenza dopo refresh e validazione schema', () => {
  const game = new Doppio18Game();
  game.initNewGame();
  game.aggiornaNome(1, 'Alice');
  game.aggiornaNome(2, 'Bob');
  game.modificaPunteggio(1, 3);
  game.scopriCarte();
  game.scegliCarta('sinistra');

  const serialized = game.serialize();
  assert.ok(serialized.length > 50);

  const restoredGame = new Doppio18Game();
  const loaded = restoredGame.deserialize(serialized);
  assert.equal(loaded, true);

  assert.equal(restoredGame.state.nomi[1], 'Alice');
  assert.equal(restoredGame.state.nomi[2], 'Bob');
  assert.equal(restoredGame.state.score[1], 3);
  assert.equal(restoredGame.state.turno, 2);
  assert.equal(restoredGame.state.giocatore, 2);
  assert.equal(restoredGame.state.mazzo1.length, 17);

  // Test gestione dati corrotti
  const invalidGame = new Doppio18Game();
  const invalidResult = invalidGame.deserialize('not a json');
  assert.equal(invalidResult, false);

  const corruptedGame = new Doppio18Game();
  const corruptedResult = corruptedGame.deserialize(JSON.stringify({ version: 999 }));
  assert.equal(corruptedResult, false);
});

test('9. Corretto funzionamento del punteggio (+, -, non negativo)', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  game.modificaPunteggio(1, 1);
  game.modificaPunteggio(1, 1);
  assert.equal(game.state.score[1], 2);

  game.modificaPunteggio(1, -1);
  assert.equal(game.state.score[1], 1);

  // Non può scendere sotto lo zero
  game.modificaPunteggio(1, -5);
  assert.equal(game.state.score[1], 0);

  game.modificaPunteggio(2, -1);
  assert.equal(game.state.score[2], 0);
});

test('10. Corretta conclusione della partita con vincitore', () => {
  const game = new Doppio18Game();
  game.initNewGame();
  game.modificaPunteggio(1, 5);
  game.modificaPunteggio(2, 3);

  // Gioca tutti i 18 turni
  for (let t = 1; t <= 18; t++) {
    game.scopriCarte();
    game.scegliCarta('sinistra');
  }

  assert.equal(game.state.mazzo1.length, 0);
  assert.equal(game.state.mazzo2.length, 0);
  assert.equal(game.state.isFinished, true);
  assert.equal(game.state.vincitore, 1);
  assert.equal(game.state.scelte[1].length + game.state.scelte[2].length, 18);
});

test('11. Corretta gestione di una partita in pareggio', () => {
  const game = new Doppio18Game();
  game.initNewGame();
  game.modificaPunteggio(1, 4);
  game.modificaPunteggio(2, 4);

  for (let t = 1; t <= 18; t++) {
    game.scopriCarte();
    game.scegliCarta('destra');
  }

  assert.equal(game.state.isFinished, true);
  assert.equal(game.state.vincitore, 'pareggio');
});

test('12. Funzionamento delle tre modalità random', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  // 1. Random Totale
  const rTot = game.randomTotale();
  assert.ok(rTot);
  assert.ok(rTot.nome);
  assert.ok(['sfida', 'obbligo', 'speciale'].includes(rTot.tipo));

  // 2. Sfida Casuale
  const rSfida = game.sfidaCasuale();
  assert.ok(rSfida);
  assert.equal(rSfida.tipo, 'sfida');

  // 3. Random Passato quando non sono uscite carte
  const rPassVuoto = game.randomPassato();
  assert.equal(rPassVuoto.success, false);
  assert.equal(rPassVuoto.error, 'NESSUNA_CARTA');

  // Gioca un turno
  game.scopriCarte();
  game.scegliCarta('sinistra');

  // Ora Random Passato deve pescare una delle carte uscite
  const rPassPieno = game.randomPassato();
  assert.equal(rPassPieno.success, true);
  assert.ok(rPassPieno.carta);
});

test('13. Funzionamento della cronologia e statistiche dettagliate', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  game.scopriCarte();
  game.scegliCarta('sinistra');
  game.scopriCarte();
  game.scegliCarta('destra');

  const stats = game.calcolaStatistiche();
  assert.equal(stats.giocatore1.totScelte, 1);
  assert.equal(stats.giocatore1.totScartate, 1);
  assert.equal(stats.giocatore2.totScelte, 1);
  assert.equal(stats.giocatore2.totScartate, 1);
  assert.equal(game.state.turnHistory.length, 2);
  assert.equal(game.state.turnHistory[0].giocatore, 1);
  assert.equal(game.state.turnHistory[1].giocatore, 2);
});

test('14. Conservazione nomi giocatori tra partite e nuova partita rapida', () => {
  const game = new Doppio18Game();
  game.initNewGame();
  game.aggiornaNome(1, 'Marco');
  game.aggiornaNome(2, 'Sara');

  // Gioca due turni
  game.scopriCarte();
  game.scegliCarta('sinistra');
  game.scopriCarte();
  game.scegliCarta('destra');

  // Nuova partita preservando i nomi
  game.initNewGame({ preserveNames: true });

  assert.equal(game.state.nomi[1], 'Marco');
  assert.equal(game.state.nomi[2], 'Sara');
  assert.equal(game.state.turno, 1);
  assert.equal(game.state.mazzo1.length, 18);
  assert.equal(game.state.mazzo2.length, 18);
  assert.equal(game.state.score[1], 0);
  assert.equal(game.state.score[2], 0);
});

test('15. Regola dello switch del bere (inversione e ripristino con undo)', () => {
  const game = new Doppio18Game();
  game.initNewGame();

  // Stato iniziale: Chi perde beve (switchAttivo === false)
  assert.equal(game.state.switchAttivo, false);

  // Inserisci forzatamente una carta switch in cima al mazzo per testare la scelta
  game.state.mazzo1[0] = { id: 'c_switch_1', nome: 'Switch Obbligato', tipo: 'obbligo' };
  game.state.mazzo2[0] = { id: 'c_dummy', nome: 'Tris', tipo: 'sfida' };

  game.scopriCarte();
  game.scegliCarta('sinistra'); // Sceglie 'Switch Obbligato'

  // Lo switch deve essersi attivato: ora Beve chi vince
  assert.equal(game.state.switchAttivo, true);

  // Esegui undo: lo switch deve tornare allo stato precedente (false)
  game.annullaUltimaMossa();
  assert.equal(game.state.switchAttivo, false);

  // Test toggle manuale
  game.toggleSwitch();
  assert.equal(game.state.switchAttivo, true);
  game.toggleSwitch();
  assert.equal(game.state.switchAttivo, false);
});

test('16. Calcolo dinamico di "Il Migliore beve" (normale, con switch e in parità)', () => {
  const game = new Doppio18Game();
  game.initNewGame();
  game.aggiornaNome(1, 'Alice');
  game.aggiornaNome(2, 'Bob');

  // Caso 1: Parità (0 a 0) -> non beve nessuno
  const rParita = game.calcolaChiBeveIlMigliore();
  assert.equal(rParita.parita, true);
  assert.equal(rParita.giocatore, null);

  // Caso 2: Alice in vantaggio (3 a 1), Switch non attivo (normale: beve chi vince)
  game.modificaPunteggio(1, 3);
  game.modificaPunteggio(2, 1);
  const rNormale = game.calcolaChiBeveIlMigliore();
  assert.equal(rNormale.parita, false);
  assert.equal(rNormale.giocatore, 1); // Beve Alice (il migliore)
  assert.equal(rNormale.nome, 'Alice');

  // Caso 3: Alice in vantaggio (3 a 1), Switch ATTIVO (si inverte: beve il peggiore)
  game.toggleSwitch(); // switchAttivo = true
  const rConSwitch = game.calcolaChiBeveIlMigliore();
  assert.equal(rConSwitch.parita, false);
  assert.equal(rConSwitch.giocatore, 2); // Beve Bob (il peggiore)
  assert.equal(rConSwitch.nome, 'Bob');
});

test('17. Lancio della moneta (Testa o Croce)', () => {
  const game = new Doppio18Game();
  const res1 = game.lanciaMoneta(() => 0.1);
  assert.equal(res1, 'Testa');

  const res2 = game.lanciaMoneta(() => 0.9);
  assert.equal(res2, 'Croce');
});
