// Supabase setup (replace with your Supabase URL and anon key)
const SUPABASE_URL = 'https://lhkvzwsdidulwulghebk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3Z6d3NkaWR1bHd1bGdoZWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTQ5OTksImV4cCI6MjA1Njc5MDk5OX0.lz3Pch5hBBO2Ug_iI5f2jMGV4Xwqt8t4RcPrn4_EzPw';
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM elements
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const authMessage = document.getElementById('auth-message');
const gameContainer = document.getElementById('game-container');
const playerHealthEl = document.getElementById('player-health');
const playerLevelEl = document.getElementById('player-level');
const playerXpEl = document.getElementById('player-xp');
const playerGoldEl = document.getElementById('player-gold');
const playerScoreEl = document.getElementById('player-score');
const enemyNameEl = document.getElementById('enemy-name');
const enemyHealthEl = document.getElementById('enemy-health');
const enemyLevelEl = document.getElementById('enemy-level');
const logEl = document.getElementById('log');
const actionButton = document.getElementById('action-button');

// Game state
let player = {
    health: 100,
    maxHealth: 100,
    level: 1,
    xp: 0,
    gold: 0,
    score: 0,
    skills: [
        {
            name: 'Fireball',
            damage: 10,
            upgrades: ['Firestorm', 'Inferno', 'Meteor Shower'],
            upgradeLevel: 0
        },
        {
            name: 'Ice Shard',
            damage: 8,
            upgrades: ['Frost Lance', 'Blizzard', 'Glacial Burst'],
            upgradeLevel: 0
        }
    ]
};

let enemy = {
    name: 'Slime',
    health: 30,
    maxHealth: 30,
    level: 1,
    attack: 5
};

let wave = 1;
let enemiesDefeatedInWave = 0;
let totalEnemiesDefeated = 0;

// Log function
function log(message) {
    logEl.innerHTML += `<p>${message}</p>`;
    logEl.scrollTop = logEl.scrollHeight;
}

// Update game UI
function updateUI() {
    playerHealthEl.textContent = `${player.health}/${player.maxHealth}`;
    playerLevelEl.textContent = player.level;
    playerXpEl.textContent = `${player.xp}/100`;
    playerGoldEl.textContent = player.gold;
    playerScoreEl.textContent = player.score;
    enemyNameEl.textContent = enemy.name;
    enemyHealthEl.textContent = `${enemy.health}/${enemy.maxHealth}`;
    enemyLevelEl.textContent = enemy.level;
}

function checkLevelUp() {
    if (player.xp >= 100) {
        player.level++;
        player.xp -= 100;
        player.maxHealth += 20;
        player.health = player.maxHealth;
        log(`You leveled up to Level ${player.level}! Health increased.`);

        const skillToUpgrade = player.skills[Math.floor(Math.random() * player.skills.length)];
        if (skillToUpgrade.upgradeLevel < 3) {
            skillToUpgrade.upgradeLevel++;
            const newSkillName = skillToUpgrade.upgrades[skillToUpgrade.upgradeLevel - 1];
            skillToUpgrade.name = newSkillName;
            log(`Your skill upgraded to ${newSkillName}!`);
        }
    }
}

// Attack function
function attack() {
    const skill = player.skills[Math.floor(Math.random() * player.skills.length)];
    const damage = skill.damage * (1 + skill.upgradeLevel * 0.5);
    enemy.health -= damage;
    log(`You cast ${skill.name} and dealt ${damage} damage to ${enemy.name}.`);

    if (enemy.health <= 0) {
        log(`${enemy.name} defeated!`);
        player.xp += 10;
        player.gold += 5;
        player.score += 100 + 10 * player.level;
        totalEnemiesDefeated++;
        enemiesDefeatedInWave++;
        checkLevelUp();

        if (enemiesDefeatedInWave === 5) {
            log(`Wave ${wave} completed! Health restored.`);
            player.health = player.maxHealth;
            wave++;
            enemiesDefeatedInWave = 0;

            if (wave % 5 === 0) {
                enemy = {
                    name: 'Demon Boss',
                    health: 100 + wave * 10,
                    maxHealth: 100 + wave * 10,
                    level: wave,
                    attack: 20 + wave * 2
                };
                log(`A powerful ${enemy.name} appears on Wave ${wave}!`);
            } else {
                enemy = {
                    name: 'Slime',
                    health: 30 + wave * 5,
                    maxHealth: 30 + wave * 5,
                    level: wave,
                    attack: 5 + wave
                };
                log(`Wave ${wave} begins. You encounter a ${enemy.name}.`);
            }
        } else {
            enemy = {
                name: 'Slime',
                health: 30 + wave * 5,
                maxHealth: 30 + wave * 5,
                level: wave,
                attack: 5 + wave
            };
            log(`You encounter another ${enemy.name}.`);
        }
    } else {
        const enemyDamage = Math.max(enemy.attack - player.level, 0);
        player.health -= enemyDamage;
        log(`${enemy.name} attacks you for ${enemyDamage} damage.`);
    }

    if (player.health <= 0) {
        log('You have been defeated by the forces of the mage tower!');
        actionButton.disabled = true;
        submitHighscore();
    }

    updateUI();
}

// Submit highscore to Supabase
async function submitHighscore() {
    const user = supabase.auth.user();
    if (user) {
        const { data, error } = await supabase.from('highscores').insert([
            { score: player.score, user_id: user.id }
        ]);
        if (error) {
            console.error('Error submitting highscore:', error);
            log('Failed to submit highscore.');
        } else {
            log(`Highscore of ${player.score} submitted!`);
        }
    } else {
        log('You need to be logged in to submit a highscore.');
    }
}

// Authentication functions
async function handleLogin(email, password) {
    const { user, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        authMessage.textContent = `Login error: ${error.message}`;
    } else {
        authMessage.textContent = `Logged in as ${user.email}!`;
        gameContainer.style.display = 'block';
        authForm.style.display = 'none';
        updateUI();
    }
}

async function handleRegister(email, password) {
    const { user, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });
    if (error) {
        authMessage.textContent = `Registration error: ${error.message}`;
    } else {
        authMessage.textContent = `Registration successful! Check your email for confirmation.`;
    }
}

// Event listeners
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    await handleLogin(email, password);
});

registerButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    await handleRegister(email, password);
});

actionButton.addEventListener('click', attack);

// Initial setup
updateUI();