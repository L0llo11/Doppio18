/**
 * DOPPIO18 - Game Core Logic Engine
 * Gestisce regole, mazzi, turni, punteggi, annullamenti e statistiche.
 * Compatibile sia con ambienti Browser che Node.js.
 */

const TUTTE_LE_CARTE = [
  // 21 Sfide
  { nome: "Cala e Scopri", tipo: "sfida" },
  { nome: "Trentuno", tipo: "sfida" },
  { nome: "Bella a scopa", tipo: "sfida" },
  { nome: "Rigori", tipo: "sfida" },
  { nome: "Mazzo", tipo: "sfida" },
  { nome: "Tivit", tipo: "sfida" },
  { nome: "Corsa dei Cavalli", tipo: "sfida" },
  { nome: "Testa Croce", tipo: "sfida" },
  { nome: "Bandiere", tipo: "sfida" },
  { nome: "Canzone", tipo: "sfida" },
  { nome: "Tris", tipo: "sfida" },
  { nome: "Forza 4", tipo: "sfida" },
  { nome: "Random Passato", tipo: "sfida" },
  { nome: "Impiccato", tipo: "sfida" },
  { nome: "Formichina", tipo: "sfida" },
  { nome: "Ruba Indumento", tipo: "sfida" },
  { nome: "Bacio Rubato", tipo: "sfida" },
  { nome: "Lunghezza d'onda", tipo: "sfida" },
  { nome: "Sfida Casuale", tipo: "sfida" },
  { nome: "Random Totale", tipo: "sfida" },
  { nome: "Obbligo o Verità", tipo: "sfida" },

  // 7 Obblighi
  { nome: "Obbligo o Verità", tipo: "obbligo" },
  { nome: "1 shottino", tipo: "obbligo" },
  { nome: "2 shottini", tipo: "obbligo" },
  { nome: "Switch Obbligato", tipo: "obbligo" },
  { nome: "Ripeti Sfida di Prima", tipo: "obbligo" },
  { nome: "Sceglie l'avversario", tipo: "obbligo" },
  { nome: "Il Migliore beve", tipo: "obbligo" },

  // 8 Speciali
  { nome: "Obbligo o Verità", tipo: "speciale" },
  { nome: "Switch Speciale", tipo: "speciale" },
  { nome: "Scommessa", tipo: "speciale" },
  { nome: "Comando", tipo: "speciale" },
  { nome: "Sfida Precedente", tipo: "speciale" },
  { nome: "Cambio", tipo: "speciale" },
  { nome: "Blocco", tipo: "speciale" },
  { nome: "Scelta Finale", tipo: "speciale" }
];

/**
 * Crea un mazzo completo di 36 carte dotate di ID univoco
 */
function creaMazzoCompleto() {
  return TUTTE_LE_CARTE.map((c, index) => ({
    id: `c_${index + 1}_${c.tipo}_${c.nome.replace(/\s+/g, '_').toLowerCase()}`,
    nome: c.nome,
    tipo: c.tipo
  }));
}

/**
 * Fisher-Yates Shuffle
 */
function mischia(array, rng = Math.random) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Classe principale Doppio18Game
 */
class Doppio18Game {
  constructor() {
    this.state = this.getDefaultState();
  }

  getDefaultState() {
    return {
      version: 2,
      turno: 1,
      giocatore: 1,
      mazzo1: [],
      mazzo2: [],
      cartaSinistra: null,
      cartaDestra: null,
      carteScoperte: false,
      nomi: { 1: "Giocatore 1", 2: "Giocatore 2" },
      scelte: { 1: [], 2: [] },
      scartate: { 1: [], 2: [] },
      score: { 1: 0, 2: 0 },
      turnHistory: [],
      undoStack: [],
      switchAttivo: false,
      isFinished: false,
      vincitore: null
    };
  }

  /**
   * Avvia una nuova partita
   */
  initNewGame(options = {}) {
    const { preserveNames = true, customNames = null, rng = Math.random } = options;
    const previousNames = preserveNames ? { ...this.state.nomi } : { 1: "Giocatore 1", 2: "Giocatore 2" };

    const deck = mischia(creaMazzoCompleto(), rng);
    
    this.state = {
      version: 2,
      turno: 1,
      giocatore: 1,
      mazzo1: deck.slice(0, 18),
      mazzo2: deck.slice(18, 36),
      cartaSinistra: null,
      cartaDestra: null,
      carteScoperte: false,
      nomi: customNames ? { ...customNames } : previousNames,
      scelte: { 1: [], 2: [] },
      scartate: { 1: [], 2: [] },
      score: { 1: 0, 2: 0 },
      turnHistory: [],
      undoStack: [],
      switchAttivo: false,
      isFinished: false,
      vincitore: null
    };

    return this.state;
  }

