// Complete rewrite of game.js - focuses on making the actual game work properly
document.addEventListener('DOMContentLoaded', function() {
    console.log('Game.js loaded - completely rewritten version');
    
    // Get Supabase client from global scope or create a new one
    let supabaseClient;
    if (window.supabaseClient) {
        supabaseClient = window.supabaseClient;
    } else {
        const SUPABASE_URL = 'https://lhkvzwsdidulwulghebk.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3Z6d3NkaWR1bHd1bGdoZWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTQ5OTksImV4cCI6MjA1Njc5MDk5OX0.lz3Pch5hBBO2Ug_iI5f2jMGV4Xwqt8t4RcPrn4_EzPw';
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        window.supabaseClient = supabaseClient;
    }

    // Core game managers
    let skillsManager = new SkillsManager();
    let playerManager = new PlayerManager(supabaseClient);
    let progressManager = new ProgressManager();
    let shop = new Shop(skillsManager);

    // Game state
    let player = null;
    let monster = null;
    let gameState = 'character_select'; // character_select, playing, game_over, shop

    // DOM elements with error checking
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
            return null;
        }
        return element;
    }

    // Get important DOM elements
    const gameContainer = getElement('game-container');
    const playerNameEl = getElement('player-name');
    const playerHealthEl = getElement('player-health');
    const playerHealthBarEl = getElement('player-health-bar');
    const playerManaEl = getElement('player-mana');
    const playerManaBarEl = getElement('player-mana-bar');
    const playerLevelEl = getElement('player-level');
    const playerXpEl = getElement('player-xp');
    const playerXpBarEl = getElement('player-xp-bar');
    const playerGoldEl = getElement('player-gold');
    const playerScoreEl = getElement('player-score');
    const towerLevelEl = getElement('tower-level');
    const towerProgressEl = getElement('tower-progress');
    const towerProgressBarEl = getElement('tower-progress-bar');
    const enemyNameEl = getElement('enemy-name');
    const enemyHealthEl = getElement('enemy-health');
    const enemyHealthBarEl = getElement('enemy-health-bar');
    const enemyLevelEl = getElement('enemy-level');
    const logEl = getElement('log');
    const actionButtonsEl = getElement('action-buttons');
    const characterSelectEl = getElement('character-select');
    const shopEl = getElement('shop-container');
    const highscoreTableEl = getElement('highscore-table');
    const characterListEl = getElement('character-list');
    const logoutButton = getElement('logout-button');
    const gameLogoutButton = getElement('game-logout-button');

    // Initialize logout buttons
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    if (gameLogoutButton) {
        gameLogoutButton.addEventListener('click', handleLogout);
    }

    // Handle logout
    async function handleLogout() {
        try {
            if (confirm('Are you sure you want to logout?')) {
                await supabaseClient.auth.signOut();
                alert('Logged out successfully');
                window.location.reload();
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('Error during logout. Please try again.');
        }
    }

    // Game log function
    function log(message, type = 'info') {
        if (!logEl) {
            console.log(`Game log: ${message}`);
            return;
        }
        
        const p = document.createElement('p');
        p.textContent = message;
        p.className = `log-${type}`;
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // Update game UI
    function updateUI() {
        if (!player) return;
        
        try {
            // Update player stats
            if (playerNameEl) playerNameEl.textContent = player.name;
            if (playerHealthEl) playerHealthEl.textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
            if (playerHealthBarEl) playerHealthBarEl.style.width = `${player.getHealthPercentage()}%`;
            
            // Apply health bar color
            if (playerHealthBarEl) {
                if (player.getHealthPercentage() < 25) {
                    playerHealthBarEl.className = 'health-bar-fill critical';
                } else if (player.getHealthPercentage() < 60) {
                    playerHealthBarEl.className = 'health-bar-fill warning';
                } else {
                    playerHealthBarEl.className = 'health-bar-fill';
                }
            }
            
            if (playerManaEl) playerManaEl.textContent = `${Math.max(0, Math.floor(player.mana))}/${player.maxMana}`;
            if (playerManaBarEl) playerManaBarEl.style.width = `${player.getManaPercentage()}%`;
            
            if (playerLevelEl) playerLevelEl.textContent = player.level;
            if (playerXpEl) playerXpEl.textContent = `${player.xp}/${player.xpToNextLevel}`;
            if (playerXpBarEl) playerXpBarEl.style.width = `${Math.floor((player.xp / player.xpToNextLevel) * 100)}%`;
            
            if (playerGoldEl) playerGoldEl.textContent = player.gold;
            if (playerScoreEl) playerScoreEl.textContent = player.score;
            
            // Update tower information
            if (towerLevelEl) towerLevelEl.textContent = progressManager.currentTowerLevel;
            if (towerProgressEl) towerProgressEl.textContent = `${progressManager.monstersDefeated}/${progressManager.monstersPerLevel}`;
            if (towerProgressBarEl) towerProgressBarEl.style.width = `${progressManager.getLevelProgressPercentage()}%`;
            
            // Update monster information if there's a monster
            if (monster) {
                if (enemyNameEl) enemyNameEl.textContent = monster.name;
                if (enemyHealthEl) enemyHealthEl.textContent = `${Math.max(0, Math.floor(monster.health))}/${monster.maxHealth}`;
                if (enemyHealthBarEl) enemyHealthBarEl.style.width = `${monster.getHealthPercentage()}%`;
                
                // Apply monster health bar color
                if (enemyHealthBarEl) {
                    if (monster.getHealthPercentage() < 25) {
                        enemyHealthBarEl.className = 'health-bar-fill critical';
                    } else if (monster.getHealthPercentage() < 60) {
                        enemyHealthBarEl.className = 'health-bar-fill warning';
                    } else {
                        enemyHealthBarEl.className = 'health-bar-fill';
                    }
                }
                
                if (enemyLevelEl) enemyLevelEl.textContent = monster.level;
            }
            
            // Update action buttons based on player skills
            updateActionButtons();
        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    // Update action buttons based on player skills
    function updateActionButtons() {
        if (!actionButtonsEl || !player || !player.skills) return;
        
        try {
            actionButtonsEl.innerHTML = '';
            
            // Add skill buttons
            player.skills.forEach((skill, index) => {
                const button = document.createElement('button');
                button.className = 'action-button';
                button.textContent = skill.name;
                button.disabled = player.mana < skill.manaCost;
                
                // Add tooltip with skill information
                button.title = `${skill.description}\nDamage: ${skill.damage}\nMana Cost: ${skill.manaCost}`;
                
                button.addEventListener('click', () => useSkill(index));
                actionButtonsEl.appendChild(button);
            });
            
            // Add shop button
            const shopButton = document.createElement('button');
            shopButton.className = 'shop-button';
            shopButton.textContent = '🛒 Shop';
            shopButton.addEventListener('click', openShop);
            actionButtonsEl.appendChild(shopButton);
        } catch (error) {
            console.error('Error updating action buttons:', error);
        }
    }

    // Use a skill on the monster
    function useSkill(skillIndex) {
        if (gameState !== 'playing') return;
        
        try {
            const result = player.useSkill(skillIndex, monster, skillsManager);
            
            if (!result.success) {
                log(result.message, 'error');
                return;
            }
            
            log(`You cast ${result.skill.name} and dealt ${result.damage} damage to ${monster.name}.`, 'player-action');
            
            if (result.killed) {
                handleMonsterDefeat();
            } else {
                // Monster attacks back
                const monsterAttackResult = player.takeDamage(monster.attack);
                
                if (monsterAttackResult.dodged) {
                    log(`You dodged ${monster.name}'s attack!`, 'success');
                } else {
                    log(`${monster.name} attacks you for ${monsterAttackResult.damage} damage.`, 'monster-action');
                    
                    if (monsterAttackResult.died) {
                        handlePlayerDefeat();
                    }
                }
            }
            
            updateUI();
        } catch (error) {
            console.error('Error using skill:', error);
            log('Error using skill. See console for details.', 'error');
        }
    }

    // Handle monster defeat
    function handleMonsterDefeat() {
        try {
            // Award XP, gold, and score
            player.gainXP(monster.xpReward);
            player.gainGold(monster.goldReward);
            player.gainScore(monster.scoreReward);
            
            log(`${monster.name} defeated!`, 'success');
            log(`You gained ${monster.xpReward} XP, ${monster.goldReward} gold, and ${monster.scoreReward} score.`, 'reward');
            
            // Check if player leveled up
            if (player.checkLevelUp()) {
                log(`You leveled up to Level ${player.level}!`, 'level-up');
                log(`Your max health increased to ${player.maxHealth} and max mana increased to ${player.maxMana}.`, 'level-up');
                
                // Randomly upgrade a skill if possible
                const skillIndex = Math.floor(Math.random() * player.skills.length);
                if (player.upgradeSkill(skillIndex, skillsManager)) {
                    const upgradedSkill = player.skills[skillIndex];
                    log(`Your skill upgraded to ${upgradedSkill.name}!`, 'upgrade');
                }
            }
            
            // Update progress and check for tower level advancement
            const progressResult = progressManager.recordMonsterDefeat(monster);
            
            if (progressResult.advanced) {
                player.advanceTowerLevel();
                player.fullHeal();
                
                log(`You've reached tower level ${progressResult.newLevel}!`, 'tower-advance');
                
                if (progressResult.isBossLevel) {
                    log('A powerful boss awaits on this level!', 'warning');
                }
            } else if (progressResult.completed) {
                log('Congratulations! You have conquered the Mage Tower!', 'success');
                handleGameComplete();
                return;
            }
            
            // Save player state
            saveGame();
            
            // Spawn a new monster
            spawnMonster();
        } catch (error) {
            console.error('Error handling monster defeat:', error);
        }
    }

    // Handle player defeat
    function handlePlayerDefeat() {
        try {
            log('You have been defeated by the forces of the mage tower!', 'failure');
            
            // Submit highscore
            submitHighscore();
            
            // Change game state
            gameState = 'game_over';
            
            // Disable action buttons
            if (actionButtonsEl) {
                const buttons = actionButtonsEl.querySelectorAll('.action-button, .shop-button');
                buttons.forEach(button => button.disabled = true);
            }
            
            // Add restart button
            if (actionButtonsEl) {
                const restartButton = document.createElement('button');
                restartButton.className = 'restart-button';
                restartButton.textContent = 'Restart Game';
                restartButton.addEventListener('click', goToCharacterSelect);
                actionButtonsEl.appendChild(restartButton);
            }
        } catch (error) {
            console.error('Error handling player defeat:', error);
        }
    }

    // Handle game completion
    function handleGameComplete() {
        try {
            log('Congratulations! You have conquered all 50 levels of the Mage Tower!', 'success');
            log(`Final Score: ${player.score}`, 'success');
            
            // Submit highscore
            submitHighscore();
            
            // Change game state
            gameState = 'game_over';
            
            // Disable action buttons
            if (actionButtonsEl) {
                const buttons = actionButtonsEl.querySelectorAll('.action-button, .shop-button');
                buttons.forEach(button => button.disabled = true);
            }
            
            // Add restart button
            if (actionButtonsEl) {
                const restartButton = document.createElement('button');
                restartButton.className = 'restart-button';
                restartButton.textContent = 'Play Again';
                restartButton.addEventListener('click', goToCharacterSelect);
                actionButtonsEl.appendChild(restartButton);
            }
        } catch (error) {
            console.error('Error handling game complete:', error);
        }
    }

    // Spawn a new monster
    function spawnMonster() {
        try {
            monster = new Monster(progressManager.currentTowerLevel);
            
            // Check if it's a boss
            if (progressManager.isBossLevel()) {
                log(`A powerful ${monster.name} appears on level ${progressManager.currentTowerLevel}!`, 'warning');
            } else {
                log(`You encounter a ${monster.name} on level ${progressManager.currentTowerLevel}.`, 'info');
            }
            
            updateUI();
        } catch (error) {
            console.error('Error spawning monster:', error);
            log('Error spawning monster. Trying again...', 'error');
            
            // Attempt to recreate the Monster class if it's missing
            if (typeof Monster !== 'function') {
                window.Monster = function(level) {
                    this.level = level || 1;
                    this.name = ["Goblin", "Slime", "Bat", "Rat", "Spider"][Math.floor(Math.random() * 5)];
                    this.maxHealth = 30 + (level * 5);
                    this.health = this.maxHealth;
                    this.attack = 5 + level;
                    this.xpReward = 10 + (level * 1.5);
                    this.goldReward = 5 + (level * 1.5);
                    this.scoreReward = 100 + (level * 10);
                    
                    this.getHealthPercentage = function() {
                        return Math.max(0, Math.min(100, Math.floor((this.health / this.maxHealth) * 100)));
                    };
                    
                    this.takeDamage = function(amount) {
                        this.health -= amount;
                        return this.health <= 0;
                    };
                };
                
                // Try again
                monster = new Monster(progressManager.currentTowerLevel);
                log(`You encounter a ${monster.name} on level ${progressManager.currentTowerLevel}.`, 'info');
                updateUI();
            }
        }
    }

    // Shop functions
    function openShop() {
        try {
            gameState = 'shop';
            if (gameContainer) gameContainer.style.display = 'none';
            if (shopEl) {
                shopEl.style.display = 'block';
                
                // Make sure shop sections exist
                const shopSections = document.createElement('div');
                shopSections.innerHTML = `
                    <div class="shop-section">
                        <h3>Potions</h3>
                        <div id="potions-container" class="shop-items"></div>
                    </div>
                    <div class="shop-section">
                        <h3>Equipment</h3>
                        <div id="equipment-container" class="shop-items"></div>
                    </div>
                    <div class="shop-section">
                        <h3>Skills</h3>
                        <div id="skills-container" class="shop-items"></div>
                    </div>
                `;
                
                // Add shop sections if they don't exist
                if (!getElement('potions-container')) {
                    const shopSectionsContainer = getElement('shop-sections');
                    if (shopSectionsContainer) {
                        shopSectionsContainer.innerHTML = shopSections.innerHTML;
                    } else {
                        // If shop-sections doesn't exist, add directly to shop-container
                        const shopContainer = getElement('shop-container');
                        if (shopContainer) {
                            // Find shop-header
                            const shopHeader = shopContainer.querySelector('.shop-header');
                            if (shopHeader) {
                                // Insert after shop-header
                                shopHeader.insertAdjacentHTML('afterend', shopSections.innerHTML);
                            } else {
                                // Just append to shop-container
                                shopContainer.appendChild(shopSections);
                            }
                        }
                    }
                }
                
                // Populate shop items
                populateShop();
                
                // Update shop player gold
                const shopPlayerGold = getElement('shop-player-gold');
                if (shopPlayerGold) shopPlayerGold.textContent = player.gold;
                
                // Make sure close button works
                const closeShopButton = getElement('close-shop');
                if (closeShopButton) {
                    closeShopButton.onclick = closeShop;
                }
            }
        } catch (error) {
            console.error('Error opening shop:', error);
            alert('Error opening shop. Please try again.');
        }
    }

    function closeShop() {
        try {
            gameState = 'playing';
            if (gameContainer) gameContainer.style.display = 'flex';
            if (shopEl) shopEl.style.display = 'none';
            
            updateUI();
        } catch (error) {
            console.error('Error closing shop:', error);
        }
    }

    function populateShop() {
        try {
            const potionsContainer = getElement('potions-container');
            const equipmentContainer = getElement('equipment-container');
            const skillsContainer = getElement('skills-container');
            
            // Clear containers
            if (potionsContainer) potionsContainer.innerHTML = '';
            if (equipmentContainer) equipmentContainer.innerHTML = '';
            if (skillsContainer) skillsContainer.innerHTML = '';
            
            // Make sure shop is initialized
            if (!shop || !shop.items) {
                shop = new Shop(skillsManager);
            }
            
            // Populate potions
            if (potionsContainer && shop.items && shop.items.potions) {
                shop.items.potions.forEach(item => {
                    const itemEl = createShopItemElement(item);
                    potionsContainer.appendChild(itemEl);
                });
            }
            
            // Populate equipment
            if (equipmentContainer && shop.items && shop.items.equipment) {
                shop.items.equipment.forEach(item => {
                    const itemEl = createShopItemElement(item);
                    equipmentContainer.appendChild(itemEl);
                });
            }
            
            // Populate available skills
            if (skillsContainer && player) {
                const availableSkills = shop.getAvailableSkills(player);
                availableSkills.forEach(item => {
                    const itemEl = createShopItemElement(item);
                    skillsContainer.appendChild(itemEl);
                });
            }
        } catch (error) {
            console.error('Error populating shop:', error);
        }
    }

    function createShopItemElement(item) {
        try {
            const itemEl = document.createElement('div');
            itemEl.className = 'shop-item';
            
            const nameEl = document.createElement('div');
            nameEl.className = 'item-name';
            nameEl.textContent = item.name;
            
            const descEl = document.createElement('div');
            descEl.className = 'item-description';
            descEl.textContent = item.description;
            
            const priceEl = document.createElement('div');
            priceEl.className = 'item-price';
            priceEl.textContent = `${item.price} gold`;
            
            const buyButton = document.createElement('button');
            buyButton.className = 'buy-button';
            buyButton.textContent = 'Buy';
            buyButton.disabled = player && player.gold < item.price;
            buyButton.addEventListener('click', () => purchaseItem(item.id));
            
            itemEl.appendChild(nameEl);
            itemEl.appendChild(descEl);
            itemEl.appendChild(priceEl);
            itemEl.appendChild(buyButton);
            
            return itemEl;
        } catch (error) {
            console.error('Error creating shop item:', error);
            return document.createElement('div');
        }
    }

    function purchaseItem(itemId) {
        try {
            if (!player || !shop) return;
            
            const result = shop.purchaseItem(player, itemId);
            
            if (result.success) {
                // Update player gold display
                const shopPlayerGold = getElement('shop-player-gold');
                if (shopPlayerGold) shopPlayerGold.textContent = player.gold;
                
                // Disable buy buttons if player doesn't have enough gold
                if (shopEl) {
                    const buyButtons = shopEl.querySelectorAll('.buy-button');
                    buyButtons.forEach(button => {
                        const priceText = button.previousElementSibling.textContent;
                        const price = parseInt(priceText.replace(/[^0-9]/g, ''));
                        button.disabled = player.gold < price;
                    });
                }
                
                // Show purchase message
                const messageEl = getElement('shop-message');
                if (messageEl) {
                    messageEl.textContent = result.message;
                    messageEl.style.color = '#4CAF50';
                }
                
                // Save game
                saveGame();
            } else {
                // Show error message
                const messageEl = getElement('shop-message');
                if (messageEl) {
                    messageEl.textContent = result.message;
                    messageEl.style.color = '#F44336';
                }
            }
        } catch (error) {
            console.error('Error purchasing item:', error);
        }
    }

    // Data management functions
    async function submitHighscore() {
        if (!player || !player.id) {
            log('Could not submit highscore. Player not saved.', 'error');
            return;
        }
        
        try {
            const result = await playerManager.submitHighscore(player);
            if (result) {
                log(`Highscore of ${player.score} submitted!`, 'success');
                
                // Refresh highscore table
                loadHighscores();
            }
        } catch (error) {
            console.error('Error submitting highscore:', error);
            log('Failed to submit highscore.', 'error');
        }
    }

    async function saveGame() {
        if (!player) return;
        
        try {
            const savedPlayer = await playerManager.savePlayerCharacter(player);
            if (savedPlayer) {
                player = savedPlayer;
                console.log('Game saved successfully');
            }
        } catch (error) {
            console.error('Error saving game:', error);
        }
    }

    async function loadHighscores() {
        if (!highscoreTableEl) return;
        
        try {
            console.log('Loading highscores...');
            const highscores = await playerManager.getHighscores(10);
            console.log(`Loaded ${highscores.length} highscores`);
            
            // Clear highscore table
            highscoreTableEl.innerHTML = '';
            
            // Create header row
            const headerRow = document.createElement('tr');
            ['Rank', 'Player', 'Character', 'Score', 'Date'].forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            highscoreTableEl.appendChild(headerRow);
            
            // Add highscore rows
            highscores.forEach((score, index) => {
                const row = document.createElement('tr');
                
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                
                const playerCell = document.createElement('td');
                playerCell.textContent = score.playerName || 'Unknown';
                
                const characterCell = document.createElement('td');
                characterCell.textContent = score.characterName || 'Unknown';
                
                const scoreCell = document.createElement('td');
                scoreCell.textContent = score.score;
                
                const dateCell = document.createElement('td');
                dateCell.textContent = score.date instanceof Date ? 
                    score.date.toLocaleDateString() : 
                    new Date(score.date).toLocaleDateString();
                
                row.appendChild(rankCell);
                row.appendChild(playerCell);
                row.appendChild(characterCell);
                row.appendChild(scoreCell);
                row.appendChild(dateCell);
                
                highscoreTableEl.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading highscores:', error);
            if (highscoreTableEl) {
                highscoreTableEl.innerHTML = '<tr><td colspan="5">Failed to load highscores</td></tr>';
            }
        }
    }

    // CHARACTER MANAGEMENT FUNCTIONS

    // Show character selection screen
    async function showCharacterSelect() {
        try {
            console.log('Showing character selection screen');
            gameState = 'character_select';
            
            // Hide game/shop panels, show character select
            if (gameContainer) gameContainer.style.display = 'none';
            if (shopEl) shopEl.style.display = 'none';
            if (characterSelectEl) characterSelectEl.style.display = 'block';
            
            // Load and display characters
            await loadAndDisplayCharacters();
            
            // Load highscores
            await loadHighscores();
        } catch (error) {
            console.error('Error showing character select:', error);
        }
    }

    // Load and display characters
    async function loadAndDisplayCharacters() {
        if (!characterListEl) {
            console.error('Character list element not found');
            return;
        }
        
        try {
            console.log('Loading characters...');
            
            // Create "Create New Character" element
            const createCharEl = document.createElement('div');
            createCharEl.className = 'character-item create-new';
            createCharEl.innerHTML = `
                <div class="character-name">Create New Character</div>
                <div class="create-form">
                    <input type="text" id="new-char-name" placeholder="Character Name" required maxlength="20">
                    <button id="create-char-btn">Create Character</button>
                </div>
            `;
            
            // Clear character list and add create option
            characterListEl.innerHTML = '';
            characterListEl.appendChild(createCharEl);
            
            // Add event listener for create button
            const createCharBtn = getElement('create-char-btn');
            if (createCharBtn) {
                createCharBtn.addEventListener('click', function() {
                    const nameInput = getElement('new-char-name');
                    if (nameInput && nameInput.value.trim()) {
                        createCharacter(nameInput.value.trim());
                    } else {
                        alert('Please enter a character name');
                    }
                });
            }
            
            // Load existing characters
            const characters = await playerManager.getPlayerCharacters();
            console.log(`Loaded ${characters.length} characters`);
            
            // Display existing characters
            if (characters && characters.length > 0) {
                characters.forEach(character => {
                    const charEl = document.createElement('div');
                    charEl.className = 'character-item';
                    charEl.innerHTML = `
                        <div class="character-name">${character.name}</div>
                        <div class="character-info">Level ${character.level} ${character.characterClass} - Tower Level ${character.towerLevel}</div>
                    `;
                    
                    // Add buttons
                    const buttonsDiv = document.createElement('div');
                    buttonsDiv.style.display = 'flex';
                    buttonsDiv.style.gap = '10px';
                    buttonsDiv.style.marginTop = '10px';
                    
                    const selectButton = document.createElement('button');
                    selectButton.textContent = 'Select';
                    selectButton.className = 'select-button';
                    selectButton.style.flex = '1';
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete-button';
                    deleteButton.style.flex = '1';
                    
                    buttonsDiv.appendChild(selectButton);
                    buttonsDiv.appendChild(deleteButton);
                    charEl.appendChild(buttonsDiv);
                    
                    // Add event listeners
                    selectButton.addEventListener('click', () => startGameWithCharacter(character));
                    deleteButton.addEventListener('click', () => deleteCharacter(character.id));
                    
                    // Insert before create new option
                    characterListEl.insertBefore(charEl, createCharEl);
                });
            }
        } catch (error) {
            console.error('Error loading and displaying characters:', error);
        }
    }

    // Create a new character
    async function createCharacter(name) {
        if (!name || name.trim() === '') {
            alert('Please enter a character name');
            return;
        }
        
        try {
            console.log(`Creating new character: ${name}`);
            // Create new player
            const newPlayer = new Player(name.trim());
            
            // Initialize skills
            newPlayer.initializeSkills(skillsManager);
            
            // Save to database
            const savedPlayer = await playerManager.savePlayerCharacter(newPlayer);
            
            if (savedPlayer) {
                console.log('Character saved successfully');
                alert(`Character "${name}" created successfully!`);
                // Refresh character selection to show new character
                await loadAndDisplayCharacters();
            } else {
                alert('Failed to create character. Please try again.');
            }
        } catch (error) {
            console.error('Error creating character:', error);
            alert('Failed to create character: ' + error.message);
        }
    }

    // Delete a character
    async function deleteCharacter(characterId) {
        if (!confirm('Are you sure you want to delete this character? This cannot be undone.')) {
            return;
        }
        
        try {
            console.log(`Deleting character: ${characterId}`);
            
            const success = await playerManager.deletePlayerCharacter(characterId);
            
            if (success) {
                console.log('Character deleted successfully');
                alert('Character deleted successfully.');
                // Refresh character selection
                await loadAndDisplayCharacters();
            } else {
                alert('Failed to delete character. Please try again.');
            }
        } catch (error) {
            console.error('Error deleting character:', error);
            alert(`Error deleting character: ${error.message}`);
        }
    }

    // Start the game with a selected character
    async function startGameWithCharacter(character) {
        try {
            console.log(`Starting game with character: ${character.name}`);
            
            // Set the player
            player = character;
            
            // Initialize skills if needed
            if (!player.skills || player.skills.length === 0) {
                player.initializeSkills(skillsManager);
            }
            
            // Set progress manager to match player's tower level
            progressManager.currentTowerLevel = player.towerLevel || 1;
            progressManager.monstersDefeated = 0;
            
            // Change game state
            gameState = 'playing';
            
            // Hide character select, show game container
            if (characterSelectEl) characterSelectEl.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'flex';
            
            // Clear the log
            if (logEl) logEl.innerHTML = '';
            
            // Spawn first monster
            log(`Welcome, ${player.name}! Your adventure begins on tower level ${player.towerLevel}.`, 'info');
            spawnMonster();
            
            // Update UI
            updateUI();
        } catch (error) {
            console.error('Error starting game with character:', error);
            alert(`Error starting game: ${error.message}`);
        }
    }

    // Return to character select from game
    function goToCharacterSelect() {
        // Reset game state
        player = null;
        monster = null;
        gameState = 'character_select';
        
        // Show character select screen
        showCharacterSelect();
    }

    // Game initialization
    async function initGame() {
        try {
            console.log('Initializing game...');
            
            // Set up the close shop button
            const closeShopButton = getElement('close-shop');
            if (closeShopButton) {
                closeShopButton.addEventListener('click', closeShop);
            }
            
            // Check if user is logged in
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            
            if (error || !user) {
                console.log('No user logged in');
                const authFormContainer = getElement('auth-form-container');
                if (authFormContainer) authFormContainer.style.display = 'block';
                return;
            }
            
            console.log(`User is logged in: ${user.email}`);
            
            // Show character select screen
            await showCharacterSelect();
            
            // Check if there's a selected character in localStorage
            const selectedCharacterId = localStorage.getItem('selectedCharacterId');
            if (selectedCharacterId) {
                console.log(`Found selected character ID in localStorage: ${selectedCharacterId}`);
                try {
                    const character = await playerManager.getCharacterById(selectedCharacterId);
                    if (character) {
                        console.log(`Auto-selecting character: ${character.name}`);
                        startGameWithCharacter(character);
                        return;
                    }
                } catch (e) {
                    console.error('Error loading selected character:', e);
                }
            }
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }

    // Custom event listener for gameStart event (for use by other scripts)
    document.addEventListener('gameStart', function(e) {
        if (e.detail && e.detail.characterId) {
            console.log(`Game start event received for character: ${e.detail.characterId}`);
            playerManager.getCharacterById(e.detail.characterId)
                .then(character => {
                    if (character) {
                        startGameWithCharacter(character);
                    }
                })
                .catch(error => {
                    console.error('Error loading character from event:', error);
                });
        }
    });

    // Start the game
    initGame();
});