// Fully rewritten game.js with improved functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Game script loaded!');
    
    // Get Supabase credentials from global scope
    const SUPABASE_URL = window.SUPABASE_URL || 'https://lhkvzwsdidulwulghebk.supabase.co';
    const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3Z6d3NkaWR1bHd1bGdoZWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTQ5OTksImV4cCI6MjA1Njc5MDk5OX0.lz3Pch5hBBO2Ug_iI5f2jMGV4Xwqt8t4RcPrn4_EzPw';

    // Create Supabase client
    console.log('Creating Supabase client...');
    let supabaseClient;
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase client created');
    } catch (error) {
        console.error('Failed to create Supabase client:', error);
        alert('Failed to connect to the game server. Please refresh the page and try again.');
        return;
    }

    // Check for required classes
    const requiredClasses = ['SkillsManager', 'Monster', 'ProgressManager', 'Player', 'PlayerManager', 'Shop'];
    let missingClasses = [];
    
    for (const className of requiredClasses) {
        if (typeof window[className] !== 'function') {
            console.error(`${className} class is not defined.`);
            missingClasses.push(className);
        }
    }
    
    if (missingClasses.length > 0) {
        console.error(`Critical classes missing: ${missingClasses.join(', ')}. Game cannot start.`);
        alert(`Some game modules failed to load. Please refresh the page and try again.`);
        return;
    }

    // Initialize game managers
    console.log('Initializing game managers...');
    let skillsManager, playerManager, progressManager, shop;
    
    try {
        skillsManager = new SkillsManager();
        playerManager = new PlayerManager(supabaseClient);
        progressManager = new ProgressManager();
        shop = new Shop(skillsManager);
        console.log('Game managers initialized');
    } catch (error) {
        console.error('Error initializing game managers:', error);
        alert('Failed to initialize game. Please refresh the page and try again.');
        return;
    }

    // Game state
    let player = null;
    let monster = null;
    let gameState = 'character_select'; // character_select, playing, game_over, shop

    // DOM elements with error handling
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
            return null;
        }
        return element;
    }

    // Get DOM elements
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
    const authFormContainer = getElement('auth-form-container');

    // Add logout button to character select screen
    function addLogoutButton() {
        // Check if logout button already exists
        if (document.getElementById('logout-button')) {
            return;
        }
        
        // Create logout button
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-button';
        logoutButton.className = 'logout-button';
        logoutButton.textContent = 'Logout';
        logoutButton.style.position = 'absolute';
        logoutButton.style.top = '15px';
        logoutButton.style.right = '15px';
        logoutButton.style.backgroundColor = '#F44336';
        logoutButton.style.color = 'white';
        logoutButton.style.padding = '8px 15px';
        logoutButton.style.border = 'none';
        logoutButton.style.borderRadius = '5px';
        logoutButton.style.cursor = 'pointer';
        logoutButton.style.zIndex = '1000';
        
        // Add event listener
        logoutButton.addEventListener('click', handleLogout);
        
        // Add to character select
        if (characterSelectEl) {
            characterSelectEl.style.position = 'relative';
            characterSelectEl.appendChild(logoutButton);
        } else {
            // Add to body if character select not found
            document.body.appendChild(logoutButton);
        }
        
        console.log('Logout button added');
    }
    
    // Handle logout
    async function handleLogout() {
        try {
            if (confirm('Are you sure you want to logout?')) {
                console.log('Logging out...');
                const { error } = await supabaseClient.auth.signOut();
                
                if (error) {
                    console.error('Error during logout:', error);
                    alert('Error during logout. Please try again.');
                    return;
                }
                
                console.log('Logged out successfully');
                // Reset game state
                player = null;
                monster = null;
                gameState = 'character_select';
                
                // Show auth form, hide other containers
                if (authFormContainer) authFormContainer.style.display = 'block';
                if (characterSelectEl) characterSelectEl.style.display = 'none';
                if (gameContainer) gameContainer.style.display = 'none';
                if (shopEl) shopEl.style.display = 'none';
                
                // Clear any stored data
                localStorage.removeItem('selectedCharacterId');
                
                alert('Logged out successfully.');
                
                // Reload page to reset everything
                window.location.reload();
            }
        } catch (error) {
            console.error('Exception during logout:', error);
            alert('Error during logout. Please try again.');
        }
    }

    // Log function
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

    // Update game UI - made more robust
    function updateUI() {
        if (!player) return;
        
        try {
            // Update player stats
            if (playerNameEl) playerNameEl.textContent = player.name;
            if (playerHealthEl) playerHealthEl.textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
            if (playerHealthBarEl) playerHealthBarEl.style.width = `${player.getHealthPercentage()}%`;
            
            // Apply health bar color based on percentage
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
            
            // Add logout button to game screen too
            const gameLogoutBtn = document.createElement('button');
            gameLogoutBtn.className = 'logout-button';
            gameLogoutBtn.textContent = '🚪 Logout';
            gameLogoutBtn.style.backgroundColor = '#F44336';
            gameLogoutBtn.addEventListener('click', handleLogout);
            actionButtonsEl.appendChild(gameLogoutBtn);
        } catch (error) {
            console.error('Error updating action buttons:', error);
        }
    }

    // Basic game functions (these remain mostly unchanged)
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
        }
    }

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

    function handleGameComplete() {
        try {
            log('You have conquered all 50 levels of the Mage Tower!', 'success');
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
        }
    }

    // Shop functions (simplified)
    function openShop() {
        try {
            gameState = 'shop';
            if (gameContainer) gameContainer.style.display = 'none';
            if (shopEl) {
                shopEl.style.display = 'block';
                
                // Populate shop sections
                const shopSections = getElement('shop-sections');
                if (shopSections) {
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
                }
                
                // Populate shop items
                populateShop();
            }
        } catch (error) {
            console.error('Error opening shop:', error);
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
            
            // Populate potions
            if (potionsContainer && shop.items.potions) {
                shop.items.potions.forEach(item => {
                    const itemEl = createShopItemElement(item);
                    potionsContainer.appendChild(itemEl);
                });
            }
            
            // Populate equipment
            if (equipmentContainer && shop.items.equipment) {
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
            
            // Update player gold display in shop
            const shopPlayerGold = getElement('shop-player-gold');
            if (shopPlayerGold && player) shopPlayerGold.textContent = player.gold;
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
                        const price = parseInt(priceText);
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

    // Refresh the character list
    async function refreshCharacterList() {
        try {
            const characterListEl = document.getElementById('character-list');
            if (!characterListEl) {
                console.error('Character list element not found');
                return;
            }
            
            // Keep the create new option if it exists
            const createNewOption = characterListEl.querySelector('.create-new');
            
            // Clear the list
            characterListEl.innerHTML = '';
            
            // Add back the create new option if it existed
            if (createNewOption) {
                characterListEl.appendChild(createNewOption);
            } else {
                // Add create new option if it doesn't exist
                addCreateNewCharacterOption(characterListEl);
            }
            
            // Get characters
            const characters = await playerManager.getPlayerCharacters();
            console.log(`Found ${characters ? characters.length : 0} characters to display`);
            
            if (characters && characters.length > 0) {
                // Insert characters before the create new option
                characters.forEach(character => {
                    console.log(`Adding character to list: ${character.name} (Level ${character.level})`);
                    
                    const charEl = document.createElement('div');
                    charEl.className = 'character-item';
                    charEl.style.backgroundColor = '#444';
                    charEl.style.borderRadius = '8px';
                    charEl.style.padding = '15px';
                    charEl.style.marginBottom = '10px';
                    
                    charEl.innerHTML = `
                        <div class="character-name" style="color: #6200ea; font-weight: bold;">${character.name}</div>
                        <div class="character-info" style="color: #ccc; margin: 5px 0 10px 0;">Level ${character.level} ${character.characterClass} - Tower Level ${character.towerLevel}</div>
                        <div style="display: flex; gap: 10px;">
                            <button class="select-button" style="flex: 1; padding: 8px; background-color: #6200ea; color: white; border: none; border-radius: 5px; cursor: pointer;">Select</button>
                            <button class="delete-button" style="flex: 1; padding: 8px; background-color: #F44336; color: white; border: none; border-radius: 5px; cursor: pointer;">Delete</button>
                        </div>
                    `;
                    
                    // Insert character before create new option
                    if (createNewOption && createNewOption.parentNode === characterListEl) {
                        characterListEl.insertBefore(charEl, createNewOption);
                    } else {
                        characterListEl.appendChild(charEl);
                    }
                    
                    // Add event listeners
                    const selectButton = charEl.querySelector('.select-button');
                    const deleteButton = charEl.querySelector('.delete-button');
                    
                    if (selectButton) {
                        selectButton.addEventListener('click', () => selectCharacter(character));
                    }
                    
                    if (deleteButton) {
                        deleteButton.addEventListener('click', () => deleteCharacter(character.id));
                    }
                });
            }
        } catch (error) {
            console.error('Error refreshing character list:', error);
        }
    }
    
    // Character management - Completely rewritten for reliability
    async function showCharacterSelect() {
        try {
            console.log('Showing character selection screen');
            gameState = 'character_select';
            
            // Hide other panels
            if (gameContainer) gameContainer.style.display = 'none';
            if (shopEl) shopEl.style.display = 'none';
            if (authFormContainer) authFormContainer.style.display = 'none';
            
            // Show character select panel
            if (characterSelectEl) {
                characterSelectEl.style.display = 'block';
                console.log('Character select panel displayed');
            } else {
                console.error('Character select element not found');
                return;
            }
            
            // Add logout button
            addLogoutButton();
            
            // Refresh character list
            await refreshCharacterList();
            
            // Load highscores
            try {
                await loadHighscores();
            } catch (error) {
                console.error('Error loading highscores:', error);
            }
        } catch (error) {
            console.error('Error in showCharacterSelect:', error);
        }
    }

    function addCreateNewCharacterOption(containerEl) {
        if (!containerEl) return;
        
        try {
            const createEl = document.createElement('div');
            createEl.className = 'character-item create-new';
            createEl.style.display = 'block';
            createEl.style.backgroundColor = '#4a148c';
            createEl.style.border = '2px dashed #9c27b0';
            createEl.style.padding = '15px';
            createEl.style.margin = '10px 0';
            
            createEl.innerHTML = `
                <div class="character-name" style="color: white;">Create New Character</div>
                <div class="create-form" style="display: block; margin-top: 10px;">
                    <input type="text" id="new-char-name" placeholder="Character Name" required maxlength="20" style="width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box;">
                    <button id="create-char-btn" style="width: 100%; padding: 8px; background-color: #6200ea; color: white; border: none; border-radius: 5px; cursor: pointer;">Create Character</button>
                </div>
            `;
            
            containerEl.appendChild(createEl);
            
            // Add event listener
            const createBtn = document.getElementById('create-char-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    const nameInput = document.getElementById('new-char-name');
                    if (nameInput && nameInput.value.trim()) {
                        createCharacter(nameInput.value.trim());
                    } else {
                        alert('Please enter a character name');
                    }
                });
            }
        } catch (error) {
            console.error('Error adding create new character option:', error);
        }
    }

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
                
                // Show success message
                alert(`Character "${name}" created successfully!`);
                
                // Directly refresh the character list instead of full page refresh
                await refreshCharacterList();
            }
        } catch (error) {
            console.error('Error creating character:', error);
            alert('Failed to create character: ' + error.message);
        }
    }

    function selectCharacter(character) {
        try {
            console.log(`Selecting character: ${character.name}`);
            player = character;
            
            // Initialize skills if needed
            if (!player.skills || player.skills.length === 0) {
                console.log('Initializing skills for character');
                player.initializeSkills(skillsManager);
            }
            
            // Set progress manager to match player's tower level
            progressManager.currentTowerLevel = player.towerLevel;
            progressManager.monstersDefeated = 0;
            
            // Spawn first monster
            spawnMonster();
            
            // Change game state
            gameState = 'playing';
            
            // Show game container, hide character select
            if (characterSelectEl) characterSelectEl.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'flex';
            
            // Update UI
            updateUI();
            
            // Log game start
            log(`Welcome back, ${player.name}! Your journey continues on tower level ${player.towerLevel}.`, 'info');
        } catch (error) {
            console.error('Error selecting character:', error);
            alert(`Error selecting character: ${error.message}`);
        }
    }

    async function deleteCharacter(playerId) {
        if (!confirm('Are you sure you want to delete this character? This cannot be undone.')) {
            return;
        }
        
        try {
            console.log(`Deleting character with ID: ${playerId}`);
            const result = await playerManager.deletePlayerCharacter(playerId);
            
            if (result) {
                console.log('Character deleted successfully');
                alert('Character deleted successfully');
                // Refresh character selection
                await refreshCharacterList();
            }
        } catch (error) {
            console.error('Error deleting character:', error);
            alert('Failed to delete character: ' + error.message);
        }
    }

    function goToCharacterSelect() {
        player = null;
        monster = null;
        
        // Reset game state
        gameState = 'character_select';
        
        // Show character select screen
        showCharacterSelect();
    }

    // Initialize event listeners
    function initEventListeners() {
        console.log('Initializing event listeners');
        
        // Shop close button
        const closeShopButton = getElement('close-shop');
        if (closeShopButton) {
            closeShopButton.addEventListener('click', closeShop);
            console.log('Shop close button listener added');
        }
        
        // Emergency character creation button
        const emergencyCreateBtn = getElement('emergency-create-btn');
        if (emergencyCreateBtn) {
            emergencyCreateBtn.addEventListener('click', () => {
                const nameInput = getElement('emergency-char-name');
                if (nameInput && nameInput.value.trim()) {
                    createCharacter(nameInput.value.trim());
                } else {
                    alert('Please enter a character name');
                }
            });
        }
    }

    // Check login status
    async function checkLoginStatus() {
        try {
            console.log('Checking login status...');
            const { data, error } = await supabaseClient.auth.getUser();
            
            if (error) {
                console.error('Error checking login status:', error);
                showLoginForm();
                return;
            }
            
            if (data.user) {
                console.log('User is logged in:', data.user.email);
                // Show character selection
                await showCharacterSelect();
            } else {
                console.log('No user is logged in');
                showLoginForm();
            }
        } catch (error) {
            console.error('Exception checking login status:', error);
            showLoginForm();
        }
    }
    
    // Show login form
    function showLoginForm() {
        // Hide other containers
        if (characterSelectEl) characterSelectEl.style.display = 'none';
        if (gameContainer) gameContainer.style.display = 'none';
        if (shopEl) shopEl.style.display = 'none';
        
        // Show auth form
        if (authFormContainer) {
            authFormContainer.style.display = 'block';
            console.log('Login form displayed');
        } else {
            console.error('Auth form container not found');
        }
    }

    // Initialize the game
    async function initGame() {
        try {
            console.log('Game initialization started');
            
            // Initialize event listeners
            initEventListeners();
            
            // Check login status
            await checkLoginStatus();
            
            console.log('Game initialization completed');
        } catch (error) {
            console.error('Error initializing game:', error);
            // Show emergency UI as a fallback
            const emergencyCreator = getElement('emergency-character-creator');
            if (emergencyCreator) {
                emergencyCreator.style.display = 'block';
            }
        }
    }

    // Start the game
    initGame();
});