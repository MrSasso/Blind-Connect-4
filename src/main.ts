import './style.css';
import { GameEngine } from './core/GameEngine';
import { Bot } from './core/Bot'; 

// ==========================================
// 1. SETUP MULTIPLAYER (Socket.io)
// ==========================================
const socket = (window as any).io('http://localhost:3000');
(window as any).multiplayerSocket = socket;

socket.on('connect', () => {
    console.log('Ponte stabilito! Connesso al server con ID:', socket.id);
});

socket.on('room_created', (code: string) => {
    console.log('%c STANZA CREATA! Il tuo codice è: ' + code, 'background: #222; color: #bada55; font-size: 15px');
    const waitingMessage = document.getElementById('waiting-message');
    const displayRoomCode = document.getElementById('display-room-code');
    const btnCreateRoom = document.getElementById('btn-create-room');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const roomCodeInput = document.getElementById('room-code-input');

    if (btnCreateRoom) btnCreateRoom.classList.add('hidden');
    if (roomCodeInput) roomCodeInput.classList.add('hidden');
    if (btnJoinRoom) btnJoinRoom.classList.add('hidden');
    
    if (waitingMessage && displayRoomCode) {
        waitingMessage.classList.remove('hidden');
        displayRoomCode.innerText = code;
    }
});

socket.on('game_ready', (msg: string) => {
    console.log('%c MATCH TROVATO! ' + msg, 'background: green; color: white; font-size: 15px');
    alert(msg); 
});

socket.on('room_error', (err: string) => {
    console.error('ERRORE:', err);
    alert(err);
});


