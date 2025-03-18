// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded in game.js');
    
    // Get Supabase credentials from global scope
    const SUPABASE_URL = window.SUPABASE_URL || 'https://lhkvzwsdidulwulghebk.supabase.co';
    const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3Z6d3NkaWR1bHd1bGdoZWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTQ5OTksImV4cCI6MjA1Njc5MDk5OX0.lz3Pch5hBBO2Ug_iI5f2jMGV4Xwqt8t4RcPrn4_EzPw';

    // Create Supabase client
    console.log('Creating Supabase client...');
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client created');

    // Check if the required classes are available
    if (typeof SkillsManager !== 'function') {
        console.error('SkillsManager class is not defined. Check that skills.js is loaded properly.');
        return;
    }

    if (typeof Monster !== 'function') {
        console.error('Monster class is not defined. Check that monster.js is loaded properly.');
        return;
    }

    if (typeof ProgressManager !== 'function') {
        console.error('ProgressManager class is not defined. Check that progress.js is loaded properly.');
        return;
    }

    if (typeof Player !== 'function' || typeof PlayerManager !== 'function') {
        console.error('Player/PlayerManager classes are not defined. Check that player.js is loaded properly.');
        return;
    }

    if (typeof Shop !== 'function') {
        console.error('Shop class is not defined. Check that shop.js is loaded properly.');
        return;
    }

    // Initialize game managers
    console.log('Initializing game managers...');
    const skillsManager = new SkillsManager();
    const playerManager = new PlayerManager(supabaseClient);
    const progressManager = new ProgressManager();
    const shop = new Shop(skillsManager);

    // Game state
    let player = null;
    let monster = null;
    let gameState = 'character_select'; // character_select, playing, game_over, shop

    // Safely get DOM elements with error checking
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
            return null;
        }
        return element;
    }

    // DOM elements
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

    // Log function
    function log(message, type = 'info') {
        if (!logEl) return;
        
        const p = document.createElement('p');
        p.textContent = message;
        p.className = `log-${type}`;
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // Update game UI
    function updateUI() {
        if (!player) return;
        
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
    }

    // Update action buttons based on player skills
    function updateActionButtons() {
        if (!actionButtonsEl) return;
        
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
    }

    // Use a skill on the monster
    function useSkill(skillIndex) {
        if (gameState !== 'playing') return;
        
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
    }

    // Handle monster defeat
    function handleMonsterDefeat() {
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
    }

    // Handle player defeat
    function handlePlayerDefeat() {
        log('You have been defeated by the forces of the mage tower!', 'failure');
        
        // Submit highscore
        submitHighscore();
        
        // Change game state
        gameState = 'game_over';
        
        // Disable action buttons
        if (actionButtonsEl) {
            const buttons = actionButtonsEl.querySelectorAll('button');
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
    }

    // Handle game completion
    function handleGameComplete() {
        log('You have conquered all 50 levels of the Mage Tower!', 'success');
        log(`Final Score: ${player.score}`, 'success');
        
        // Submit highscore
        submitHighscore();
        
        // Change game state
        gameState = 'game_over';
        
        // Disable action buttons
        if (actionButtonsEl) {
            const buttons = actionButtonsEl.querySelectorAll('button');
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
    }

    // Spawn a new monster
    function spawnMonster() {
        monster = new Monster(progressManager.currentTowerLevel);
        
        // Check if it's a boss
        if (progressManager.isBossLevel()) {
            log(`A powerful ${monster.name} appears on level ${progressManager.currentTowerLevel}!`, 'warning');
        } else {
            log(`You encounter a ${monster.name} on level ${progressManager.currentTowerLevel}.`, 'info');
        }
        
        updateUI();
    }

    // Open the shop
    function openShop() {
        gameState = 'shop';
        if (gameContainer) gameContainer.style.display = 'none';
        if (shopEl) shopEl.style.display = 'block';
        
        // Populate shop items
        populateShop();
    }

    // Close the shop
    function closeShop() {
        gameState = 'playing';
        if (gameContainer) gameContainer.style.display = 'flex';
        if (shopEl) shopEl.style.display = 'none';
        
        updateUI();
    }

    // Populate shop items
    function populateShop() {
        const potionsContainer = getElement('potions-container');
        const equipmentContainer = getElement('equipment-container');
        const skillsContainer = getElement('skills-container');
        
        // Clear containers
        if (potionsContainer) potionsContainer.innerHTML = '';
        if (equipmentContainer) equipmentContainer.innerHTML = '';
        if (skillsContainer) skillsContainer.innerHTML = '';
        
        // Populate potions
        if (potionsContainer) {
            shop.items.potions.forEach(item => {
                const itemEl = createShopItemElement(item);
                potionsContainer.appendChild(itemEl);
            });
        }
        
        // Populate equipment
        if (equipmentContainer) {
            shop.items.equipment.forEach(item => {
                const itemEl = createShopItemElement(item);
                equipmentContainer.appendChild(itemEl);
            });
        }
        
        // Populate available skills
        if (skillsContainer) {
            const availableSkills = shop.getAvailableSkills(player);
            availableSkills.forEach(item => {
                const itemEl = createShopItemElement(item);
                skillsContainer.appendChild(itemEl);
            });
        }
        
        // Update player gold display in shop
        const shopPlayerGold = getElement('shop-player-gold');
        if (shopPlayerGold) shopPlayerGold.textContent = player.gold;
    }

    // Create a shop item element
    function createShopItemElement(item) {
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
        buyButton.disabled = player.gold < item.price;
        buyButton.addEventListener('click', () => purchaseItem(item.id));
        
        itemEl.appendChild(nameEl);
        itemEl.appendChild(descEl);
        itemEl.appendChild(priceEl);
        itemEl.appendChild(buyButton);
        
        return itemEl;
    }

    // Purchase an item from the shop
    function purchaseItem(itemId) {
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
    }

    // Submit highscore
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

    // Save game
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

    // Load highscores
    async function loadHighscores() {
        if (!highscoreTableEl) return;
        
        try {
            console.log('Loading highscores...');
            const highscores = await playerManager.getHighscores();
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
                playerCell.textContent = score.playerName;
                
                const characterCell = document.createElement('td');
                characterCell.textContent = score.characterName;
                
                const scoreCell = document.createElement('td');
                scoreCell.textContent = score.score;
                
                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(score.date).toLocaleDateString();
                
                row.appendChild(rankCell);
                row.appendChild(playerCell);
                row.appendChild(characterCell);
                row.appendChild(scoreCell);
                row.appendChild(dateCell);
                
                highscoreTableEl.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading highscores:', error);
            highscoreTableEl.innerHTML = '<tr><td colspan="5">Failed to load highscores</td></tr>';
        }
    }

    // Show character selection
    async function showCharacterSelect() {
        try {
            console.log('Showing character selection screen');
            gameState = 'character_select';
            
            // Hide game and shop, show character select
            if (gameContainer) gameContainer.style.display = 'none';
            if (shopEl) shopEl.style.display = 'none';
            if (characterSelectEl) characterSelectEl.style.display = 'block';
            
            // Load existing characters
            console.log('Loading player characters');
            const characters = await playerManager.getPlayerCharacters();
            console.log(`Loaded ${characters.length} characters`);
            
            // Clear character list
            const characterListEl = getElement('character-list');
            if (!characterListEl) {
                console.error('Character list element not found');
                return;
            }
            
            characterListEl.innerHTML = '';
            
            // Create a test character if no characters exist
            if (characters.length === 0) {
                console.log('No characters found, creating test character option');
                
                const charEl = document.createElement('div');
                charEl.className = 'character-item';
                
                const nameEl = document.createElement('div');
                nameEl.className = 'character-name';
                nameEl.textContent = 'Create Your First Character';
                
                const infoEl = document.createElement('div');
                infoEl.className = 'character-info';
                infoEl.textContent = 'Start your adventure in the Mage Tower';
                
                charEl.appendChild(nameEl);
                charEl.appendChild(infoEl);
                
                characterListEl.appendChild(charEl);
            } else {
                // Add existing characters
                characters.forEach(character => {
                    const charEl = document.createElement('div');
                    charEl.className = 'character-item';
                    
                    const nameEl = document.createElement('div');
                    nameEl.className = 'character-name';
                    nameEl.textContent = character.name;
                    
                    const infoEl = document.createElement('div');
                    infoEl.className = 'character-info';
                    infoEl.textContent = `Level ${character.level} ${character.characterClass} - Tower Level ${character.towerLevel}`;
                    
                    const selectButton = document.createElement('button');
                    selectButton.textContent = 'Select';
                    selectButton.addEventListener('click', () => selectCharacter(character));
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete-button';
                    deleteButton.addEventListener('click', () => deleteCharacter(character.id));
                    
                    charEl.appendChild(nameEl);
                    charEl.appendChild(infoEl);
                    charEl.appendChild(selectButton);
                    charEl.appendChild(deleteButton);
                    
                    characterListEl.appendChild(charEl);
                });
            }
            
            // Add "Create New" option if less than 3 characters
            if (characters.length < 3) {
                const createEl = document.createElement('div');
                createEl.className = 'character-item create-new';
                
                const headingEl = document.createElement('div');
                headingEl.className = 'character-name';
                headingEl.textContent = 'Create New Character';
                
                const formEl = document.createElement('div');
                formEl.className = 'create-form';
                
                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.placeholder = 'Character Name';
                nameInput.required = true;
                nameInput.maxLength = 20;
                
                const createButton = document.createElement('button');
                createButton.textContent = 'Create';
                createButton.addEventListener('click', () => createCharacter(nameInput.value));
                
                formEl.appendChild(nameInput);
                formEl.appendChild(createButton);
                
                createEl.appendChild(headingEl);
                createEl.appendChild(formEl);
                
                characterListEl.appendChild(createEl);
            }
            
            // Load highscores
            loadHighscores();
        } catch (error) {
            console.error('Error showing character selection:', error);
        }
    }

    // Select a character
    function selectCharacter(character) {
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
                // Refresh character selection
                showCharacterSelect();
            }
        } catch (error) {
            console.error('Error creating character:', error);
            alert('Failed to create character');
        }
    }

    // Delete a character
    async function deleteCharacter(playerId) {
        if (!confirm('Are you sure you want to delete this character? This cannot be undone.')) {
            return;
        }
        
        try {
            console.log(`Deleting character with ID: ${playerId}`);
            const result = await playerManager.deletePlayerCharacter(playerId);
            
            if (result) {
                console.log('Character deleted successfully');
                // Refresh character selection
                showCharacterSelect();
            }
        } catch (error) {
            console.error('Error deleting character:', error);
            alert('Failed to delete character');
        }
    }

    // Go to character select
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
    }

    // Initialize the game
    async function initGame() {
        try {
            console.log('Game initialization started');
            
            // Initialize event listeners
            initEventListeners();
            
            // Show character selection
            await showCharacterSelect();
            
            console.log('Game initialization completed');
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }

    // Start the game
    initGame();
});