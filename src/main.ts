import './style.css';
import { GameEngine } from './core/GameEngine';
import { Bot } from './core/Bot'; 

document.addEventListener('DOMContentLoaded', () => {
    
    const splashScreen = document.getElementById('splash-screen');
    const mainMenu = document.getElementById('main-menu');
    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen'); 

    const btnNewGame = document.getElementById('btn-new-game');
    const configBtns = document.querySelectorAll('.config-btn');
    const btnPlay = document.getElementById('btn-play'); 

    const colButtons = document.querySelectorAll('.col-btn');
    const hearts = document.querySelectorAll('.heart');
    const gameCenterText = document.getElementById('game-center-text');
    
    const btnExitGame = document.getElementById('btn-exit-game');
    const btnShowGrid = document.getElementById('btn-show-grid');
    const btnActionPrimary = document.getElementById('btn-action-primary');

    const timerDisplay = document.querySelector('.timer-display');
    const timeLeftEl = document.getElementById('time-left');

    let engine: GameEngine;
    const bot = new Bot();
    let turnTimer: number | null = null;

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

    setTimeout(() => {
        if (splashScreen && mainMenu) {
            splashScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        }
    }, 2000);

    if (btnNewGame) {
        btnNewGame.addEventListener('click', () => {
            if (mainMenu && configScreen) {
                mainMenu.classList.add('hidden');
                configScreen.classList.remove('hidden');
                updateUI();
            }
        });
    }

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
        if (gameCenterText) {
            gameCenterText.style.fontSize = '3rem'; 
            gameCenterText.innerText = "THINKING...";
        }

        setTimeout(() => {
            if (!engine) return; 
            const botChoice = bot.getMove(engine.getGridCopy());
            const targetButton = document.querySelector(`.col-btn[data-col="${botChoice}"]`) as HTMLButtonElement;
            if (targetButton) {
                targetButton.click();
            }
        }, 250);
    }

    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            if (configScreen && gameScreen) {
                configScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                
                engine = new GameEngine();
                
                // Reset grafico per una nuova partita
                hearts.forEach(h => h.classList.remove('lost'));
                if (btnExitGame) btnExitGame.classList.add('hidden');
                if (btnShowGrid) btnShowGrid.classList.add('hidden');
                if (btnActionPrimary) btnActionPrimary.classList.remove('hidden');
                
                if (gameCenterText) {
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.style.color = "white"; 
                }

                if (currentConfig.starter === 'BOT') {
                    triggerBotIfNecessary();
                } else {
                    if (gameCenterText) gameCenterText.innerText = "YOUR TURN";
                    document.body.style.pointerEvents = 'auto';
                    startTimer(); 
                }
            }
        });
    }

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
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = "YOU LOST!";
                    gameCenterText.style.color = '#E23D3D';
                }
                endGameUI();
                return;
            }

            if (result.status === 'WIN') {
                if (gameCenterText) {
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = isBot ? "BOT WINS!" : "YOU WIN!";
                    gameCenterText.style.color = isBot ? '#E23D3D' : '#F6D04C'; 
                }
                endGameUI();
                return;
            }

            if (result.status === 'DRAW') {
                if (gameCenterText) {
                    gameCenterText.style.fontSize = '3rem';
                    gameCenterText.innerText = "DRAW!";
                }
                endGameUI();
                return;
            }

            if (result.status === 'NEXT_TURN') {
                if (isBot) {
                    if (gameCenterText) {
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
        if (btnShowGrid) btnShowGrid.classList.remove('hidden');
        
        engine = null as any;
    }

    function exitToMenu() {
        stopTimer(); 
        document.body.style.pointerEvents = 'auto';
        engine = null as any;
        
        if (gameScreen && mainMenu) {
            gameScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        }
    }

    if (btnExitGame) {
        btnExitGame.addEventListener('click', exitToMenu);
    }

    if (btnActionPrimary) {
        btnActionPrimary.addEventListener('click', () => {
            if (gameCenterText) {
                gameCenterText.style.fontSize = '3rem';
                gameCenterText.innerText = "YOU LOST!";
                gameCenterText.style.color = '#E23D3D';
            }
            endGameUI();
        });
    }

    if (btnShowGrid) {
        btnShowGrid.addEventListener('click', () => {
            console.log("Il tasto SHOW è pronto per la sua futura funzione!");
        });
    }

    const iconBtn = document.querySelector('.icon-btn');
    if (iconBtn) {
        iconBtn.addEventListener('click', exitToMenu);
    }

});