// ==========================================
// 2. LOGICA PRINCIPALE (Frontend)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Variabili di Stato ---
    let currentScreen = 'main-menu';
    let isBlindModeActive = true; 
    let isBoardLocked = false; 
    let isPassAndPlay = false; 

    let engine: GameEngine;
    let turnTimer: number | null = null;
    let finalGrid: number[][] | null = null;
    let finalWinningCells: {c: number, r: number}[] = [];
    let finalLastMove: {col: number, player: number} | null = null;
    let finalVerdictText = "";
    let finalVerdictColor = "";

    // --- Elementi DOM: Schermate ---
    const mainMenu = document.getElementById('main-menu');
    const localOpponentScreen = document.getElementById('local-opponent');
    const multiplayerLobbyScreen = document.getElementById('multiplayer-lobby');
    const modeSelectionScreen = document.getElementById('mode-selection'); 
    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen'); 

    // --- Elementi DOM: Bottoni Menu Principale e Navigazione ---
    const btnBack = document.getElementById('btn-back');
    const btnLocalPlay = document.getElementById('btn-local-play');
    const btnOnlineMatch = document.getElementById('btn-online-match');
    
    // --- Elementi DOM: Bottoni Scelta Avversario e Modalità ---
    const btnVsBot = document.getElementById('btn-vs-bot');
    const btnVsFriend = document.getElementById('btn-vs-friend');
    const btnModeNormal = document.getElementById('btn-mode-normal'); 
    const btnModeBlind = document.getElementById('btn-mode-blind');   
    const mixedModeHint = document.getElementById('mixed-mode-hint');

    // --- Elementi DOM: Multiplayer ---
    const btnCreateRoom = document.getElementById('btn-create-room');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const roomCodeInput = document.getElementById('room-code-input') as HTMLInputElement;

    // --- Elementi DOM: Configurazione e Gioco ---
    const configBtns = document.querySelectorAll('.config-btn');
    const btnPlay = document.getElementById('btn-play'); 
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
    const iconBtn = document.querySelector('.icon-btn');

    // Recupero sezioni per modifiche UI dinamiche
    const difficultySection = document.querySelector('[data-category="difficulty"]')?.closest('.config-section');
    const starterSection = document.querySelector('[data-category="starter"]')?.closest('.config-section');
    const btnStarterYou = document.querySelector('[data-category="starter"][data-value="YOU"]') as HTMLButtonElement;
    const btnStarterBot = document.querySelector('[data-category="starter"][data-value="BOT"]') as HTMLButtonElement;
    const btnColorYellow = document.querySelector('[data-category="color"][data-value="YELLOW"]') as HTMLButtonElement;
    const btnColorRed = document.querySelector('[data-category="color"][data-value="RED"]') as HTMLButtonElement;

    const bot = new Bot();
    
    // --- Gestione Salvataggio Configurazione ---
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

        // ADATTAMENTO DINAMICO DELL'INTERFACCIA
        if (isPassAndPlay) {
            difficultySection?.classList.add('hidden'); // Via la difficoltà
            starterSection?.classList.remove('hidden'); 
            
            // Rinomina i bottoni starter
            if (btnStarterYou) btnStarterYou.innerText = 'PLAYER 1';
            if (btnStarterBot) btnStarterBot.innerText = 'PLAYER 2';
            
            // Rinomina i bottoni colore
            if (btnColorYellow) {
                btnColorYellow.innerHTML = 'P1 YELLOW<br>P2 RED';
                btnColorYellow.style.fontSize = '0.85rem';
            }
            if (btnColorRed) {
                btnColorRed.innerHTML = 'P1 RED<br>P2 YELLOW';
                btnColorRed.style.fontSize = '0.85rem';
            }
        } else {
            difficultySection?.classList.remove('hidden'); // Mostra la difficoltà
            starterSection?.classList.remove('hidden');
            
            if (btnStarterYou) btnStarterYou.innerText = 'YOU';
            if (btnStarterBot) btnStarterBot.innerText = 'BOT';
            
            if (btnColorYellow) {
                btnColorYellow.innerText = 'YELLOW';
                btnColorYellow.style.fontSize = '1rem';
            }
            if (btnColorRed) {
                btnColorRed.innerText = 'RED';
                btnColorRed.style.fontSize = '1rem';
            }
        }
    }


    // ==========================================
    // 3. GESTIONE MENU E NAVIGAZIONE
    // ==========================================

    function switchScreen(from: HTMLElement | null, to: HTMLElement | null, screenName: string, showBack: boolean = true) {
        if (from && to) {
            from.classList.add('hidden');
            to.classList.remove('hidden');
            currentScreen = screenName;
            if (showBack) btnBack?.classList.remove('hidden');
            else btnBack?.classList.add('hidden');
        }
    }

    // TASTO BACK
    btnBack?.addEventListener('click', () => {
        if (currentScreen === 'config-screen') {
            switchScreen(configScreen, modeSelectionScreen, 'mode-selection');
        } else if (currentScreen === 'mode-selection') {
            switchScreen(modeSelectionScreen, localOpponentScreen, 'local-opponent');
        } else if (currentScreen === 'local-opponent') {
            switchScreen(localOpponentScreen, mainMenu, 'main-menu', false);
        } else if (currentScreen === 'multiplayer-lobby') {
            switchScreen(multiplayerLobbyScreen, mainMenu, 'main-menu', false);
        }
    });

    // DA MAIN MENU A...
    btnLocalPlay?.addEventListener('click', () => {
        switchScreen(mainMenu, localOpponentScreen, 'local-opponent');
    });

    btnOnlineMatch?.addEventListener('click', () => {
        switchScreen(mainMenu, multiplayerLobbyScreen, 'multiplayer-lobby');
    });

    // SCELTA AVVERSARIO LOCALE
    btnVsBot?.addEventListener('click', () => {
        isPassAndPlay = false;
        currentConfig.starter = 'YOU'; 
        if (mixedModeHint) mixedModeHint.classList.add('hidden'); 
        switchScreen(localOpponentScreen, modeSelectionScreen, 'mode-selection');
    });

    btnVsFriend?.addEventListener('click', () => {
        isPassAndPlay = true;
        currentConfig.starter = 'YOU'; 
        if (mixedModeHint) mixedModeHint.classList.remove('hidden'); 
        switchScreen(localOpponentScreen, modeSelectionScreen, 'mode-selection');
    });

    // SCELTA MODALITÀ
    btnModeNormal?.addEventListener('click', () => {
        isBlindModeActive = false;
        switchScreen(modeSelectionScreen, configScreen, 'config-screen');
        updateUI();
    });

    btnModeBlind?.addEventListener('click', () => {
        isBlindModeActive = true;
        switchScreen(modeSelectionScreen, configScreen, 'config-screen');
        updateUI();
    });

    // SALVATAGGIO OPZIONI CONFIGURAZIONE
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


    // ==========================================
    // 4. AZIONI MULTIPLAYER LOCALI
    // ==========================================
    btnCreateRoom?.addEventListener('click', () => {
        socket.emit('create_room');
    });

    btnJoinRoom?.addEventListener('click', () => {
        const code = roomCodeInput?.value.toUpperCase().trim();
        if (code && code.length === 4) {
            socket.emit('join_room', code);
        } else {
            alert("Room Code must be 4 characters long.");
        }
    });


    // ==========================================
    // 5. GESTIONE MOTORE DI GIOCO
    // ==========================================

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
        if (!engine || isPassAndPlay) return; 
        
        isBoardLocked = true; 
        
        if (isBlindModeActive && gameCenterText) {
            gameCenterText.classList.remove('hidden');
            gameCenterText.style.fontSize = '3rem'; 
            gameCenterText.innerText = "THINKING...";
        }

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

    // --- AVVIO PARTITA ---
    btnPlay?.addEventListener('click', () => {
        switchScreen(configScreen, gameScreen, 'game-screen', false);
        
        engine = new GameEngine();
        finalGrid = null;
        finalWinningCells = [];
        finalLastMove = null;
        
        hearts.forEach(h => h.classList.remove('lost'));
        if (btnExitGame) btnExitGame.classList.add('hidden');
        if (btnShowGrid) btnShowGrid.classList.add('hidden');
        if (btnActionPrimary) btnActionPrimary.classList.remove('hidden');
        if (colButtonsContainer) colButtonsContainer.classList.remove('hidden');
        if (endGameMessage) endGameMessage.classList.add('hidden');
        if (gameCenterText) gameCenterText.style.color = "white"; 

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
        
        if (!isPassAndPlay && currentConfig.starter === 'BOT') {
            triggerBotIfNecessary(true); 
        } else {
            if (isBlindModeActive && gameCenterText) {
                gameCenterText.style.fontSize = '3rem';
                
                // Testo Inizio Dinamico
                if (isPassAndPlay) {
                    gameCenterText.innerText = currentConfig.starter === 'YOU' ? "P1'S TURN" : "P2'S TURN";
                } else {
                    gameCenterText.innerText = "YOUR TURN";
                }
            }
            startTimer(); 
        }
    });

    // --- LOGICA CLICK SULLE COLONNE ---
    colButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (isBoardLocked || !engine) return; 

            const playerMakingMove = engine.currentPlayer;
            
            const isBot = !isPassAndPlay && (
                (currentConfig.starter === 'YOU' && playerMakingMove === 2) || 
                (currentConfig.starter === 'BOT' && playerMakingMove === 1)
            );

            if (!isBot) {
                isBoardLocked = true; 
                stopTimer(); 
            }

            const target = e.target as HTMLButtonElement;
            const colIndex = parseInt(target.getAttribute('data-col') || '0', 10);
            const result = engine.playMove(colIndex);

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

            if (!isPassAndPlay) {
                const lostHearts = 3 - result.livesLeft;
                hearts.forEach((h, index) => {
                    if (index < lostHearts) h.classList.add('lost');
                });
            }

            if (result.status === 'ERROR_FULL') {
                if (!isBot) {
                    isBoardLocked = false; 
                    startTimer(); 
                }
                return;
            }

            if (result.status === 'GAME_OVER_LIVES' || result.status === 'WIN' || result.status === 'DRAW') {
                if (result.status === 'GAME_OVER_LIVES') {
                    handleGameOverDisplay("YOU LOST!", '#E23D3D');
                } else if (result.status === 'WIN') {
                    let winMsg = isBot ? "BOT WINS!" : "YOU WIN!";
                    if (isPassAndPlay) winMsg = playerMakingMove === 1 ? "P1 WINS!" : "P2 WINS!";
                    
                    handleGameOverDisplay(winMsg, isBot ? '#E23D3D' : '#F6D04C');
                } else {
                    handleGameOverDisplay("DRAW!", 'white');
                }
                endGameUI();
                return;
            }

            if (result.status === 'NEXT_TURN') {
                if (isPassAndPlay) {
                    
                    if (isBlindModeActive && gameCenterText) {
                        gameCenterText.classList.remove('hidden');
                        gameCenterText.style.fontSize = '2.5rem'; 
                        
                        // Per il blind, deve mostrare la mossa precedente E a chi tocca ora
                        const nextPlayerTurn = currentConfig.starter === 'YOU' 
                            ? (engine.currentPlayer === 1 ? "P1'S TURN" : "P2'S TURN")
                            : (engine.currentPlayer === 1 ? "P2'S TURN" : "P1'S TURN");
                            
                        gameCenterText.innerText = `COL ${colIndex + 1}\n${nextPlayerTurn}`; 
                    }
                    
                    isBoardLocked = false;
                    startTimer();
                    
                } else if (isBot) {
                    if (isBlindModeActive && gameCenterText) {
                        gameCenterText.classList.remove('hidden');
                        gameCenterText.style.fontSize = '8rem'; 
                        gameCenterText.innerText = (colIndex + 1).toString(); 
                    }
                    isBoardLocked = false; 
                    startTimer(); 
                } else {
                    triggerBotIfNecessary();
                }
            }
        });
    });

    // --- REVEAL E FINE PARTITA ---
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
        switchScreen(gameScreen, mainMenu, 'main-menu', false);
    }

    if (btnExitGame) btnExitGame.addEventListener('click', exitToMenu);
    if (iconBtn) iconBtn.addEventListener('click', exitToMenu);
    
    if (btnActionPrimary) {
        btnActionPrimary.addEventListener('click', () => {
            handleGameOverDisplay("SURRENDERED!", '#E23D3D');
            endGameUI();
        });
    }
    
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