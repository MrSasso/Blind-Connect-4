import './style.css';
import { GameEngine } from './core/GameEngine';
import { Bot } from './core/Bot'; 

document.addEventListener('DOMContentLoaded', () => {
    let isBlindModeActive = true; 

    const mainMenu = document.getElementById('main-menu');
    const modeSelectionScreen = document.getElementById('mode-selection'); // NUOVO
    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen'); 

    const btnNewGame = document.getElementById('btn-new-game');
    const configBtns = document.querySelectorAll('.config-btn');
    const btnPlay = document.getElementById('btn-play'); // Questo è il Play del Main Menu
    const btnModeNormal = document.getElementById('btn-mode-normal'); // NUOVO
    const btnModeBlind = document.getElementById('btn-mode-blind');   // NUOVO
    const btnBack = document.getElementById('btn-back');
    let currentScreen = 'main-menu';

    const colButtons = document.querySelectorAll('.col-btn');
    const hearts = document.querySelectorAll('.heart');
    const gameCenterText = document.getElementById('game-center-text');
    const revealBoard = document.getElementById('reveal-board');
    
    const btnExitGame = document.getElementById('btn-exit-game');
    const btnShowGrid = document.getElementById('btn-show-grid');
    const btnActionPrimary = document.getElementById('btn-action-primary');

    const timerDisplay = document.querySelector('.timer-display');
    const timeLeftEl = document.getElementById('time-left');

    let engine: GameEngine;
    const bot = new Bot();
    let turnTimer: number | null = null;
    
    let finalGrid: number[][] | null = null;
    let finalWinningCells: {c: number, r: number}[] = [];
    let finalLastMove: {col: number, player: number} | null = null;

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

    if (btnNewGame) {
        btnNewGame.addEventListener('click', () => {
            if (mainMenu && modeSelectionScreen) {
                mainMenu.classList.add('hidden');
                modeSelectionScreen.classList.remove('hidden');
            }
            currentScreen = 'mode-selection';
            btnBack?.classList.remove('hidden');
        });
    }

    // Dalla modalità NORMAL si va alle impostazioni
    btnModeNormal?.addEventListener('click', () => {
        isBlindModeActive = false;
        if (modeSelectionScreen && configScreen) {
            modeSelectionScreen.classList.add('hidden');
            configScreen.classList.remove('hidden');
            updateUI();
        }
        currentScreen = 'config-screen';
    });

    // Dalla modalità BLIND si va alle impostazioni
    btnModeBlind?.addEventListener('click', () => {
        isBlindModeActive = true;
        if (modeSelectionScreen && configScreen) {
            modeSelectionScreen.classList.add('hidden');
            configScreen.classList.remove('hidden');
            updateUI();
        }
        currentScreen = 'config-screen';
    });

    // Aggiornamento impostazioni salvate
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

    // Gestione Timer
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
                if (gameCenterText) {
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = "TIME OUT!";
                    gameCenterText.style.color = '#E23D3D'; 
                }
                endGameUI();
            }
        }, 1000);
    }

    function triggerBotIfNecessary() {
        if (!engine) return;

        document.body.style.pointerEvents = 'none';
        
        if (isBlindModeActive) {
            if (gameCenterText) {
                gameCenterText.classList.remove('hidden');
                gameCenterText.style.fontSize = '3rem'; 
                gameCenterText.innerText = "THINKING...";
            }
        }

        setTimeout(() => {
            if (!engine) return; 
            const botChoice = bot.getMove(engine.getGridCopy(), currentConfig.difficulty);
            const targetButton = document.querySelector(`.col-btn[data-col="${botChoice}"]`) as HTMLButtonElement;
            if (targetButton) {
                targetButton.click();
            }
        }, 250);
    }

    // Inizio partita reale
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (configScreen && gameScreen) {
                configScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                
                engine = new GameEngine();
                
                // RESET VARIABILI
                finalGrid = null;
                finalWinningCells = [];
                finalLastMove = null;
                
                hearts.forEach(h => h.classList.remove('lost'));
                if (btnExitGame) btnExitGame.classList.add('hidden');
                if (btnShowGrid) btnShowGrid.classList.add('hidden');
                if (btnActionPrimary) btnActionPrimary.classList.remove('hidden');
                
                if (revealBoard) revealBoard.classList.add('hidden');
                
                // PREPARAZIONE TESTO CENTRALE
                if (gameCenterText) {
                    gameCenterText.style.color = "white"; 
                    if (isBlindModeActive) {
                        gameCenterText.classList.remove('hidden');
                    } else {
                        gameCenterText.classList.add('hidden'); // In normal mode non serve il testo gigante
                        // QUI DOVRAI INSERIRE LA LOGICA PER DISEGNARE LA GRIGLIA VUOTA ALL'INIZIO
                    }
                }

                if (currentConfig.starter === 'BOT') {
                    triggerBotIfNecessary();
                } else {
                    if (isBlindModeActive && gameCenterText) {
                        gameCenterText.style.fontSize = '3rem';
                        gameCenterText.innerText = "YOUR TURN";
                    }
                    document.body.style.pointerEvents = 'auto';
                    startTimer(); 
                }
            }
            currentScreen = 'game-screen';
            btnBack?.classList.add('hidden');
        });
    }

    // Logica di gioco principale
    colButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!engine) return; 

            const playerMakingMove = engine.currentPlayer;
            const isBot = (currentConfig.starter === 'YOU' && playerMakingMove === 2) || 
                          (currentConfig.starter === 'BOT' && playerMakingMove === 1);

            if (!isBot) {
                stopTimer(); 
                document.body.style.pointerEvents = 'none'; 
            }

            const target = e.target as HTMLButtonElement;
            const colIndex = parseInt(target.getAttribute('data-col') || '0', 10);

            const result = engine.playMove(colIndex);

            if (!isBlindModeActive) {
                // SE NON È BLIND MODE: DISEGNA LA PEDINA IN TEMPO REALE
                // Dovrai prendere il colore del giocatore corrente e disegnarlo 
                // nella cella corretta (colIndex, result.row)
            }

            const lostHearts = 3 - result.livesLeft;
            hearts.forEach((h, index) => {
                if (index < lostHearts) {
                    h.classList.add('lost');
                }
            });

            if (result.status === 'ERROR_FULL') {
                if (!isBot) {
                    startTimer(); 
                    document.body.style.pointerEvents = 'auto';
                }
                return;
            }

            if (result.status === 'GAME_OVER_LIVES') {
                if (gameCenterText) {
                    gameCenterText.classList.remove('hidden');
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = "YOU LOST!";
                    gameCenterText.style.color = '#E23D3D';
                }
                endGameUI();
                return;
            }

            if (result.status === 'WIN') {
                if (gameCenterText) {
                    gameCenterText.classList.remove('hidden');
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = isBot ? "BOT WINS!" : "YOU WIN!";
                    gameCenterText.style.color = isBot ? '#E23D3D' : '#F6D04C'; 
                }
                endGameUI();
                return;
            }

            if (result.status === 'DRAW') {
                if (gameCenterText) {
                    gameCenterText.classList.remove('hidden');
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = "DRAW!";
                }
                endGameUI();
                return;
            }

            if (result.status === 'NEXT_TURN') {
                if (isBot) {
                    if (isBlindModeActive && gameCenterText) {
                        gameCenterText.classList.remove('hidden');
                        gameCenterText.style.fontSize = '8rem'; 
                        gameCenterText.innerText = (colIndex + 1).toString(); 
                    }
                    
                    document.body.style.pointerEvents = 'auto';
                    startTimer(); 
                } else {
                    triggerBotIfNecessary();
                }
            }
        });
    });

    function endGameUI() {
        stopTimer(); 
        document.body.style.pointerEvents = 'auto';
        
        if (btnActionPrimary) btnActionPrimary.classList.add('hidden');
        if (btnExitGame) btnExitGame.classList.remove('hidden');
        
        if (isBlindModeActive && btnShowGrid) {
            btnShowGrid.classList.remove('hidden');
        }
        
        if (engine) {
            finalGrid = engine.getGridCopy();
            finalWinningCells = [...engine.winningCells];
            finalLastMove = engine.lastMove ? { ...engine.lastMove } : null;
        }
        
        engine = null as any;
    }

    function exitToMenu() {
        stopTimer(); 
        document.body.style.pointerEvents = 'auto';
        engine = null as any;
        finalGrid = null;
        finalWinningCells = [];
        finalLastMove = null;
        
        if (gameScreen && mainMenu) {
            gameScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        }
    }

    if (btnExitGame) btnExitGame.addEventListener('click', exitToMenu);
    if (btnActionPrimary) {
        btnActionPrimary.addEventListener('click', () => {
            if (gameCenterText) {
                gameCenterText.classList.remove('hidden');
                gameCenterText.style.fontSize = '3rem';
                gameCenterText.innerText = "YOU LOST!";
                gameCenterText.style.color = '#E23D3D';
            }
            endGameUI();
        });
    }

    const iconBtn = document.querySelector('.icon-btn');
    if (iconBtn) iconBtn.addEventListener('click', exitToMenu);

    if (btnShowGrid) {
        btnShowGrid.addEventListener('click', () => {
            if (!finalGrid || !revealBoard || !gameCenterText) return;
            
            gameCenterText.classList.add('hidden');
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
                        if (tokenOwner === myPlayerId) {
                            cell.classList.add(myColorClass);
                        } else if (tokenOwner === botPlayerId) {
                            cell.classList.add(botColorClass);
                        }
                    }

                    const isWinCell = finalWinningCells.some(w => w.c === c && w.r === r);
                    if (isWinCell) {
                        cell.classList.add('winning-token-outline');
                    }

                    if (finalLastMove && finalLastMove.col === c) {
                        if (r === 0) {
                            cell.classList.add('last-move-arrow');
                            if (finalLastMove.player === myPlayerId) {
                                cell.classList.add(currentConfig.color === 'YELLOW' ? 'arrow-yellow' : 'arrow-red');
                            } else {
                                cell.classList.add(currentConfig.color === 'YELLOW' ? 'arrow-red' : 'arrow-yellow');
                            }
                        }
                    }
                    
                    revealBoard.appendChild(cell);
                }
            }
        });
    }

    btnBack?.addEventListener('click', () => {
        if (currentScreen === 'config-screen') {
            configScreen?.classList.add('hidden');
            modeSelectionScreen?.classList.remove('hidden');
            currentScreen = 'mode-selection';
        } 
        
        else if (currentScreen === 'mode-selection') {
            modeSelectionScreen?.classList.add('hidden');
            mainMenu?.classList.remove('hidden');
            currentScreen = 'main-menu';
            
            btnBack?.classList.add('hidden'); 
        }
    });
});