  /**
   * Scopre le due carte in cima ai mazzi
   */
  scopriCarte() {
    if (this.state.isFinished) return false;
    if (this.state.carteScoperte) return false;
    if (!this.state.mazzo1.length || !this.state.mazzo2.length) return false;

    this.state.cartaSinistra = { ...this.state.mazzo1[0] };
    this.state.cartaDestra = { ...this.state.mazzo2[0] };
    this.state.carteScoperte = true;

    return true;
  }

  /**
   * Salva uno snapshot dello stato prima di una scelta per permettere l'annullamento
   */
  _creaSnapshot() {
    return {
      turno: this.state.turno,
      giocatore: this.state.giocatore,
      mazzo1: this.state.mazzo1.map(c => ({ ...c })),
      mazzo2: this.state.mazzo2.map(c => ({ ...c })),
      scelte: {
        1: this.state.scelte[1].map(c => ({ ...c })),
        2: this.state.scelte[2].map(c => ({ ...c }))
      },
      scartate: {
        1: this.state.scartate[1].map(c => ({ ...c })),
        2: this.state.scartate[2].map(c => ({ ...c }))
      },
      score: { ...this.state.score },
      switchAttivo: Boolean(this.state.switchAttivo),
      turnHistory: this.state.turnHistory.map(th => ({ ...th }))
    };
  }

  /**
   * Sceglie una carta ('sinistra' o 'destra') e scarta l'altra
   */
  scegliCarta(lato) {
    if (!this.state.carteScoperte) return false;
    if (this.state.isFinished) return false;
    if (lato !== 'sinistra' && lato !== 'destra') return false;
    if (!this.state.mazzo1.length || !this.state.mazzo2.length) return false;

    // Salva snapshot prima di applicare modifiche
    this.state.undoStack.push(this._creaSnapshot());

    const cartaSinistra = this.state.cartaSinistra;
    const cartaDestra = this.state.cartaDestra;

    let scelta, scarto;
    if (lato === 'sinistra') {
      scelta = cartaSinistra;
      scarto = cartaDestra;
    } else {
      scelta = cartaDestra;
      scarto = cartaSinistra;
    }

    const currentTurn = this.state.turno;
    const currentPlayer = this.state.giocatore;

    // Aggiungi alla cronologia giocatore
    this.state.scelte[currentPlayer].push({ ...scelta, turno: currentTurn });
    this.state.scartate[currentPlayer].push({ ...scarto, turno: currentTurn });

    // Registra nel log cronologico globale
    this.state.turnHistory.push({
      turno: currentTurn,
      giocatore: currentPlayer,
      giocatoreNome: this.state.nomi[currentPlayer],
      latoScelto: lato,
      scelta: { ...scelta },
      scarto: { ...scarto }
    });

    // Se la carta scelta è uno switch, inverte la regola del bere
    if (scelta.nome === "Switch Obbligato" || scelta.nome === "Switch Speciale") {
      this.state.switchAttivo = !this.state.switchAttivo;
    }

    // Rimuovi dal fronte dei mazzi
    this.state.mazzo1.shift();
    this.state.mazzo2.shift();

    // Resetta carte a terra
    this.state.carteScoperte = false;
    this.state.cartaSinistra = null;
    this.state.cartaDestra = null;

    // Verifica fine partita
    if (this.state.mazzo1.length === 0 || this.state.mazzo2.length === 0) {
      this.state.isFinished = true;
      if (this.state.score[1] > this.state.score[2]) {
        this.state.vincitore = 1;
      } else if (this.state.score[2] > this.state.score[1]) {
        this.state.vincitore = 2;
      } else {
        this.state.vincitore = 'pareggio';
      }
    } else {
      // Avanza turno e alterna giocatore
      this.state.giocatore = currentPlayer === 1 ? 2 : 1;
      this.state.turno = currentTurn + 1;
    }

    return true;
  }

  /**
   * Annulla l'ultima mossa effettuata
   */
  annullaUltimaMossa() {
    if (!this.state.undoStack || this.state.undoStack.length === 0) {
      return false;
    }

    const snapshot = this.state.undoStack.pop();

    this.state.turno = snapshot.turno;
    this.state.giocatore = snapshot.giocatore;
    this.state.mazzo1 = snapshot.mazzo1;
    this.state.mazzo2 = snapshot.mazzo2;
    this.state.scelte = snapshot.scelte;
    this.state.scartate = snapshot.scartate;
    this.state.score = snapshot.score;
    this.state.switchAttivo = Boolean(snapshot.switchAttivo);
    this.state.turnHistory = snapshot.turnHistory;

    // Resetta lo stato delle carte attive
    this.state.carteScoperte = false;
    this.state.cartaSinistra = null;
    this.state.cartaDestra = null;
    this.state.isFinished = false;
    this.state.vincitore = null;

    return true;
  }

