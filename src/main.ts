import './style.css';
import { GameEngine } from './core/GameEngine';
import { Bot } from './core/Bot'; 

document.addEventListener('DOMContentLoaded', () => {
    let isBlindModeActive = true; 
    let isBoardLocked = false; 
    let finalVerdictText = "";
    let finalVerdictColor = "";
    let currentScreen = 'main-menu';
    let engine: GameEngine;
    let turnTimer: number | null = null;
    let finalGrid: number[][] | null = null;
    let finalWinningCells: {c: number, r: number}[] = [];
    let finalLastMove: {col: number, player: number} | null = null;

    const btnBack = document.getElementById('btn-back');
    const mainMenu = document.getElementById('main-menu');
    const modeSelectionScreen = document.getElementById('mode-selection'); 
    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen'); 
    const btnNewGame = document.getElementById('btn-new-game');
    const configBtns = document.querySelectorAll('.config-btn');
    const btnPlay = document.getElementById('btn-play'); 
    const btnModeNormal = document.getElementById('btn-mode-normal'); 
    const btnModeBlind = document.getElementById('btn-mode-blind');   
    const colButtons = document.querySelectorAll('.col-btn');
    const colButtonsContainer = document.getElementById('col-buttons');
    const hearts = document.querySelectorAll('.heart');
    const gameCenterText = document.getElementById('game-center-text');
    const endGameMessage = document.getElementById('end-game-message');
    const revealBoard = document.getElementById('reveal-board');
    const btnExitGame = document.getElementById('btn-exit-game');
    const btnShowGrid = document.getElementById('btn-show-grid');
    const btnActionPrimary = document.getElementById('btn-action-primary');
    const timerDisplay = document.querySelector('.timer-display');
    const timeLeftEl = document.getElementById('time-left');
    const bot = new Bot();
    const defaultConfig = {
        difficulty: 'EASY',
        starter: 'YOU',
        color: 'YELLOW',
        time: 'NO TIME'
    };
    const savedConfig = localStorage.getItem('blind_c4_settings');

    let currentConfig = savedConfig ? JSON.parse(savedConfig) : defaultConfig;

    if (!savedConfig) {
        localStorage.setItem('blind_c4_settings', JSON.stringify(currentConfig));
    }

    function updateUI() {
        configBtns.forEach(btn => {
            const category = btn.getAttribute('data-category'); 
            const value = btn.getAttribute('data-value');       
            if (category && value && currentConfig[category as keyof typeof currentConfig] === value) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    // --- LOGICA DEL TASTO BACK ---
    btnBack?.addEventListener('click', () => {
        if (currentScreen === 'config-screen') {
            configScreen?.classList.add('hidden');
            modeSelectionScreen?.classList.remove('hidden');
            currentScreen = 'mode-selection';
        } else if (currentScreen === 'mode-selection') {
            modeSelectionScreen?.classList.add('hidden');
            mainMenu?.classList.remove('hidden');
            currentScreen = 'main-menu';
            btnBack?.classList.add('hidden'); 
        }
    });

    // --- LOGICA MENU ---
    if (btnNewGame) {
        btnNewGame.addEventListener('click', () => {
            if (mainMenu && modeSelectionScreen) {
                mainMenu.classList.add('hidden');
                modeSelectionScreen.classList.remove('hidden');
                currentScreen = 'mode-selection';
                btnBack?.classList.remove('hidden');
            }
        });
    }

    btnModeNormal?.addEventListener('click', () => {
        isBlindModeActive = false;
        if (modeSelectionScreen && configScreen) {
            modeSelectionScreen.classList.add('hidden');
            configScreen.classList.remove('hidden');
            currentScreen = 'config-screen';
            updateUI();
        }
    });

    btnModeBlind?.addEventListener('click', () => {
        isBlindModeActive = true;
        if (modeSelectionScreen && configScreen) {
            modeSelectionScreen.classList.add('hidden');
            configScreen.classList.remove('hidden');
            currentScreen = 'config-screen';
            updateUI();
        }
    });

    configBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLButtonElement;
            const category = target.getAttribute('data-category');
            const value = target.getAttribute('data-value');
            
            if (category && value) {
                currentConfig[category as keyof typeof currentConfig] = value;
                localStorage.setItem('blind_c4_settings', JSON.stringify(currentConfig));
                updateUI();
            }
        });
    });

    // --- DISPLAY FINE PARTITA INTELLIGENTE ---
    function handleGameOverDisplay(text: string, color: string) {
        finalVerdictText = text;
        finalVerdictColor = color;
        
        if (colButtonsContainer) colButtonsContainer.classList.add('hidden'); 

        if (isBlindModeActive) {
            if (gameCenterText) {
                gameCenterText.classList.remove('hidden');
                gameCenterText.style.fontSize = '3rem';
                gameCenterText.innerText = text;
                gameCenterText.style.color = color;
            }
        } else {
            if (gameCenterText) gameCenterText.classList.add('hidden');
            if (endGameMessage) {
                endGameMessage.classList.remove('hidden');
                endGameMessage.innerText = text;
                endGameMessage.style.color = color;
            }
        }
    }

    // --- GESTIONE TIMER E BOT ---
    function stopTimer() {
        if (turnTimer !== null) {
            clearInterval(turnTimer);
            turnTimer = null;
        }
    }

    function startTimer() {
        stopTimer();
        if (currentConfig.time === 'NO TIME') {
            if (timerDisplay) timerDisplay.classList.add('hidden');
            return;
        }
        if (timerDisplay) timerDisplay.classList.remove('hidden');
        let timeLeft = 15;
        if (timeLeftEl) timeLeftEl.innerText = timeLeft.toString();

        turnTimer = window.setInterval(() => {
            timeLeft--;
            if (timeLeftEl) timeLeftEl.innerText = timeLeft.toString();
            if (timeLeft <= 0) {
                handleGameOverDisplay("TIME OUT!", '#E23D3D');
                endGameUI();
            }
        }, 1000);
    }

    function triggerBotIfNecessary(isFirstMove: boolean = false) {
        if (!engine) return;
        
        isBoardLocked = true; // LUCCHETTO ATTIVO: L'utente non può cliccare
        
        if (isBlindModeActive && gameCenterText) {
            gameCenterText.classList.remove('hidden');
            gameCenterText.style.fontSize = '3rem'; 
            gameCenterText.innerText = "THINKING...";
        }

        // Se è la prima mossa aspetta solo 250ms, altrimenti i canonici 1500ms
        const waitTime = isFirstMove ? 250 : 1100;

        setTimeout(() => {
            if (!engine) return; 
            const botChoice = bot.getMove(engine.getGridCopy(), currentConfig.difficulty);
            const targetButton = document.querySelector(`.col-btn[data-col="${botChoice}"]`) as HTMLButtonElement;
            if (targetButton) {
                isBoardLocked = false; 
                targetButton.click();
            }
        }, waitTime); 
    }

    // --- INIZIO PARTITA REALE ---
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (configScreen && gameScreen) {
                configScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                currentScreen = 'game-screen';
                btnBack?.classList.add('hidden');
                
                engine = new GameEngine();
                finalGrid = null;
                finalWinningCells = [];
                finalLastMove = null;
                
                // Reset della UI
                hearts.forEach(h => h.classList.remove('lost'));
                if (btnExitGame) btnExitGame.classList.add('hidden');
                if (btnShowGrid) btnShowGrid.classList.add('hidden');
                if (btnActionPrimary) btnActionPrimary.classList.remove('hidden');
                if (colButtonsContainer) colButtonsContainer.classList.remove('hidden');
                if (endGameMessage) endGameMessage.classList.add('hidden');
                if (gameCenterText) gameCenterText.style.color = "white"; 

                // SETUP VISIVO IN BASE ALLA MODALITÀ
                if (isBlindModeActive) {
                    if (gameCenterText) gameCenterText.classList.remove('hidden');
                    if (revealBoard) revealBoard.classList.add('hidden');
                } else {
                    if (gameCenterText) gameCenterText.classList.add('hidden'); 
                    if (revealBoard) {
                        revealBoard.classList.remove('hidden');
                        revealBoard.innerHTML = '';
                        for (let r = 5; r >= 0; r--) {
                            for (let c = 0; c < 7; c++) {
                                const cell = document.createElement('div');
                                cell.classList.add('board-cell');
                                cell.style.gridColumn = (c + 1).toString();
                                cell.style.gridRow = (6 - r).toString();
                                revealBoard.appendChild(cell);
                            }
                        }
                    }
                }

                isBoardLocked = false;
                
                if (currentConfig.starter === 'BOT') {
                    triggerBotIfNecessary(true); 
                } else {
                    if (isBlindModeActive && gameCenterText) {
                        gameCenterText.style.fontSize = '3rem';
                        gameCenterText.innerText = "YOUR TURN";
                    }
                    startTimer(); 
                }
            }
        });
    }

    // --- LOGICA TURNI E MOSSE ---
    colButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // SE IL SEMAFORO È ROSSO, IGNORA IL CLICK
            if (isBoardLocked || !engine) return; 

            const playerMakingMove = engine.currentPlayer;
            const isBot = (currentConfig.starter === 'YOU' && playerMakingMove === 2) || 
                          (currentConfig.starter === 'BOT' && playerMakingMove === 1);

            if (!isBot) {
                // IL GIOCATORE UMANO HA CLICCATO: Blocca subito la griglia e ferma il timer
                isBoardLocked = true; 
                stopTimer(); 
            }

            const target = e.target as HTMLButtonElement;
            const colIndex = parseInt(target.getAttribute('data-col') || '0', 10);
            const result = engine.playMove(colIndex);

            // ANIMAZIONE PEDINA (Normal Mode)
            if (!isBlindModeActive && result.status !== 'ERROR_FULL' && revealBoard) {
                const currentGrid = engine.getGridCopy();
                const row = currentGrid[colIndex].length - 1; 
                
                const token = document.createElement('div');
                token.classList.add('board-cell', 'token-animated');
                token.style.gridColumn = (colIndex + 1).toString();
                token.style.gridRow = (6 - row).toString();

                const myPlayerId = currentConfig.starter === 'YOU' ? 1 : 2;
                const isMe = (playerMakingMove === myPlayerId);
                const amIYellow = (currentConfig.color === 'YELLOW');
                
                if ((isMe && amIYellow) || (!isMe && !amIYellow)) {
                    token.classList.add('token-yellow');
                } else {
                    token.classList.add('token-red');
                }
                revealBoard.appendChild(token);
            }

            const lostHearts = 3 - result.livesLeft;
            hearts.forEach((h, index) => {
                if (index < lostHearts) h.classList.add('lost');
            });

            if (result.status === 'ERROR_FULL') {
                if (!isBot) {
                    isBoardLocked = false; // Colonna piena, rida' il permesso di cliccare altrove
                    startTimer(); 
                }
                return;
            }

            // FINE GIOCO
            if (result.status === 'GAME_OVER_LIVES' || result.status === 'WIN' || result.status === 'DRAW') {
                if (result.status === 'GAME_OVER_LIVES') {
                    handleGameOverDisplay("YOU LOST!", '#E23D3D');
                } else if (result.status === 'WIN') {
                    handleGameOverDisplay(isBot ? "BOT WINS!" : "YOU WIN!", isBot ? '#E23D3D' : '#F6D04C');
                } else {
                    handleGameOverDisplay("DRAW!", 'white');
                }
                endGameUI();
                return;
            }

            // PROSSIMO TURNO
            if (result.status === 'NEXT_TURN') {
                if (isBot) {
                    // IL BOT HA FINITO, TOCCA A TE
                    if (isBlindModeActive && gameCenterText) {
                        gameCenterText.classList.remove('hidden');
                        gameCenterText.style.fontSize = '8rem'; 
                        gameCenterText.innerText = (colIndex + 1).toString(); 
                    }
                    isBoardLocked = false; // SBLOCCA LA TUA MOSSA
                    startTimer(); 
                } else {
                    // TU HAI FINITO, TOCCA AL BOT
                    triggerBotIfNecessary();
                }
            }
        });
    });

    function highlightWinInNormalMode() {
        if (!finalGrid || !revealBoard || finalWinningCells.length === 0) return;
        
        if (finalLastMove) {
            const beam = document.createElement('div');
            beam.classList.add('last-move-beam');
            beam.style.gridColumn = (finalLastMove.col + 1).toString();
            beam.style.gridRow = '1 / span 6';
            revealBoard.appendChild(beam);
        }

        const children = revealBoard.children;
        finalWinningCells.forEach(w => {
            for(let i=0; i<children.length; i++) {
                const child = children[i] as HTMLElement;
                if(child.style.gridColumn === (w.c + 1).toString() && child.style.gridRow === (6 - w.r).toString()) {
                    if (child.classList.contains('token-yellow') || child.classList.contains('token-red')) {
                        child.classList.add('winning-token-outline');
                    }
                }
            }
        });
    }

    function endGameUI() {
        stopTimer(); 
        
        if (btnActionPrimary) btnActionPrimary.classList.add('hidden');
        if (btnExitGame) btnExitGame.classList.remove('hidden');
        
        if (engine) {
            finalGrid = engine.getGridCopy();
            finalWinningCells = [...engine.winningCells];
            finalLastMove = engine.lastMove ? { ...engine.lastMove } : null;
        }

        if (isBlindModeActive && btnShowGrid) {
            btnShowGrid.classList.remove('hidden');
        } else if (!isBlindModeActive) {
            highlightWinInNormalMode(); 
        }
        
        engine = null as any;
    }

    function exitToMenu() {
        stopTimer(); 
        engine = null as any;
        finalGrid = null;
        finalWinningCells = [];
        finalLastMove = null;
        
        if (gameScreen && mainMenu) {
            gameScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
            currentScreen = 'main-menu';
        }
    }

    if (btnExitGame) btnExitGame.addEventListener('click', exitToMenu);
    
    if (btnActionPrimary) {
        btnActionPrimary.addEventListener('click', () => {
            handleGameOverDisplay("SURRENDERED!", '#E23D3D');
            endGameUI();
        });
    }
    
    const iconBtn = document.querySelector('.icon-btn');
    if (iconBtn) iconBtn.addEventListener('click', exitToMenu);

    // --- REVEAL DELLA BLIND MODE --- 
    if (btnShowGrid) {
        btnShowGrid.addEventListener('click', () => {
            if (!finalGrid || !revealBoard || !gameCenterText) return;
            
            gameCenterText.classList.add('hidden');
            
            if (endGameMessage) {
                endGameMessage.classList.remove('hidden');
                endGameMessage.innerText = finalVerdictText;
                endGameMessage.style.color = finalVerdictColor;
            }

            btnShowGrid.classList.add('hidden');
            revealBoard.classList.remove('hidden');
            revealBoard.innerHTML = ''; 

            if (finalLastMove) {
                const beam = document.createElement('div');
                beam.classList.add('last-move-beam');
                beam.style.gridColumn = (finalLastMove.col + 1).toString();
                beam.style.gridRow = '1 / span 6';
                revealBoard.appendChild(beam);
            }

            const myPlayerId = currentConfig.starter === 'YOU' ? 1 : 2;
            const botPlayerId = currentConfig.starter === 'YOU' ? 2 : 1;
            const myColorClass = currentConfig.color === 'YELLOW' ? 'token-yellow' : 'token-red';
            const botColorClass = currentConfig.color === 'YELLOW' ? 'token-red' : 'token-yellow';

            for (let r = 5; r >= 0; r--) {
                for (let c = 0; c < 7; c++) {
                    const cell = document.createElement('div');
                    cell.classList.add('board-cell'); 
                    cell.style.gridColumn = (c + 1).toString();
                    cell.style.gridRow = (6 - r).toString();
                    
                    if (finalGrid[c] && finalGrid[c].length > r) {
                        const tokenOwner = finalGrid[c][r];
                        if (tokenOwner === myPlayerId) cell.classList.add(myColorClass);
                        else if (tokenOwner === botPlayerId) cell.classList.add(botColorClass);
                    }

                    const isWinCell = finalWinningCells.some(w => w.c === c && w.r === r);
                    if (isWinCell) cell.classList.add('winning-token-outline');

                    if (finalLastMove && finalLastMove.col === c && r === 0) {
                        cell.classList.add('last-move-arrow');
                        cell.classList.add(finalLastMove.player === myPlayerId ? (currentConfig.color === 'YELLOW' ? 'arrow-yellow' : 'arrow-red') : (currentConfig.color === 'YELLOW' ? 'arrow-red' : 'arrow-yellow'));
                    }
                    revealBoard.appendChild(cell);
                }
            }
        });
    }
});