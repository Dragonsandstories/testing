// Player class - handles all player-related functionality
class Player {
    constructor(name, characterClass = 'Mage') {
        this.id = null; // Will be set when saved to database
        this.userId = null; // Will be set when associated with a user
        this.name = name;
        this.characterClass = characterClass;
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.health = 100;
        this.maxHealth = 100;
        this.mana = 50;
        this.maxMana = 50;
        this.gold = 0;
        this.score = 0;
        this.towerLevel = 1;

        // Base stats
        this.strength = 5;       // Increases physical damage
        this.intelligence = 10;  // Increases magical damage and mana
        this.vitality = 5;       // Increases health
        this.agility = 5;        // Increases dodge chance

        // Skills (will be populated by SkillsManager)
        this.skills = [];
        
        // Equipment slots
        this.equipment = {
            head: null,
            body: null,
            hands: null,
            feet: null,
            weapon: null,
            offhand: null
        };
    }

    // Initialize player skills from SkillsManager
    initializeSkills(skillsManager) {
        this.skills = skillsManager.getInitialSkills();
    }

    // Get health percentage for health bar
    getHealthPercentage() {
        return Math.max(0, Math.min(100, Math.floor((this.health / this.maxHealth) * 100)));
    }
    
    // Get mana percentage for mana bar
    getManaPercentage() {
        return Math.max(0, Math.min(100, Math.floor((this.mana / this.maxMana) * 100)));
    }

    // Level up the player
    levelUp() {
        this.level++;
        this.xp = this.xp - this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(100 + (this.level * 20));
        
        // Increase stats
        this.strength += 1;
        this.intelligence += 2; // Mages gain more intelligence
        this.vitality += 1;
        this.agility += 1;
        
        // Update health and mana
        const oldMaxHealth = this.maxHealth;
        this.maxHealth = 100 + (this.vitality * 10);
        this.health += (this.maxHealth - oldMaxHealth);
        
        const oldMaxMana = this.maxMana;
        this.maxMana = 50 + (this.intelligence * 5);
        this.mana += (this.maxMana - oldMaxMana);
        
        return true;
    }

    // Check if player can level up
    checkLevelUp() {
        if (this.xp >= this.xpToNextLevel) {
            return this.levelUp();
        }
        return false;
    }

    // Gain XP from defeating a monster
    gainXP(amount) {
        this.xp += amount;
        return this.checkLevelUp();
    }

    // Gain gold from defeating a monster
    gainGold(amount) {
        this.gold += amount;
    }

    // Gain score from defeating a monster
    gainScore(amount) {
        this.score += amount;
    }

    // Advance to the next tower level
    advanceTowerLevel() {
        this.towerLevel++;
    }

    // Use a skill and reduce mana
    useSkill(skillIndex, monster, skillsManager) {
        const skill = this.skills[skillIndex];
        
        // Check if player has enough mana
        if (this.mana < skill.manaCost) {
            return {
                success: false,
                message: "Not enough mana!",
                damage: 0,
                killed: false
            };
        }
        
        // Reduce mana
        this.mana -= skill.manaCost;
        
        // Calculate damage
        const damage = skillsManager.calculateDamage(skill, this.level, this.intelligence);
        
        // Apply damage to monster
        const killed = monster.takeDamage(damage);
        
        return {
            success: true,
            skill,
            damage,
            killed
        };
    }

    // Take damage from a monster attack
    takeDamage(amount) {
        // Calculate dodge chance (agility-based)
        const dodgeChance = this.agility * 0.01; // 1% per point of agility
        
        if (Math.random() < dodgeChance) {
            return {
                damage: 0,
                dodged: true,
                died: false
            };
        }
        
        this.health -= amount;
        
        return {
            damage: amount,
            dodged: false,
            died: this.health <= 0
        };
    }

    // Regenerate health and mana (used between fights or when resting)
    regenerate(healthPercent = 0.1, manaPercent = 0.2) {
        const healthRegen = Math.floor(this.maxHealth * healthPercent);
        const manaRegen = Math.floor(this.maxMana * manaPercent);
        
        this.health = Math.min(this.maxHealth, this.health + healthRegen);
        this.mana = Math.min(this.maxMana, this.mana + manaRegen);
    }