  /**
   * Modifica punteggio del giocatore (+1 o -1, mai negativo)
   */
  modificaPunteggio(giocatoreId, delta) {
    if (giocatoreId !== 1 && giocatoreId !== 2) return false;
    const current = this.state.score[giocatoreId] || 0;
    const updated = Math.max(0, current + delta);
    this.state.score[giocatoreId] = updated;

    // Se la partita era finita, ricalcola il vincitore
    if (this.state.isFinished) {
      if (this.state.score[1] > this.state.score[2]) {
        this.state.vincitore = 1;
      } else if (this.state.score[2] > this.state.score[1]) {
        this.state.vincitore = 2;
      } else {
        this.state.vincitore = 'pareggio';
      }
    }

    return true;
  }

  /**
   * Aggiorna il nome di un giocatore
   */
  aggiornaNome(giocatoreId, nuovoNome) {
    if (giocatoreId !== 1 && giocatoreId !== 2) return false;
    let nomePulito = String(nuovoNome || '').trim();
    if (nomePulito.length === 0) {
      nomePulito = `Giocatore ${giocatoreId}`;
    }
    if (nomePulito.length > 25) {
      nomePulito = nomePulito.substring(0, 25);
    }
    this.state.nomi[giocatoreId] = nomePulito;
    return true;
  }

  /**
   * Dado: Random Totale (tra tutte le 36 carte)
   */
  randomTotale(rng = Math.random) {
    const idx = Math.floor(rng() * TUTTE_LE_CARTE.length);
    return { ...TUTTE_LE_CARTE[idx] };
  }

  /**
   * Dado: Sfida Casuale (solo tra le 21 carte di tipo sfida)
   */
  sfidaCasuale(rng = Math.random) {
    const sfide = TUTTE_LE_CARTE.filter(c => c.tipo === 'sfida');
    const idx = Math.floor(rng() * sfide.length);
    return { ...sfide[idx] };
  }

  /**
   * Dado: Random Passato (tra tutte le carte già scoperte/uscite)
   */
  randomPassato(rng = Math.random) {
    const passate = [
      ...this.state.scelte[1],
      ...this.state.scelte[2],
      ...this.state.scartate[1],
      ...this.state.scartate[2]
    ];

    if (passate.length === 0) {
      return { success: false, error: 'NESSUNA_CARTA' };
    }

    const idx = Math.floor(rng() * passate.length);
    return { success: true, carta: { ...passate[idx] } };
  }

  /**
   * Inverte manualmente la regola dello switch (Chi perde beve <-> Chi vince beve)
   */
  toggleSwitch() {
    this.state.switchAttivo = !this.state.switchAttivo;
    return this.state.switchAttivo;
  }

  /**
   * Determina chi deve bere per la carta 'Il Migliore beve':
   * - Normale (switch non attivo): beve chi ha più punti (il migliore)
   * - Con Switch attivo: beve chi ha meno punti (il peggiore)
   * - In parità: non beve nessuno
   */
  calcolaChiBeveIlMigliore() {
    const s1 = this.state.score[1] || 0;
    const s2 = this.state.score[2] || 0;
    const switchAttivo = Boolean(this.state.switchAttivo);

    if (s1 === s2) {
      return {
        parita: true,
        giocatore: null,
        nome: null,
        testoBreve: "Parità: non beve nessuno",
        messaggio: `🤝 Parità (${s1} - ${s2}): non beve nessuno!`
      };
    }

    let giocatoreCheBeve;
    let motivo;

    if (!switchAttivo) {
      // Normale: beve chi vince/ha più punti
      giocatoreCheBeve = s1 > s2 ? 1 : 2;
      motivo = "ha più punti (il migliore beve)";
    } else {
      // Switch attivo: beve chi perde/ha meno punti
      giocatoreCheBeve = s1 < s2 ? 1 : 2;
      motivo = "ha meno punti (Switch attivo: il peggiore beve)";
    }

    const nome = this.state.nomi[giocatoreCheBeve];
    const punteggi = `${Math.max(s1, s2)} a ${Math.min(s1, s2)}`;

    return {
      parita: false,
      giocatore: giocatoreCheBeve,
      nome: nome,
      switchAttivo: switchAttivo,
      testoBreve: `Beve ${nome}`,
      messaggio: `🍺 Beve ${nome} (${motivo} • ${punteggi})`
    };
  }

  /**
   * Lancia la moneta: 'Testa' o 'Croce'
   */
  lanciaMoneta(rng = Math.random) {
    return rng() < 0.5 ? 'Testa' : 'Croce';
  }

