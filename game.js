// Get Supabase credentials from global scope
const SUPABASE_URL = window.SUPABASE_URL || 'https://lhkvzwsdidulwulghebk.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3Z6d3NkaWR1bHd1bGdoZWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTQ5OTksImV4cCI6MjA1Njc5MDk5OX0.lz3Pch5hBBO2Ug_iI5f2jMGV4Xwqt8t4RcPrn4_EzPw';

// Create Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize game managers
const skillsManager = new SkillsManager();
const playerManager = new PlayerManager(supabaseClient);
const progressManager = new ProgressManager();
const shop = new Shop(skillsManager);

// Game state
let player = null;
let monster = null;
let gameState = 'character_select'; // character_select, playing, game_over, shop

// DOM elements
const gameContainer = document.getElementById('game-container');
const playerNameEl = document.getElementById('player-name');
const playerHealthEl = document.getElementById('player-health');
const playerHealthBarEl = document.getElementById('player-health-bar');
const playerManaEl = document.getElementById('player-mana');
const playerManaBarEl = document.getElementById('player-mana-bar');
const playerLevelEl = document.getElementById('player-level');
const playerXpEl = document.getElementById('player-xp');
const playerXpBarEl = document.getElementById('player-xp-bar');
const playerGoldEl = document.getElementById('player-gold');
const playerScoreEl = document.getElementById('player-score');
const towerLevelEl = document.getElementById('tower-level');
const towerProgressEl = document.getElementById('tower-progress');
const towerProgressBarEl = document.getElementById('tower-progress-bar');
const enemyNameEl = document.getElementById('enemy-name');
const enemyHealthEl = document.getElementById('enemy-health');
const enemyHealthBarEl = document.getElementById('enemy-health-bar');
const enemyLevelEl = document.getElementById('enemy-level');
const logEl = document.getElementById('log');
const actionButtonsEl = document.getElementById('action-buttons');
const characterSelectEl = document.getElementById('character-select');
const shopEl = document.getElementById('shop-container');
const highscoreTableEl = document.getElementById('highscore-table');

// Log function
function log(message, type = 'info') {
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
    playerNameEl.textContent = player.name;
    playerHealthEl.textContent = `${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`;
    playerHealthBarEl.style.width = `${player.getHealthPercentage()}%`;
    
    // Apply health bar color based on percentage
    if (player.getHealthPercentage() < 25) {
        playerHealthBarEl.className = 'health-bar-fill critical';
    } else if (player.getHealthPercentage() < 60) {
        playerHealthBarEl.className = 'health-bar-fill warning';
    } else {
        playerHealthBarEl.className = 'health-bar-fill';
    }
    
    playerManaEl.textContent = `${Math.max(0, Math.floor(player.mana))}/${player.maxMana}`;
    playerManaBarEl.style.width = `${player.getManaPercentage()}%`;
    
    playerLevelEl.textContent = player.level;
    playerXpEl.textContent = `${player.xp}/${player.xpToNextLevel}`;
    playerXpBarEl.style.width = `${Math.floor((player.xp / player.xpToNextLevel) * 100)}%`;
    
    playerGoldEl.textContent = player.gold;
    playerScoreEl.textContent = player.score;
    
    // Update tower information
    towerLevelEl.textContent = progressManager.currentTowerLevel;
    towerProgressEl.textContent = `${progressManager.monstersDefeated}/${progressManager.monstersPerLevel}`;
    towerProgressBarEl.style.width = `${progressManager.getLevelProgressPercentage()}%`;
    
    // Update monster information if there's a monster
    if (monster) {
        enemyNameEl.textContent = monster.name;
        enemyHealthEl.textContent = `${Math.max(0, Math.floor(monster.health))}/${monster.maxHealth}`;
        enemyHealthBarEl.style.width = `${monster.getHealthPercentage()}%`;
        
        // Apply monster health bar color
        if (monster.getHealthPercentage() < 25) {
            enemyHealthBarEl.className = 'health-bar-fill critical';
        } else if (monster.getHealthPercentage() < 60) {
            enemyHealthBarEl.className = 'health-bar-fill warning';
        } else {
            enemyHealthBarEl.className = 'health-bar-fill';
        }
        
        enemyLevelEl.textContent = monster.level;
    }
    
    // Update action buttons based on player skills
    updateActionButtons();
}