    // Fully heal the player (used between tower levels)
    fullHeal() {
        this.health = this.maxHealth;
        this.mana = this.maxMana;
    }

    // Upgrade a skill to its next level
    upgradeSkill(skillIndex, skillsManager) {
        const currentSkill = this.skills[skillIndex];
        const upgradedSkill = skillsManager.getUpgradeForSkill(currentSkill.name);
        
        if (upgradedSkill) {
            this.skills[skillIndex] = upgradedSkill;
            return true;
        }
        
        return false;
    }

    // Convert to a simple object for saving to database
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            name: this.name,
            characterClass: this.characterClass,
            level: this.level,
            xp: this.xp,
            xpToNextLevel: this.xpToNextLevel,
            health: this.health,
            maxHealth: this.maxHealth,
            mana: this.mana,
            maxMana: this.maxMana,
            gold: this.gold,
            score: this.score,
            towerLevel: this.towerLevel,
            strength: this.strength,
            intelligence: this.intelligence,
            vitality: this.vitality,
            agility: this.agility,
            skills: this.skills,
            equipment: this.equipment
        };
    }

    // Create a Player from JSON data
    static fromJSON(data) {
        const player = new Player(data.name, data.characterClass);
        
        for (const [key, value] of Object.entries(data)) {
            if (key !== 'name' && key !== 'characterClass') {
                player[key] = value;
            }
        }
        
        return player;
    }
}

// PlayerManager class for handling Supabase player data
class PlayerManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        return user;
    }

    // Get all characters for current user
    async getPlayerCharacters() {
        const user = await this.getCurrentUser();
        if (!user) return [];

        const { data, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching characters:', error);
            return [];
        }

        return data.map(char => Player.fromJSON(char));
    }

    // Save a player character to the database
    async savePlayerCharacter(player) {
        const user = await this.getCurrentUser();
        if (!user) return null;

        player.userId = user.id;
        const playerData = player.toJSON();

        // If player has an ID, update the record, otherwise create a new one
        if (player.id) {
            const { data, error } = await this.supabase
                .from('characters')
                .update(playerData)
                .eq('id', player.id)
                .select()
                .single();

            if (error) {
                console.error('Error updating character:', error);
                return null;
            }

            return Player.fromJSON(data);
        } else {
            const { data, error } = await this.supabase
                .from('characters')
                .insert([{ ...playerData, user_id: user.id }])
                .select()
                .single();

            if (error) {
                console.error('Error creating character:', error);
                return null;
            }

            return Player.fromJSON(data);
        }
    }

    // Delete a player character
    async deletePlayerCharacter(playerId) {
        const user = await this.getCurrentUser();
        if (!user) return false;

        const { error } = await this.supabase
            .from('characters')
            .delete()
            .eq('id', playerId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting character:', error);
            return false;
        }

        return true;
    }

    // Get highscores
    async getHighscores(limit = 10) {
        const { data, error } = await this.supabase
            .from('highscores')
            .select(`
                id,
                score,
                created_at,
                characters (name),
                profiles (username)
            `)
            .order('score', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching highscores:', error);
            return [];
        }

        return data.map(entry => ({
            id: entry.id,
            score: entry.score,
            date: new Date(entry.created_at),
            characterName: entry.characters?.name || 'Unknown',
            playerName: entry.profiles?.username || 'Anonymous'
        }));
    }

    // Submit a new highscore
    async submitHighscore(player) {
        const user = await this.getCurrentUser();
        if (!user) return false;

        const { error } = await this.supabase
            .from('highscores')
            .insert([
                {
                    user_id: user.id,
                    character_id: player.id,
                    score: player.score
                }
            ]);

        if (error) {
            console.error('Error submitting highscore:', error);
            return false;
        }

        return true;
    }
}

// Export the Player and PlayerManager classes
if (typeof module !== 'undefined') {
    module.exports = { Player, PlayerManager };
}