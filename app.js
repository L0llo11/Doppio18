/**
 * DOPPIO18 - Web App Controller & UI Manager
 * Gestione interazioni, animazioni, modali, accessibilità e persistenza.
 */

(() => {
  'use strict';

  // Costanti Storage
  const STORAGE_KEY_STATE = 'doppio18_game_state_v2';
  const STORAGE_KEY_NAMES = 'doppio18_player_names';
  const STORAGE_KEY_HISTORY = 'doppio18_match_history';

  // Istanza Game Core
  const game = new Doppio18Game();

  // Elementi DOM Principali
  const dom = {
    // Header & Info
    turnCounter: document.getElementById('turnCounter'),
    activePlayerBanner: document.getElementById('activePlayerBanner'),
    liveAnnouncer: document.getElementById('liveAnnouncer'),
    
    // Mazzi
    mazzo1Count: document.getElementById('mazzo1Count'),
    mazzo2Count: document.getElementById('mazzo2Count'),
    mazzo1Stack: document.getElementById('mazzo1Stack'),
    mazzo2Stack: document.getElementById('mazzo2Stack'),

    // Carte in gioco
    cartaContainer1: document.getElementById('cartaContainer1'),
    cartaContainer2: document.getElementById('cartaContainer2'),
    cartaRetro1: document.getElementById('cartaRetro1'),
    cartaRetro2: document.getElementById('cartaRetro2'),
    gameInstruction: document.getElementById('gameInstruction'),
    scopriBtn: document.getElementById('scopriBtn'),

    // Tabellone Giocatori
    playerCard1: document.getElementById('playerCard1'),
    playerCard2: document.getElementById('playerCard2'),
    nome1Text: document.getElementById('nome1Text'),
    nome2Text: document.getElementById('nome2Text'),
    score1Val: document.getElementById('score1Val'),
    score2Val: document.getElementById('score2Val'),
    p1ChoicesCount: document.getElementById('p1ChoicesCount'),
    p2ChoicesCount: document.getElementById('p2ChoicesCount'),

    // Action Dock
    btnUndo: document.getElementById('btnUndo'),
    btnDice: document.getElementById('btnDice'),
    btnHistory: document.getElementById('btnHistory'),
    btnNewGame: document.getElementById('btnNewGame'),

    // Modali
    modalOverlay: document.getElementById('modalOverlay'),
    modalRename: document.getElementById('modalRename'),
    modalConfirmReset: document.getElementById('modalConfirmReset'),
    modalDice: document.getElementById('modalDice'),
    modalHistory: document.getElementById('modalHistory'),
    modalEndGame: document.getElementById('modalEndGame'),

    // Campi modali
    renameInput: document.getElementById('renameInput'),
    renamePlayerTitle: document.getElementById('renamePlayerTitle'),
    diceResultArea: document.getElementById('diceResultArea'),
    historyTabContent: document.getElementById('historyTabContent'),
    endGameWinner: document.getElementById('endGameWinner'),
    endGameScores: document.getElementById('endGameScores'),
    endGameStatsBody: document.getElementById('endGameStatsBody'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // Stato UI Ausiliario
  let playerBeingRenamed = null;
  let activeModal = null;
  let activeHistoryTab = 'g1';

  // ==========================================================================
  // Inizializzazione & Persistenza
  // ==========================================================================

  function initApp() {
    setupEventListeners();
    setupKeyboardNavigation();
    
    // Prova a caricare lo stato salvato
    const success = caricaStatoLocale();
    if (!success) {
      // Carica eventuali nomi memorizzati in precedenza
      const memorizedNames = getMemorizedNames();
      game.initNewGame({ preserveNames: true, customNames: memorizedNames });
      salvaStatoLocale();
    }

    renderCompleto();
  }

  function getMemorizedNames() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NAMES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed[1] && parsed[2]) return parsed;
      }
    } catch (_) {}
    return { 1: "Giocatore 1", 2: "Giocatore 2" };
  }

  function memorizzaNomi(nomi) {
    try {
      localStorage.setItem(STORAGE_KEY_NAMES, JSON.stringify(nomi));
    } catch (_) {}
  }

  function salvaStatoLocale() {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, game.serialize());
      memorizzaNomi(game.state.nomi);
    } catch (e) {
      console.warn('Errore salvataggio localStorage:', e);
    }
  }

  function caricaStatoLocale() {
    try {
      // Controlla prima la chiave v2
      const rawV2 = localStorage.getItem(STORAGE_KEY_STATE);
      if (rawV2) {
        return game.deserialize(rawV2);
      }
      
      // Fallback retrocompatibilità con vecchia chiave 'doppio18State'
      const legacyRaw = localStorage.getItem('doppio18State');
      if (legacyRaw) {
        const ok = game.deserialize(legacyRaw);
        if (ok) {
          salvaStatoLocale();
          return true;
        }
      }
    } catch (e) {
      console.warn('Errore lettura localStorage:', e);
    }
    return false;
  }

  // ==========================================================================
  // Render dell'Interfaccia
  // ==========================================================================

  function renderCompleto() {
    renderHeader();
    renderMazzi();
    renderCarteInGioco();
    renderScoreboard();
    renderActionButtons();
    
    // Se la partita è finita e il modal non è ancora aperto, aprilo
    if (game.state.isFinished && activeModal !== dom.modalEndGame) {
      openEndGameModal();
    }
  }

  function renderHeader() {
    const s = game.state;
    const nomeAttivo = s.nomi[s.giocatore];

    dom.turnCounter.innerText = `Turno ${s.turno} di 18`;
    dom.activePlayerBanner.innerHTML = `<span>🎮</span> Tocca a <strong>${escapeHtml(nomeAttivo)}</strong>`;

    annunciaScreenReader(`Turno ${s.turno}. Tocca a ${nomeAttivo}. Carte ${s.carteScoperte ? 'scoperte' : 'coperte'}.`);
  }

  function renderMazzi() {
    const s = game.state;
    const count1 = s.mazzo1.length;
    const count2 = s.mazzo2.length;

    dom.mazzo1Count.innerText = count1;
    dom.mazzo2Count.innerText = count2;

    dom.mazzo1Stack.classList.toggle('empty', count1 === 0);
    dom.mazzo2Stack.classList.toggle('empty', count2 === 0);
  }

  function renderCarteInGioco() {
    const s = game.state;

    if (s.carteScoperte && s.cartaSinistra && s.cartaDestra) {
      // Popola Faccia Sinistra
      popolaFacciaCarta(dom.cartaRetro1, s.cartaSinistra, 'Sinistra');
      dom.cartaContainer1.classList.add('is-flipped');
      dom.cartaContainer1.setAttribute('aria-label', `Carta Sinistra: ${s.cartaSinistra.nome}, tipo ${s.cartaSinistra.tipo}`);

      // Popola Faccia Destra
      popolaFacciaCarta(dom.cartaRetro2, s.cartaDestra, 'Destra');
      dom.cartaContainer2.classList.add('is-flipped');
      dom.cartaContainer2.setAttribute('aria-label', `Carta Destra: ${s.cartaDestra.nome}, tipo ${s.cartaDestra.tipo}`);

      dom.scopriBtn.disabled = true;
      dom.gameInstruction.innerHTML = `<span>👆</span> Tocca la carta da scegliere (l'altra verrà scartata)`;
    } else {
      dom.cartaContainer1.classList.remove('is-flipped');
      dom.cartaContainer2.classList.remove('is-flipped');
      dom.cartaContainer1.setAttribute('aria-label', 'Carta 1 coperta');
      dom.cartaContainer2.setAttribute('aria-label', 'Carta 2 coperta');

      dom.scopriBtn.disabled = s.isFinished || s.mazzo1.length === 0;
      
      if (s.isFinished) {
        dom.gameInstruction.innerText = "🏁 Partita conclusa!";
      } else {
        dom.gameInstruction.innerText = "Premi 'Scopri Carte' per iniziare il turno";
      }
    }
  }

  function popolaFacciaCarta(el, carta, latoLabel) {
    el.className = `carta-faccia carta-retro ${carta.tipo}`;

    const icona = ottieniIconaTipo(carta.tipo);

    el.innerHTML = `
      <div class="card-category-badge">
        <span>${icona}</span> ${carta.tipo}
      </div>
      <div class="card-title-text">${escapeHtml(carta.nome)}</div>
      <div class="card-footer-tip">${latoLabel} • Doppio18</div>
    `;
  }

  function ottieniIconaTipo(tipo) {
    switch (tipo) {
      case 'sfida': return '⚔️';
      case 'obbligo': return '⚡';
      case 'speciale': return '✨';
      default: return '🃏';
    }
  }

  function renderScoreboard() {
    const s = game.state;

    dom.nome1Text.innerText = s.nomi[1];
    dom.nome2Text.innerText = s.nomi[2];
    dom.score1Val.innerText = s.score[1];
    dom.score2Val.innerText = s.score[2];

    dom.p1ChoicesCount.innerText = `${s.scelte[1].length} carte`;
    dom.p2ChoicesCount.innerText = `${s.scelte[2].length} carte`;

    dom.playerCard1.classList.toggle('is-active', s.giocatore === 1 && !s.isFinished);
    dom.playerCard2.classList.toggle('is-active', s.giocatore === 2 && !s.isFinished);
  }

  function renderActionButtons() {
    const hasUndo = game.state.undoStack && game.state.undoStack.length > 0;
    dom.btnUndo.disabled = !hasUndo;
  }

  // ==========================================================================
  // Azioni Utente Core
  // ==========================================================================

  function onScopriCarteClick() {
    if (game.state.carteScoperte) return;
    if (game.state.isFinished) {
      mostraToast("La partita è già terminata! Inizia una nuova partita.");
      return;
    }

    const success = game.scopriCarte();
    if (success) {
      vibra(30);
      salvaStatoLocale();
      renderCompleto();
    }
  }

  function onScegliCarta(lato) {
    if (!game.state.carteScoperte) {
      mostraToast("🔍 Clicca prima su 'Scopri Carte'!");
      return;
    }

    const cartaScelta = lato === 'sinistra' ? game.state.cartaSinistra : game.state.cartaDestra;
    const success = game.scegliCarta(lato);

    if (success) {
      vibra([20, 30, 20]);
      salvaStatoLocale();
      renderCompleto();
      mostraToast(`✅ Carta scelta: "${cartaScelta.nome}"`);
    }
  }

  function onAnnullaMossaClick() {
    if (!game.state.undoStack || game.state.undoStack.length === 0) {
      mostraToast("Nessuna mossa da annullare!");
      return;
    }

    const ok = game.annullaUltimaMossa();
    if (ok) {
      vibra(40);
      salvaStatoLocale();
      renderCompleto();
      mostraToast("↩️ Ultima mossa annullata!");
    }
  }

  function onModificaPunteggio(gId, delta) {
    const scoreEl = gId === 1 ? dom.score1Val : dom.score2Val;
    
    game.modificaPunteggio(gId, delta);
    salvaStatoLocale();
    renderScoreboard();

    // Animazione numerica
    scoreEl.classList.remove('bump-up', 'bump-down');
    void scoreEl.offsetWidth; // trigger reflow
    scoreEl.classList.add(delta > 0 ? 'bump-up' : 'bump-down');
    vibra(15);
  }

  // ==========================================================================
  // Modali: Gestione e Contenuti
  // ==========================================================================

  function openModal(modalEl) {
    closeAllModals();
    dom.modalOverlay.classList.add('open');
    modalEl.style.display = 'flex';
    activeModal = modalEl;
    document.body.style.overflow = 'hidden';
  }

  function closeAllModals() {
    dom.modalOverlay.classList.remove('open');
    const modals = [dom.modalRename, dom.modalConfirmReset, dom.modalDice, dom.modalHistory, dom.modalEndGame];
    modals.forEach(m => m.style.display = 'none');
    activeModal = null;
    document.body.style.overflow = '';
  }

  // Modale Rinomina Giocatore
  function openRenameModal(gId) {
    playerBeingRenamed = gId;
    dom.renamePlayerTitle.innerText = `Rinomina ${game.state.nomi[gId]}`;
    dom.renameInput.value = game.state.nomi[gId];
    openModal(dom.modalRename);
    setTimeout(() => dom.renameInput.focus(), 80);
  }

  function saveRename() {
    if (playerBeingRenamed) {
      const nuovoNome = dom.renameInput.value;
      game.aggiornaNome(playerBeingRenamed, nuovoNome);
      salvaStatoLocale();
      renderCompleto();
      mostraToast(`Nome aggiornato in: ${game.state.nomi[playerBeingRenamed]}`);
    }
    closeAllModals();
  }

  // Modale Conferma Nuova Partita
  function openNewGamePrompt() {
    // Se la partita è già conclusa o al primo turno senza scelte, resetta direttamente
    const partitaInCorso = game.state.turno > 1 || game.state.scelte[1].length > 0 || game.state.carteScoperte;
    if (!partitaInCorso || game.state.isFinished) {
      avviaNuovaPartita();
      return;
    }
    openModal(dom.modalConfirmReset);
  }

  function avviaNuovaPartita() {
    closeAllModals();
    game.initNewGame({ preserveNames: true });
    salvaStatoLocale();
    renderCompleto();
    vibra(50);
    mostraToast("🎉 Nuova partita iniziata!");
  }

  // Modale Dadi & Random
  function openDiceModal() {
    dom.diceResultArea.innerHTML = `
      <div style="color: var(--text-muted); font-size: 0.9rem;">
        Seleziona un'opzione qui sopra per pescare una carta casuale.
      </div>
    `;
    openModal(dom.modalDice);
  }

  function eseguiRandom(tipo) {
    let result;
    if (tipo === 'totale') {
      result = { success: true, carta: game.randomTotale() };
    } else if (tipo === 'sfida') {
      result = { success: true, carta: game.sfidaCasuale() };
    } else if (tipo === 'passato') {
      result = game.randomPassato();
    }

    if (!result.success && result.error === 'NESSUNA_CARTA') {
      dom.diceResultArea.innerHTML = `
        <div class="random-empty-alert">
          <span style="font-size: 1.8rem;">⚠️</span>
          <span>Nessuna carta è ancora uscita in questa partita!</span>
          <small style="color: var(--text-muted)">Gioca almeno un turno prima di usare 'Random Passato'.</small>
        </div>
      `;
      vibra([40, 40]);
      return;
    }

    const c = result.carta;
    const icona = ottieniIconaTipo(c.tipo);

    dom.diceResultArea.innerHTML = `
      <div class="random-card-preview ${c.tipo}">
        <div class="card-category-badge">
          <span>${icona}</span> ${c.tipo.toUpperCase()}
        </div>
        <div class="card-title-text" style="font-size: 1.25rem; margin: 10px 0;">
          ${escapeHtml(c.nome)}
        </div>
        <div class="card-footer-tip">Carta Estratta Casualmente</div>
      </div>
    `;
    vibra(35);
  }

  // Modale Cronologia
  function openHistoryModal(tabIniziale = 'g1') {
    activeHistoryTab = tabIniziale;
    renderHistoryTab();
    openModal(dom.modalHistory);
  }

  function setHistoryTab(tabId) {
    activeHistoryTab = tabId;
    document.querySelectorAll('.history-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    renderHistoryTab();
  }

  function renderHistoryTab() {
    const s = game.state;
    const stats = game.calcolaStatistiche();

    let html = '';

    if (activeHistoryTab === 'g1' || activeHistoryTab === 'g2') {
      const gId = activeHistoryTab === 'g1' ? 1 : 2;
      const gStats = stats[`giocatore${gId}`];
      const scelte = s.scelte[gId] || [];
      const scartate = s.scartate[gId] || [];

      html += `
        <div class="history-summary-stats">
          <div class="stat-chip">
            <span class="val">${gStats.totScelte}</span>
            <span class="lbl">Scelte</span>
          </div>
          <div class="stat-chip">
            <span class="val" style="color: var(--sfida-color)">${gStats.sceltePerTipo.sfida}</span>
            <span class="lbl">Sfide</span>
          </div>
          <div class="stat-chip">
            <span class="val" style="color: var(--obbligo-color)">${gStats.sceltePerTipo.obbligo}</span>
            <span class="lbl">Obblighi</span>
          </div>
        </div>

        <h4 style="font-size: 0.95rem; margin-top: 6px; color: var(--cyan-accent);">🃏 Carte Scelte</h4>
      `;

      if (scelte.length === 0) {
        html += `<p class="history-empty-placeholder">Nessuna carta ancora scelta.</p>`;
      } else {
        html += `<ul class="history-list">`;
        scelte.forEach(c => {
          html += `
            <li class="history-item">
              <div class="history-item-left">
                <span class="history-type-dot ${c.tipo}"></span>
                <span>${escapeHtml(c.nome)}</span>
              </div>
              <span class="history-item-badge">Turno ${c.turno || '-'}</span>
            </li>
          `;
        });
        html += `</ul>`;
      }

      html += `<h4 style="font-size: 0.95rem; margin-top: 10px; color: var(--text-muted);">🗑️ Carte Scartate</h4>`;
      if (scartate.length === 0) {
        html += `<p class="history-empty-placeholder">Nessuna carta ancora scartata.</p>`;
      } else {
        html += `<ul class="history-list">`;
        scartate.forEach(c => {
          html += `
            <li class="history-item" style="opacity: 0.75;">
              <div class="history-item-left">
                <span class="history-type-dot ${c.tipo}"></span>
                <span>${escapeHtml(c.nome)}</span>
              </div>
              <span class="history-item-badge">Turno ${c.turno || '-'}</span>
            </li>
          `;
        });
        html += `</ul>`;
      }

    } else if (activeHistoryTab === 'timeline') {
      const history = s.turnHistory || [];
      if (history.length === 0) {
        html = `<p class="history-empty-placeholder">Nessun turno ancora giocato.</p>`;
      } else {
        html += `<ul class="history-list">`;
        history.slice().reverse().forEach(h => {
          html += `
            <li class="history-item" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <div style="display: flex; justify-content: space-between; width: 100%; font-size: 0.78rem; color: var(--cyan-accent);">
                <span>Turno ${h.turno} • ${escapeHtml(h.giocatoreNome)}</span>
                <span style="color: var(--text-muted)">Lato: ${h.latoScelto}</span>
              </div>
              <div style="font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                <span class="history-type-dot ${h.scelta.tipo}"></span>
                <strong>${escapeHtml(h.scelta.nome)}</strong>
                <span style="color: var(--text-muted); font-size: 0.78rem;">(scartato: ${escapeHtml(h.scarto.nome)})</span>
              </div>
            </li>
          `;
        });
        html += `</ul>`;
      }
    } else if (activeHistoryTab === 'archivio') {
      const matchArchive = getMatchHistory();
      if (matchArchive.length === 0) {
        html = `<p class="history-empty-placeholder">Nessuna partita archiviata precedentemente.</p>`;
      } else {
        html += `<ul class="history-list">`;
        matchArchive.slice().reverse().forEach(m => {
          html += `
            <li class="history-item">
              <div>
                <div><strong>${escapeHtml(m.vincitoreMessaggio)}</strong></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${m.data} • Risultato: ${m.score1} a ${m.score2}</div>
              </div>
              <span class="history-item-badge">18 Turni</span>
            </li>
          `;
        });
        html += `</ul>`;
      }
    }

    dom.historyTabContent.innerHTML = html;
  }

  // Modale Fine Partita
  function openEndGameModal() {
    const s = game.state;
    const stats = game.calcolaStatistiche();

    let winText = '';
    if (s.score[1] > s.score[2]) {
      winText = `🏆 Vince ${escapeHtml(s.nomi[1])}!`;
    } else if (s.score[2] > s.score[1]) {
      winText = `🏆 Vince ${escapeHtml(s.nomi[2])}!`;
    } else {
      winText = `🤝 Incredibile Pareggio!`;
    }

    dom.endGameWinner.innerText = winText;
    dom.endGameScores.innerText = `${escapeHtml(s.nomi[1])} ${s.score[1]} — ${s.score[2]} ${escapeHtml(s.nomi[2])}`;

    dom.endGameStatsBody.innerHTML = `
      <tr>
        <td>Punti Totali</td>
        <td><strong>${s.score[1]}</strong></td>
        <td><strong>${s.score[2]}</strong></td>
      </tr>
      <tr>
        <td>Carte Scelte</td>
        <td>${stats.giocatore1.totScelte}</td>
        <td>${stats.giocatore2.totScelte}</td>
      </tr>
      <tr>
        <td>Sfide Vinte / Scelte</td>
        <td>${stats.giocatore1.sceltePerTipo.sfida}</td>
        <td>${stats.giocatore2.sceltePerTipo.sfida}</td>
      </tr>
      <tr>
        <td>Obblighi Affrontati</td>
        <td>${stats.giocatore1.sceltePerTipo.obbligo}</td>
        <td>${stats.giocatore2.sceltePerTipo.obbligo}</td>
      </tr>
      <tr>
        <td>Carte Speciali</td>
        <td>${stats.giocatore1.sceltePerTipo.speciale}</td>
        <td>${stats.giocatore2.sceltePerTipo.speciale}</td>
      </tr>
    `;

    // Archivia partita una sola volta
    archiviaPartitaSeNecessario(s, winText);

    openModal(dom.modalEndGame);
    vibra([100, 50, 100, 50, 150]);
  }

  function archiviaPartitaSeNecessario(s, winText) {
    try {
      const history = getMatchHistory();
      const lastMatch = history[history.length - 1];
      const matchId = `${s.nomi[1]}_${s.nomi[2]}_${s.score[1]}_${s.score[2]}_${s.turnHistory.length}`;

      if (lastMatch && lastMatch.id === matchId) return;

      const dateStr = new Date().toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      history.push({
        id: matchId,
        data: dateStr,
        vincitoreMessaggio: winText,
        player1: s.nomi[1],
        player2: s.nomi[2],
        score1: s.score[1],
        score2: s.score[2]
      });

      // Limita a 20 partite salvate
      if (history.length > 20) history.shift();

      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (_) {}
  }

  function getMatchHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  // ==========================================================================
  // Event Listeners & Controlli da Tastiera
  // ==========================================================================

  function setupEventListeners() {
    // Scopri carte
    dom.scopriBtn.addEventListener('click', onScopriCarteClick);

    // Clic sulle carte
    dom.cartaContainer1.addEventListener('click', () => onScegliCarta('sinistra'));
    dom.cartaContainer2.addEventListener('click', () => onScegliCarta('destra'));

    // Punti
    document.getElementById('p1Plus').addEventListener('click', () => onModificaPunteggio(1, 1));
    document.getElementById('p1Minus').addEventListener('click', () => onModificaPunteggio(1, -1));
    document.getElementById('p2Plus').addEventListener('click', () => onModificaPunteggio(2, 1));
    document.getElementById('p2Minus').addEventListener('click', () => onModificaPunteggio(2, -1));

    // Rinomina
    document.getElementById('p1RenameBtn').addEventListener('click', () => openRenameModal(1));
    document.getElementById('p2RenameBtn').addEventListener('click', () => openRenameModal(2));
    document.getElementById('renameSaveBtn').addEventListener('click', saveRename);
    document.getElementById('renameCancelBtn').addEventListener('click', closeAllModals);
    dom.renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveRename();
      if (e.key === 'Escape') closeAllModals();
    });

    // Cronologia Rapida da card giocatore
    document.getElementById('p1HistBtn').addEventListener('click', () => openHistoryModal('g1'));
    document.getElementById('p2HistBtn').addEventListener('click', () => openHistoryModal('g2'));

    // Action Dock
    dom.btnUndo.addEventListener('click', onAnnullaMossaClick);
    dom.btnDice.addEventListener('click', openDiceModal);
    dom.btnHistory.addEventListener('click', () => openHistoryModal('g1'));
    dom.btnNewGame.addEventListener('click', openNewGamePrompt);

    // Dadi
    document.getElementById('btnDiceTotale').addEventListener('click', () => eseguiRandom('totale'));
    document.getElementById('btnDiceSfida').addEventListener('click', () => eseguiRandom('sfida'));
    document.getElementById('btnDicePassato').addEventListener('click', () => eseguiRandom('passato'));

    // Cronologia Tabs
    document.querySelectorAll('.history-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => setHistoryTab(btn.dataset.tab));
    });

    // Reset confermato
    document.getElementById('confirmResetBtn').addEventListener('click', avviaNuovaPartita);
    document.getElementById('cancelResetBtn').addEventListener('click', closeAllModals);

    // Fine Partita
    document.getElementById('endGameRematchBtn').addEventListener('click', avviaNuovaPartita);
    document.getElementById('endGameHistoryBtn').addEventListener('click', () => {
      closeAllModals();
      openHistoryModal('timeline');
    });

    // Chiusura Modali con X o click su overlay
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    dom.modalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.modalOverlay) closeAllModals();
    });

    // Logo fallback
    const logoImg = document.getElementById('gameLogo');
    if (logoImg) {
      logoImg.addEventListener('error', () => {
        logoImg.style.display = 'none';
        const fallback = document.getElementById('logoFallback');
        if (fallback) fallback.style.display = 'block';
      });
    }
  }

  function setupKeyboardNavigation() {
    window.addEventListener('keydown', (e) => {
      // Chiudi modali con Escape
      if (e.key === 'Escape' && activeModal) {
        closeAllModals();
        return;
      }

      // Non intercettare se un input è attivo
      if (document.activeElement.tagName === 'INPUT') return;

      // Spazio o Invio per scoprire
      if ((e.key === ' ' || e.key === 'Enter') && !game.state.carteScoperte && !activeModal) {
        e.preventDefault();
        onScopriCarteClick();
        return;
      }

      // Tasti 1 / Freccia Sinistra e 2 / Freccia Destra per scegliere
      if (game.state.carteScoperte && !activeModal) {
        if (e.key === '1' || e.key === 'ArrowLeft') {
          e.preventDefault();
          onScegliCarta('sinistra');
        } else if (e.key === '2' || e.key === 'ArrowRight') {
          e.preventDefault();
          onScegliCarta('destra');
        }
      }

      // Ctrl+Z per annulla
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onAnnullaMossaClick();
      }
    });
  }

  // ==========================================================================
  // Utilities (Toast, Vibrazione, Sanitizzazione)
  // ==========================================================================

  function mostraToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.innerText = msg;
    dom.toastContainer.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2800);
  }

  function vibra(pattern) {
    try {
      if ('vibrate' in navigator) navigator.vibrate(pattern);
    } catch (_) {}
  }

  function annunciaScreenReader(msg) {
    if (dom.liveAnnouncer) {
      dom.liveAnnouncer.textContent = msg;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Avvio al caricamento del DOM
  document.addEventListener('DOMContentLoaded', initApp);

})();