// Update action buttons based on player skills
function updateActionButtons() {
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
    const buttons = actionButtonsEl.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    
    // Add restart button
    const restartButton = document.createElement('button');
    restartButton.className = 'restart-button';
    restartButton.textContent = 'Restart Game';
    restartButton.addEventListener('click', goToCharacterSelect);
    actionButtonsEl.appendChild(restartButton);
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
    const buttons = actionButtonsEl.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    
    // Add restart button
    const restartButton = document.createElement('button');
    restartButton.className = 'restart-button';
    restartButton.textContent = 'Play Again';
    restartButton.addEventListener('click', goToCharacterSelect);
    actionButtonsEl.appendChild(restartButton);
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
    gameContainer.style.display = 'none';
    shopEl.style.display = 'block';
    
    // Populate shop items
    populateShop();
}

// Close the shop
function closeShop() {
    gameState = 'playing';
    gameContainer.style.display = 'flex';
    shopEl.style.display = 'none';
    
    updateUI();
}

// Populate shop items
function populateShop() {
    const potionsContainer = document.getElementById('potions-container');
    const equipmentContainer = document.getElementById('equipment-container');
    const skillsContainer = document.getElementById('skills-container');
    
    // Clear containers
    potionsContainer.innerHTML = '';
    equipmentContainer.innerHTML = '';
    skillsContainer.innerHTML = '';
    
    // Populate potions
    shop.items.potions.forEach(item => {
        const itemEl = createShopItemElement(item);
        potionsContainer.appendChild(itemEl);
    });
    
    // Populate equipment
    shop.items.equipment.forEach(item => {
        const itemEl = createShopItemElement(item);
        equipmentContainer.appendChild(itemEl);
    });
    
    // Populate available skills
    const availableSkills = shop.getAvailableSkills(player);
    availableSkills.forEach(item => {
        const itemEl = createShopItemElement(item);
        skillsContainer.appendChild(itemEl);
    });
    
    // Update player gold display in shop
    document.getElementById('shop-player-gold').textContent = player.gold;
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
        document.getElementById('shop-player-gold').textContent = player.gold;
        
        // Disable buy buttons if player doesn't have enough gold
        const buyButtons = shopEl.querySelectorAll('.buy-button');
        buyButtons.forEach(button => {
            const priceText = button.previousElementSibling.textContent;
            const price = parseInt(priceText);
            button.disabled = player.gold < price;
        });
        
        // Show purchase message
        const messageEl = document.getElementById('shop-message');
        messageEl.textContent = result.message;
        messageEl.style.color = '#4CAF50';
        
        // Save game
        saveGame();
    } else {
        // Show error message
        const messageEl = document.getElementById('shop-message');
        messageEl.textContent = result.message;
        messageEl.style.color = '#F44336';
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
            console.log('Game saved');
        }
    } catch (error) {
        console.error('Error saving game:', error);
    }
}

// Load highscores
async function loadHighscores() {
    try {
        const highscores = await playerManager.getHighscores();
        
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
    }
}

// Show character selection
async function showCharacterSelect() {
    try {
        gameState = 'character_select';
        
        // Hide game and shop, show character select
        gameContainer.style.display = 'none';
        shopEl.style.display = 'none';
        characterSelectEl.style.display = 'block';
        
        // Load existing characters
        const characters = await playerManager.getPlayerCharacters();
        
        // Clear character list
        const characterListEl = document.getElementById('character-list');
        characterListEl.innerHTML = '';
        
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
        console.error('Error loading characters:', error);
    }
}

// Select a character
function selectCharacter(character) {
    player = character;
    
    // Initialize skills if needed
    if (!player.skills || player.skills.length === 0) {
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
    characterSelectEl.style.display = 'none';
    gameContainer.style.display = 'flex';
    
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
        // Create new player
        const newPlayer = new Player(name.trim());
        
        // Initialize skills
        newPlayer.initializeSkills(skillsManager);
        
        // Save to database
        const savedPlayer = await playerManager.savePlayerCharacter(newPlayer);
        
        if (savedPlayer) {
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
        const result = await playerManager.deletePlayerCharacter(playerId);
        
        if (result) {
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
    // Shop close button
    document.getElementById('close-shop').addEventListener('click', closeShop);
    
    // Character select back button
    document.getElementById('back-to-character-select').addEventListener('click', goToCharacterSelect);
}

// Initialize the game
async function initGame() {
    // Initialize event listeners
    initEventListeners();
    
    // Show character selection
    showCharacterSelect();
}

// Start the game
initGame();