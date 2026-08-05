import './style.css';
import { GameEngine } from './core/GameEngine';
import { Bot } from './core/Bot'; 

// ==========================================
// 1. SETUP MULTIPLAYER (Socket.io) E STATO GLOBALE
// ==========================================
const socket = (window as any).io('https://blind-connect-4.onrender.com');
(window as any).multiplayerSocket = socket;

let currentScreen = 'main-menu';
let isBlindModeActive = true; 
let isBoardLocked = false; 
let isPassAndPlay = false; 
let isOnlineMatch = false;
let currentRoomCode = "";

let selectedFriendId = "";

let engine: GameEngine;
let turnTimer: number | null = null;
let finalGrid: number[][] | null = null;
let finalWinningCells: {c: number, r: number}[] = [];
let finalLastMove: {col: number, player: number} | null = null;
let finalVerdictText = "";
let finalVerdictColorClass = "";

// Palette di colori disponibili per i giocatori
const COLOR_PALETTE = ['#F6D04C', '#E23D3D', '#4ade80', '#0ea5e9', '#a855f7', '#f97316', '#ec4899', '#ffffff'];

// ==========================================
// 2. RECUPERO ELEMENTI DOM E MODALE COLORI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    const mainMenu = document.getElementById('main-menu');
    const localOpponentScreen = document.getElementById('local-opponent');
    const multiplayerLobbyScreen = document.getElementById('multiplayer-lobby');
    const modeSelectionScreen = document.getElementById('mode-selection'); 
    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen'); 

    // Referenze Modale Colori (Overlay)
    const colorModal = document.getElementById('color-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const grid1 = document.getElementById('grid-c1');
    const grid2 = document.getElementById('grid-c2');

    const btnBack = document.getElementById('btn-back');
    const btnLocalPlay = document.getElementById('btn-local-play');
    const btnOnlineMatch = document.getElementById('btn-online-match');
    
    // Pulsanti che aprono le Impostazioni/Colori
    const btnSettings = document.getElementById('btn-settings');
    const btnOpenColors = document.getElementById('btn-open-colors');
    const btnInGameSettings = document.getElementById('btn-in-game-settings');
    
    const btnVsBot = document.getElementById('btn-vs-bot');
    const btnVsFriend = document.getElementById('btn-vs-friend');
    const btnModeNormal = document.getElementById('btn-mode-normal'); 
    const btnModeBlind = document.getElementById('btn-mode-blind');   
    const mixedModeHint = document.getElementById('mixed-mode-hint');

    const btnRandomMatch = document.getElementById('btn-random-match');
    const friendItems = document.querySelectorAll('.friend-item');
    const btnInviteFriend = document.getElementById('btn-invite-friend');
    const multiplayerControls = document.getElementById('multiplayer-controls');
    const waitingMessage = document.getElementById('waiting-message');
    const displayWaitText = document.getElementById('display-wait-text');

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

    const difficultySection = document.querySelector('[data-category="difficulty"]')?.closest('.config-section');
    const starterSection = document.querySelector('[data-category="starter"]')?.closest('.config-section');
    const btnStarterYou = document.querySelector('[data-category="starter"][data-value="YOU"]') as HTMLButtonElement;
    const btnStarterBot = document.querySelector('[data-category="starter"][data-value="BOT"]') as HTMLButtonElement;

    const bot = new Bot();
    
    const sizeClasses = ['text-size-sm', 'text-size-base', 'text-size-md', 'text-size-lg', 'text-size-xl'];
    const colorClasses = ['text-white', 'text-p1', 'text-p2'];
    
    const defaultConfig = {
        difficulty: 'EASY',
        starter: 'YOU',
        p1Color: '#F6D04C', // Default Giallo
        p2Color: '#E23D3D', // Default Rosso
        time: 'NO TIME'
    };
    
    const savedConfig = localStorage.getItem('blind_c4_settings');
    let currentConfig = savedConfig ? JSON.parse(savedConfig) : defaultConfig;

    if(!currentConfig.p1Color) currentConfig.p1Color = '#F6D04C';
    if(!currentConfig.p2Color) currentConfig.p2Color = '#E23D3D';

    if (!savedConfig) {
        localStorage.setItem('blind_c4_settings', JSON.stringify(currentConfig));
    }

    applyColorsToDOM();

    // --- FUNZIONI MODALE COLORI ---

    function renderColorPalette() {
        if (!grid1 || !grid2) return;
        grid1.innerHTML = '';
        grid2.innerHTML = '';
        
        // Popola la griglia dei colori per i due giocatori
        COLOR_PALETTE.forEach(color => {
            const sw1 = document.createElement('div');
            sw1.className = 'color-swatch' + (currentConfig.p1Color === color ? ' selected' : '');
            sw1.style.backgroundColor = color;
            sw1.onclick = () => {
                if (currentConfig.p2Color === color) currentConfig.p2Color = currentConfig.p1Color; 
                currentConfig.p1Color = color;
                applyColorsToDOM();
                renderColorPalette(); // Ridisegna per mostrare i bordi bianchi corretti
            };
            grid1.appendChild(sw1);
            
            const sw2 = document.createElement('div');
            sw2.className = 'color-swatch' + (currentConfig.p2Color === color ? ' selected' : '');
            sw2.style.backgroundColor = color;
            sw2.onclick = () => {
                if (currentConfig.p1Color === color) currentConfig.p1Color = currentConfig.p2Color; 
                currentConfig.p2Color = color;
                applyColorsToDOM();
                renderColorPalette(); 
            };
            grid2.appendChild(sw2);
        });
    }

    function applyColorsToDOM() {
        // Assegna le variabili CSS al root: questo aggiorna all'istante
        // tutta l'interfaccia, pedine comprese, in tempo reale!
        document.documentElement.style.setProperty('--p1-color', currentConfig.p1Color);
        document.documentElement.style.setProperty('--p2-color', currentConfig.p2Color);
        
        if (btnOpenColors) {
            btnOpenColors.style.borderColor = currentConfig.p1Color;
            btnOpenColors.style.color = currentConfig.p1Color;
        }
    }

    function openSettingsModal() {
        renderColorPalette();
        colorModal?.classList.remove('hidden');
    }

    // Colleghiamo tutti e 3 i pulsanti di "settings/colori" all'apertura del modale
    btnSettings?.addEventListener('click', openSettingsModal); // Dal menu principale
    btnOpenColors?.addEventListener('click', openSettingsModal); // Dalle impostazioni pre-partita
    btnInGameSettings?.addEventListener('click', openSettingsModal); // La rotellina durante il gioco

    // La X rossa chiude il popup e salva i dati
    btnCloseModal?.addEventListener('click', () => {
        colorModal?.classList.add('hidden');
        localStorage.setItem('blind_c4_settings', JSON.stringify(currentConfig));
    });

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

        if (isPassAndPlay || isOnlineMatch) {
            difficultySection?.classList.add('hidden'); 
            starterSection?.classList.remove('hidden'); 
            if (btnStarterYou) btnStarterYou.innerText = 'PLAYER 1';
            if (btnStarterBot) btnStarterBot.innerText = 'PLAYER 2';
        } else {
            difficultySection?.classList.remove('hidden'); 
            starterSection?.classList.remove('hidden');
            if (btnStarterYou) btnStarterYou.innerText = 'YOU';
            if (btnStarterBot) btnStarterBot.innerText = 'BOT';
        }
    }


    // ==========================================
    // 3. EVENTI SOCKET.IO
    // ==========================================

    socket.on('game_ready', (msg: string) => {
        isOnlineMatch = true; 
        isPassAndPlay = false; 
        
        switchScreen(multiplayerLobbyScreen, gameScreen, 'game-screen', false);
        initGame();
        alert(msg); 
    });

    socket.on('room_error', (err: string) => {
        alert(err);
    });

    socket.on('move_played', (colIndex: number) => {
        eseguiMossa(colIndex);
    });

    socket.on('match_found', (data: { roomCode: string, role: number }) => {
        currentRoomCode = data.roomCode; 
        isOnlineMatch = true; 
        isPassAndPlay = false; 
        
        currentConfig.starter = data.role === 1 ? 'YOU' : 'OPPONENT';
        
        switchScreen(multiplayerLobbyScreen, gameScreen, 'game-screen', false);
        initGame();
        
        alert(data.role === 1 ? "MATCH FOUND! You go first" : "MATCH FOUND! Opponent goes first"); 
    });


    // ==========================================
    // 4. GESTIONE MENU E NAVIGAZIONE
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

    btnBack?.addEventListener('click', () => {
        if (currentScreen === 'config-screen') {
            switchScreen(configScreen, modeSelectionScreen, 'mode-selection');
        } else if (currentScreen === 'mode-selection') {
            if (isOnlineMatch) {
                switchScreen(modeSelectionScreen, multiplayerLobbyScreen, 'multiplayer-lobby');
            } else {
                switchScreen(modeSelectionScreen, localOpponentScreen, 'local-opponent');
            }
        } else if (currentScreen === 'local-opponent') {
            switchScreen(localOpponentScreen, mainMenu, 'main-menu', false);
        } else if (currentScreen === 'multiplayer-lobby') {
            switchScreen(multiplayerLobbyScreen, mainMenu, 'main-menu', false);
        }
    });

    btnLocalPlay?.addEventListener('click', () => {
        isOnlineMatch = false;
        switchScreen(mainMenu, localOpponentScreen, 'local-opponent');
    });

    btnOnlineMatch?.addEventListener('click', () => {
        isOnlineMatch = true;
        isPassAndPlay = false;
        
        friendItems.forEach(i => i.classList.remove('selected'));
        selectedFriendId = "";
        btnInviteFriend?.classList.add('hidden');
        multiplayerControls?.classList.remove('hidden');
        waitingMessage?.classList.add('hidden');
        
        switchScreen(mainMenu, multiplayerLobbyScreen, 'multiplayer-lobby');
    });

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
    // 5. AZIONI MULTIPLAYER
    // ==========================================
    
    btnRandomMatch?.addEventListener('click', () => {
        socket.emit('find_random_match'); 
        
        if (multiplayerControls) multiplayerControls.classList.add('hidden');
        if (waitingMessage) waitingMessage.classList.remove('hidden');
        if (displayWaitText) displayWaitText.innerText = "Searching for an opponent...";
    });

    friendItems.forEach(item => {
        item.addEventListener('click', () => {
            friendItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedFriendId = item.getAttribute('data-id') || "";
            btnInviteFriend?.classList.remove('hidden');
        });
    });

    btnInviteFriend?.addEventListener('click', () => {
        if (mixedModeHint) mixedModeHint.classList.remove('hidden'); 
        switchScreen(multiplayerLobbyScreen, modeSelectionScreen, 'mode-selection');
    });


    // ==========================================
    // 6. GESTIONE MOTORE DI GIOCO & AVVIO
    // ==========================================

    btnPlay?.addEventListener('click', () => {
        if (isOnlineMatch && selectedFriendId !== "") {
            socket.emit('invite_friend', { targetId: selectedFriendId, config: currentConfig });
            
            switchScreen(configScreen, multiplayerLobbyScreen, 'multiplayer-lobby', false);
            if (multiplayerControls) multiplayerControls.classList.add('hidden');
            if (waitingMessage) waitingMessage.classList.remove('hidden');
            if (displayWaitText) displayWaitText.innerText = "Waiting for friend to accept...";
            return;
        }

        switchScreen(configScreen, gameScreen, 'game-screen', false);
        initGame();
    });

    function handleGameOverDisplay(text: string, colorClass: string) {
        finalVerdictText = text;
        finalVerdictColorClass = colorClass;
        
        if (colButtonsContainer) colButtonsContainer.classList.add('hidden'); 

        if (isBlindModeActive) {
            if (gameCenterText) {
                gameCenterText.classList.remove('hidden', ...sizeClasses, ...colorClasses);
                gameCenterText.classList.add('text-size-lg', colorClass);
                gameCenterText.innerText = text;
            }
        } else {
            if (gameCenterText) gameCenterText.classList.add('hidden');
            if (endGameMessage) {
                endGameMessage.classList.remove('hidden', ...colorClasses);
                endGameMessage.classList.add(colorClass);
                endGameMessage.innerText = text;
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
                handleGameOverDisplay("TIME OUT!", 'text-p2');
                endGameUI();
            }
        }, 1000);
    }

    function triggerBotIfNecessary(isFirstMove: boolean = false) {
        if (!engine || isPassAndPlay || isOnlineMatch) return; 
        
        isBoardLocked = true; 
        
        if (isBlindModeActive && gameCenterText) {
            gameCenterText.classList.remove('hidden', ...sizeClasses);
            gameCenterText.classList.add('text-size-lg');
            gameCenterText.innerText = "THINKING...";
        }

        const waitTime = isFirstMove ? 250 : 1100;

        setTimeout(() => {
            if (!engine) return; 
            
            const botPlayerId = currentConfig.starter === 'YOU' ? 2 : 1;
            
            const botPosition = botPlayerId === 1 ? engine.positionP1 : engine.positionP2;
            const mask = engine.mask;
            
            const botChoice = bot.getMove(botPosition, mask, currentConfig.difficulty);
            
            const targetButton = document.querySelector(`.col-btn[data-col="${botChoice}"]`) as HTMLButtonElement;
            if (targetButton) {
                isBoardLocked = false; 
                targetButton.click();
            }
        }, waitTime); 
    }

    function initGame() {
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
        
        if (gameCenterText) {
            gameCenterText.classList.remove(...colorClasses);
            gameCenterText.classList.add('text-white');
        } 

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

        if (isOnlineMatch) {
            const myPlayerId = currentConfig.starter === 'YOU' ? 1 : 2;
            isBoardLocked = (engine.currentPlayer !== myPlayerId);
        } else {
            isBoardLocked = false;
        }
        
        if (!isPassAndPlay && !isOnlineMatch && currentConfig.starter === 'BOT') {
            triggerBotIfNecessary(true); 
        } else {
            if (isBlindModeActive && gameCenterText) {
                gameCenterText.classList.remove(...sizeClasses);
                gameCenterText.classList.add('text-size-lg');
                
                if (isPassAndPlay || isOnlineMatch) {
                    gameCenterText.innerText = currentConfig.starter === 'YOU' ? "P1'S TURN" : "P2'S TURN";
                } else {
                    gameCenterText.innerText = "YOUR TURN";
                }
            }
            startTimer(); 
        }
    }


    // ==========================================
    // 7. LA FUNZIONE DELLA MOSSA
    // ==========================================
    function eseguiMossa(colIndex: number) {
        if (!engine) return;

        const playerMakingMove = engine.currentPlayer;
        
        const isBot = !isPassAndPlay && !isOnlineMatch && (
            (currentConfig.starter === 'YOU' && playerMakingMove === 2) || 
            (currentConfig.starter === 'BOT' && playerMakingMove === 1)
        );

        if (!isBot && !isOnlineMatch) {
            isBoardLocked = true; 
            stopTimer(); 
        }
        
        if (isOnlineMatch) {
            stopTimer(); 
        }

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
            
            if (isMe) {
                token.classList.add('token-p1');
            } else {
                token.classList.add('token-p2');
            }
            revealBoard.appendChild(token);
        }

        if (!isPassAndPlay && !isOnlineMatch) {
            const lostHearts = 3 - result.livesLeft;
            hearts.forEach((h, index) => {
                if (index < lostHearts) h.classList.add('lost');
            });
        }

        if (result.status === 'ERROR_FULL') {
            if (!isBot && !isOnlineMatch) {
                isBoardLocked = false; 
                startTimer(); 
            }
            if (isOnlineMatch) {
                isBoardLocked = false;
                startTimer();
            }
            return;
        }

        if (result.status === 'GAME_OVER_LIVES' || result.status === 'WIN' || result.status === 'DRAW') {
            if (result.status === 'GAME_OVER_LIVES') {
                handleGameOverDisplay("YOU LOST!", 'text-p2');
            } else if (result.status === 'WIN') {
                let winMsg = isBot ? "BOT WINS!" : "YOU WIN!";
                if (isPassAndPlay || isOnlineMatch) winMsg = playerMakingMove === 1 ? "P1 WINS!" : "P2 WINS!";
                
                handleGameOverDisplay(winMsg, isBot ? 'text-p2' : 'text-p1');
            } else {
                handleGameOverDisplay("DRAW!", 'text-white');
            }
            endGameUI();
            return;
        }

        if (result.status === 'NEXT_TURN') {
            if (isPassAndPlay || isOnlineMatch) {
                
                if (isBlindModeActive && gameCenterText) {
                    gameCenterText.classList.remove('hidden', ...sizeClasses);
                    gameCenterText.classList.add('text-size-md');
                    
                    const nextPlayerTurn = currentConfig.starter === 'YOU' 
                        ? (engine.currentPlayer === 1 ? "P1'S TURN" : "P2'S TURN")
                        : (engine.currentPlayer === 1 ? "P2'S TURN" : "P1'S TURN");
                        
                    gameCenterText.innerText = `COL ${colIndex + 1}\n${nextPlayerTurn}`; 
                }
                
                if (isOnlineMatch) {
                    const myPlayerId = currentConfig.starter === 'YOU' ? 1 : 2;
                    isBoardLocked = (engine.currentPlayer !== myPlayerId); 
                } else {
                    isBoardLocked = false;
                }
                
                startTimer();
                
            } else if (isBot) {
                if (isBlindModeActive && gameCenterText) {
                    gameCenterText.classList.remove('hidden', ...sizeClasses);
                    gameCenterText.classList.add('text-size-xl');
                    gameCenterText.innerText = (colIndex + 1).toString(); 
                }
                isBoardLocked = false; 
                startTimer(); 
            } else {
                triggerBotIfNecessary();
            }
        }
    }

    colButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (isBoardLocked || !engine) return; 

            const target = e.target as HTMLButtonElement;
            const colIndex = parseInt(target.getAttribute('data-col') || '0', 10);

            if (isOnlineMatch) {
                socket.emit('play_move', { roomCode: currentRoomCode, column: colIndex });
                isBoardLocked = true; 
            } else {
                eseguiMossa(colIndex);
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
                    if (child.classList.contains('token-p1') || child.classList.contains('token-p2')) {
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
    
    // Per uscire durante il gioco premiamo REVEAL / SURRENDER. La rotellina ora apre solo i colori.
    if (btnActionPrimary) {
        btnActionPrimary.addEventListener('click', () => {
            handleGameOverDisplay("SURRENDERED!", 'text-p2');
            endGameUI();
        });
    }
    
    if (btnShowGrid) {
        btnShowGrid.addEventListener('click', () => {
            if (!finalGrid || !revealBoard || !gameCenterText) return;
            
            gameCenterText.classList.add('hidden');
            
            if (endGameMessage) {
                endGameMessage.classList.remove('hidden', ...colorClasses);
                endGameMessage.classList.add(finalVerdictColorClass);
                endGameMessage.innerText = finalVerdictText;
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

            for (let r = 5; r >= 0; r--) {
                for (let c = 0; c < 7; c++) {
                    const cell = document.createElement('div');
                    cell.classList.add('board-cell'); 
                    cell.style.gridColumn = (c + 1).toString();
                    cell.style.gridRow = (6 - r).toString();
                    
                    if (finalGrid[c] && finalGrid[c].length > r) {
                        const tokenOwner = finalGrid[c][r];
                        if (tokenOwner === myPlayerId) cell.classList.add('token-p1');
                        else if (tokenOwner === botPlayerId) cell.classList.add('token-p2');
                    }

                    const isWinCell = finalWinningCells.some(w => w.c === c && w.r === r);
                    if (isWinCell) cell.classList.add('winning-token-outline');

                    if (finalLastMove && finalLastMove.col === c && r === 0) {
                        cell.classList.add('last-move-arrow');
                        cell.classList.add(finalLastMove.player === myPlayerId ? 'arrow-p1' : 'arrow-p2');
                    }
                    revealBoard.appendChild(cell);
                }
            }
        });
    }
});