  /**
   * Calcola statistiche dettagliate della partita in corso
   */
  calcolaStatistiche() {
    const calcPerGiocatore = (gId) => {
      const scelte = this.state.scelte[gId] || [];
      const scartate = this.state.scartate[gId] || [];

      const countByType = (list) => ({
        sfida: list.filter(c => c.tipo === 'sfida').length,
        obbligo: list.filter(c => c.tipo === 'obbligo').length,
        speciale: list.filter(c => c.tipo === 'speciale').length
      });

      return {
        totScelte: scelte.length,
        totScartate: scartate.length,
        sceltePerTipo: countByType(scelte),
        scartatePerTipo: countByType(scartate)
      };
    };

    return {
      giocatore1: calcPerGiocatore(1),
      giocatore2: calcPerGiocatore(2),
      totaleTurniGiocati: this.state.turnHistory.length,
      carteRimanentiMazzo1: this.state.mazzo1.length,
      carteRimanentiMazzo2: this.state.mazzo2.length
    };
  }

  /**
   * Serializzazione per localStorage
   */
  serialize() {
    return JSON.stringify(this.state);
  }

  /**
   * Deserializzazione con validazione rigida e retrocompatibilità
   */
  deserialize(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return false;

    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') return false;

      // Se dati vecchi v1 (senza versione) o v2
      const isV1 = !data.version;
      const isV2 = data.version === 2;

      if (!isV1 && !isV2) return false;

      // Validazione mazzi
      if (!Array.isArray(data.mazzo1) || !Array.isArray(data.mazzo2)) {
        return false;
      }

      // Validazione turni e giocatore
      const turno = typeof data.turno === 'number' && data.turno >= 1 && data.turno <= 19 ? data.turno : 1;
      const giocatore = data.giocatore === 1 || data.giocatore === 2 ? data.giocatore : 1;

      // Validazione punteggi
      const score = {
        1: typeof data.score?.[1] === 'number' && data.score[1] >= 0 ? data.score[1] : 0,
        2: typeof data.score?.[2] === 'number' && data.score[2] >= 0 ? data.score[2] : 0
      };

      // Validazione nomi
      const nomi = {
        1: String(data.nomi?.[1] || 'Giocatore 1').trim().substring(0, 25) || 'Giocatore 1',
        2: String(data.nomi?.[2] || 'Giocatore 2').trim().substring(0, 25) || 'Giocatore 2'
      };

      // Ripristino o fallback scelte/scartate
      const scelte = {
        1: Array.isArray(data.scelte?.[1]) ? data.scelte[1] : [],
        2: Array.isArray(data.scelte?.[2]) ? data.scelte[2] : []
      };

      const scartate = {
        1: Array.isArray(data.scartate?.[1]) ? data.scartate[1] : [],
        2: Array.isArray(data.scartate?.[2]) ? data.scartate[2] : []
      };

      const turnHistory = Array.isArray(data.turnHistory) ? data.turnHistory : [];
      const undoStack = Array.isArray(data.undoStack) ? data.undoStack : [];

      const isFinished = Boolean(data.isFinished || (data.mazzo1.length === 0 && data.mazzo2.length === 0));
      let vincitore = data.vincitore;
      if (isFinished && !vincitore) {
        if (score[1] > score[2]) vincitore = 1;
        else if (score[2] > score[1]) vincitore = 2;
        else vincitore = 'pareggio';
      }

      // Ricostruisci stato validato
      this.state = {
        version: 2,
        turno,
        giocatore,
        mazzo1: data.mazzo1,
        mazzo2: data.mazzo2,
        cartaSinistra: data.cartaSinistra && typeof data.cartaSinistra.nome === 'string' ? data.cartaSinistra : null,
        cartaDestra: data.cartaDestra && typeof data.cartaDestra.nome === 'string' ? data.cartaDestra : null,
        carteScoperte: Boolean(data.carteScoperte && data.cartaSinistra && data.cartaDestra),
        nomi,
        scelte,
        scartate,
        score,
        switchAttivo: Boolean(data.switchAttivo),
        turnHistory,
        undoStack,
        isFinished,
        vincitore
      };

      return true;
    } catch (_) {
      // Dati non validi o JSON malformato
      return false;
    }
  }
}

// Esporta per Node.js (test) e Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TUTTE_LE_CARTE,
    creaMazzoCompleto,
    mischia,
    Doppio18Game
  };
} else if (typeof window !== 'undefined') {
  window.TUTTE_LE_CARTE = TUTTE_LE_CARTE;
  window.creaMazzoCompleto = creaMazzoCompleto;
  window.mischia = mischia;
  window.Doppio18Game = Doppio18Game;
}
