// Improved player.js - focuses on reliable Supabase integration
// and robust character management

// Player class - handles all player-related functionality
class Player {
    constructor(name, characterClass = 'Mage') {
        this.id = null; // Will be set when saved to database
        this.userId = null; // Will be set when associated with a user
        this.name = name || 'Unnamed Mage';
        this.characterClass = characterClass || 'Mage';
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
        if (!skillsManager) {
            console.error('SkillsManager not provided for skill initialization');
            // Add default skills as fallback
            this.skills = [
                {
                    name: 'Fireball',
                    type: 'fire',
                    damage: 10,
                    manaCost: 5,
                    description: 'A basic ball of fire'
                },
                {
                    name: 'Ice Shard',
                    type: 'ice',
                    damage: 8,
                    manaCost: 4,
                    description: 'A sharp shard of ice'
                }
            ];
            return;
        }
        
        try {
            this.skills = skillsManager.getInitialSkills() || [];
            console.log(`Initialized ${this.skills.length} skills for player`);
        } catch (error) {
            console.error('Error initializing skills:', error);
            // Add default skills as fallback
            this.skills = [
                {
                    name: 'Fireball',
                    type: 'fire',
                    damage: 10,
                    manaCost: 5,
                    description: 'A basic ball of fire'
                },
                {
                    name: 'Ice Shard',
                    type: 'ice',
                    damage: 8,
                    manaCost: 4,
                    description: 'A sharp shard of ice'
                }
            ];
        }
    }

    // Get health percentage for health bar
    getHealthPercentage() {
        if (!this.maxHealth || this.maxHealth <= 0) return 0;
        return Math.max(0, Math.min(100, Math.floor((this.health / this.maxHealth) * 100)));
    }
    
    // Get mana percentage for mana bar
    getManaPercentage() {
        if (!this.maxMana || this.maxMana <= 0) return 0;
        return Math.max(0, Math.min(100, Math.floor((this.mana / this.maxMana) * 100)));
    }

    // Level up the player
    levelUp() {
        this.level++;
        this.xp = Math.max(0, this.xp - this.xpToNextLevel);
        this.xpToNextLevel = Math.floor(100 + (this.level * 20));
        
        // Increase stats
        this.strength += 1;
        this.intelligence += 2; // Mages gain more intelligence
        this.vitality += 1;
        this.agility += 1;
        
        // Update health and mana
        const oldMaxHealth = this.maxHealth || 100;
        this.maxHealth = 100 + (this.vitality * 10);
        this.health = Math.min(this.maxHealth, this.health + (this.maxHealth - oldMaxHealth));
        
        const oldMaxMana = this.maxMana || 50;
        this.maxMana = 50 + (this.intelligence * 5);
        this.mana = Math.min(this.maxMana, this.mana + (this.maxMana - oldMaxMana));
        
        console.log(`Player leveled up to ${this.level}`);
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
        if (!amount || amount <= 0) return false;
        
        this.xp += amount;
        console.log(`Player gained ${amount} XP, now has ${this.xp}/${this.xpToNextLevel}`);
        return this.checkLevelUp();
    }

    // Gain gold from defeating a monster
    gainGold(amount) {
        if (!amount || amount <= 0) return;
        
        this.gold += amount;
        console.log(`Player gained ${amount} gold, now has ${this.gold}`);
    }

    // Gain score from defeating a monster
    gainScore(amount) {
        if (!amount || amount <= 0) return;
        
        this.score += amount;
        console.log(`Player gained ${amount} score, now has ${this.score}`);
    }

    // Advance to the next tower level
    advanceTowerLevel() {
        this.towerLevel++;
        console.log(`Player advanced to tower level ${this.towerLevel}`);
    }

    // Use a skill and reduce mana
    useSkill(skillIndex, monster, skillsManager) {
        // Validate inputs
        if (!this.skills || !this.skills.length) {
            return {
                success: false,
                message: "No skills available!",
                damage: 0,
                killed: false
            };
        }
        
        if (skillIndex < 0 || skillIndex >= this.skills.length) {
            return {
                success: false,
                message: "Invalid skill selected!",
                damage: 0,
                killed: false
            };
        }
        
        if (!monster) {
            return {
                success: false,
                message: "No monster to attack!",
                damage: 0,
                killed: false
            };
        }
        
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
        let damage = 0;
        try {
            if (skillsManager) {
                damage = skillsManager.calculateDamage(skill, this.level, this.intelligence);
            } else {
                // Fallback damage calculation if skillsManager is not available
                const baseDamage = skill.damage || 0;
                const levelMultiplier = 1 + (this.level * 0.1);
                const intelligenceBonus = this.intelligence * 0.5;
                const randomFactor = 0.9 + (Math.random() * 0.2);
                damage = Math.floor((baseDamage + intelligenceBonus) * levelMultiplier * randomFactor);
            }
        } catch (error) {
            console.error('Error calculating damage:', error);
            // Simple fallback damage calculation
            damage = skill.damage + Math.floor(Math.random() * 5);
        }
        
        // Apply damage to monster
        let killed = false;
        try {
            killed = monster.takeDamage(damage);
        } catch (error) {
            console.error('Error applying damage to monster:', error);
            // Assume monster is not killed if error occurs
            killed = false;
        }
        
        return {
            success: true,
            skill,
            damage,
            killed
        };
    }

    // Take damage from a monster attack
    takeDamage(amount) {
        if (!amount || amount <= 0) {
            return {
                damage: 0,
                dodged: true,
                died: false
            };
        }
        
        // Calculate dodge chance (agility-based)
        const dodgeChance = (this.agility || 0) * 0.01; // 1% per point of agility
        
        if (Math.random() < dodgeChance) {
            return {
                damage: 0,
                dodged: true,
                died: false
            };
        }
        
        this.health = Math.max(0, this.health - amount);
        
        return {
            damage: amount,
            dodged: false,
            died: this.health <= 0
        };
    }

    // Regenerate health and mana (used between fights or when resting)
    regenerate(healthPercent = 0.1, manaPercent = 0.2) {
        const healthRegen = Math.floor((this.maxHealth || 100) * healthPercent);
        const manaRegen = Math.floor((this.maxMana || 50) * manaPercent);
        
        this.health = Math.min(this.maxHealth || 100, (this.health || 0) + healthRegen);
        this.mana = Math.min(this.maxMana || 50, (this.mana || 0) + manaRegen);
        
        return {
            healthRestored: healthRegen,
            manaRestored: manaRegen
        };
    }

    // Fully heal the player (used between tower levels)
    fullHeal() {
        this.health = this.maxHealth || 100;
        this.mana = this.maxMana || 50;
    }

    // Upgrade a skill to its next level
    upgradeSkill(skillIndex, skillsManager) {
        if (!this.skills || !this.skills.length || skillIndex < 0 || skillIndex >= this.skills.length) {
            console.error('Invalid skill index for upgrade:', skillIndex);
            return false;
        }
        
        if (!skillsManager) {
            console.error('SkillsManager not provided for skill upgrade');
            return false;
        }
        
        try {
            const currentSkill = this.skills[skillIndex];
            const upgradedSkill = skillsManager.getUpgradeForSkill(currentSkill.name);
            
            if (upgradedSkill) {
                this.skills[skillIndex] = upgradedSkill;
                console.log(`Upgraded skill ${currentSkill.name} to ${upgradedSkill.name}`);
                return true;
            }
        } catch (error) {
            console.error('Error upgrading skill:', error);
        }
        
        return false;
    }

    // Convert to a simple object for saving to database
    toJSON() {
        // Ensure skills and equipment are properly stringified if they're objects
        let skillsData = this.skills;
        let equipmentData = this.equipment;
        
        // Stringify skills if it's not already a string
        if (typeof skillsData !== 'string' && skillsData !== null) {
            try {
                skillsData = JSON.stringify(skillsData);
            } catch (error) {
                console.error('Error stringifying skills:', error);
                skillsData = JSON.stringify([]);
            }
        }
        
        // Stringify equipment if it's not already a string
        if (typeof equipmentData !== 'string' && equipmentData !== null) {
            try {
                equipmentData = JSON.stringify(equipmentData);
            } catch (error) {
                console.error('Error stringifying equipment:', error);
                equipmentData = JSON.stringify({});
            }
        }
        
        return {
            id: this.id,
            user_id: this.userId,
            name: this.name || 'Unnamed Mage',
            character_class: this.characterClass || 'Mage',
            level: this.level || 1,
            xp: this.xp || 0,
            xp_to_next_level: this.xpToNextLevel || 100,
            health: this.health || 100,
            max_health: this.maxHealth || 100,
            mana: this.mana || 50,
            max_mana: this.maxMana || 50,
            gold: this.gold || 0,
            score: this.score || 0,
            tower_level: this.towerLevel || 1,
            strength: this.strength || 5,
            intelligence: this.intelligence || 10,
            vitality: this.vitality || 5,
            agility: this.agility || 5,
            skills: skillsData,
            equipment: equipmentData
        };
    }

    // Create a Player from database data
    static fromJSON(data) {
        if (!data) {
            console.error('No data provided to Player.fromJSON');
            return new Player('Default Player');
        }
        
        try {
            const player = new Player(data.name || 'Unnamed Mage', data.character_class || 'Mage');
            
            // Set basic properties
            player.id = data.id;
            player.userId = data.user_id;
            player.level = data.level || 1;
            player.xp = data.xp || 0;
            player.xpToNextLevel = data.xp_to_next_level || 100;
            player.health = data.health || 100;
            player.maxHealth = data.max_health || 100;
            player.mana = data.mana || 50;
            player.maxMana = data.max_mana || 50;
            player.gold = data.gold || 0;
            player.score = data.score || 0;
            player.towerLevel = data.tower_level || 1;
            player.strength = data.strength || 5;
            player.intelligence = data.intelligence || 10;
            player.vitality = data.vitality || 5;
            player.agility = data.agility || 5;
            
            // Parse skills
            if (data.skills) {
                if (typeof data.skills === 'string') {
                    try {
                        player.skills = JSON.parse(data.skills);
                    } catch (error) {
                        console.error('Error parsing skills JSON:', error);
                        player.skills = [];
                    }
                } else if (Array.isArray(data.skills)) {
                    player.skills = data.skills;
                } else {
                    player.skills = [];
                }
            } else {
                player.skills = [];
            }
            
            // Parse equipment
            if (data.equipment) {
                if (typeof data.equipment === 'string') {
                    try {
                        player.equipment = JSON.parse(data.equipment);
                    } catch (error) {
                        console.error('Error parsing equipment JSON:', error);
                        player.equipment = {};
                    }
                } else if (typeof data.equipment === 'object') {
                    player.equipment = data.equipment;
                } else {
                    player.equipment = {};
                }
            } else {
                player.equipment = {};
            }
            
            return player;
        } catch (error) {
            console.error('Error creating player from JSON:', error);
            return new Player('Default Player');
        }
    }
}

// PlayerManager class for handling Supabase player data
class PlayerManager {
    constructor(supabaseClient) {
        if (!supabaseClient) {
            console.error('Supabase client not provided to PlayerManager');
            throw new Error('Supabase client is required for PlayerManager');
        }
        this.supabase = supabaseClient;
    }

    // Get current user
    async getCurrentUser() {
        try {
            const { data, error } = await this.supabase.auth.getUser();
            
            if (error) {
                console.error('Error getting current user:', error);
                return null;
            }
            
            return data.user;
        } catch (error) {
            console.error('Exception getting current user:', error);
            return null;
        }
    }

    // Get all characters for current user
    async getPlayerCharacters() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return [];
            }

            const { data, error } = await this.supabase
                .from('characters')
                .select('*')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching characters:', error);
                return [];
            }

            console.log(`Retrieved ${data.length} characters for user`);
            return data.map(char => {
                try {
                    return Player.fromJSON(char);
                } catch (e) {
                    console.error('Error converting character data:', e);
                    return null;
                }
            }).filter(char => char !== null);
        } catch (error) {
            console.error('Exception in getPlayerCharacters:', error);
            return [];
        }
    }

    // Save a player character to the database
    async savePlayerCharacter(player) {
        if (!player) {
            console.error('No player provided to save');
            return null;
        }
        
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return null;
            }

            // Set the user ID if not already set
            player.userId = user.id;
            
            // Convert player to database format
            const playerData = player.toJSON();
            console.log('Saving player data:', { 
                id: playerData.id,
                name: playerData.name,
                level: playerData.level
            });

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

                console.log('Character updated successfully:', data.name);
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

                console.log('Character created successfully:', data.name);
                return Player.fromJSON(data);
            }
        } catch (error) {
            console.error('Exception in savePlayerCharacter:', error);
            return null;
        }
    }

    // Delete a player character
    async deletePlayerCharacter(playerId) {
        if (!playerId) {
            console.error('No player ID provided to delete');
            return false;
        }
        
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return false;
            }

            const { error } = await this.supabase
                .from('characters')
                .delete()
                .eq('id', playerId)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error deleting character:', error);
                return false;
            }

            console.log('Character deleted successfully:', playerId);
            return true;
        } catch (error) {
            console.error('Exception in deletePlayerCharacter:', error);
            return false;
        }
    }

    // Get a specific character by ID
    async getCharacterById(characterId) {
        if (!characterId) {
            console.error('No character ID provided');
            return null;
        }
        
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return null;
            }

            const { data, error } = await this.supabase
                .from('characters')
                .select('*')
                .eq('id', characterId)
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('Error fetching character by ID:', error);
                return null;
            }

            return Player.fromJSON(data);
        } catch (error) {
            console.error('Exception in getCharacterById:', error);
            return null;
        }
    }

    // Get highscores
    async getHighscores(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('highscores')
                .select(`
                    id,
                    score,
                    created_at,
                    characters (id, name),
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
                date: entry.created_at ? new Date(entry.created_at) : new Date(),
                characterId: entry.characters?.id || null,
                characterName: entry.characters?.name || 'Unknown',
                playerName: entry.profiles?.username || 'Anonymous'
            }));
        } catch (error) {
            console.error('Exception in getHighscores:', error);
            return [];
        }
    }

    // Submit a new highscore
    async submitHighscore(player) {
        if (!player || !player.id) {
            console.error('Invalid player for highscore submission');
            return false;
        }
        
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return false;
            }

            const { data, error } = await this.supabase
                .from('highscores')
                .insert([
                    {
                        user_id: user.id,
                        character_id: player.id,
                        score: player.score || 0
                    }
                ]);

            if (error) {
                console.error('Error submitting highscore:', error);
                return false;
            }

            console.log('Highscore submitted successfully:', player.score);
            return true;
        } catch (error) {
            console.error('Exception in submitHighscore:', error);
            return false;
        }
    }
    
    // Get user profile data
    async getUserProfile() {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return null;
            }

            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Exception in getUserProfile:', error);
            return null;
        }
    }
    
    // Create or update user profile
    async updateUserProfile(username) {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                console.error('No user logged in');
                return false;
            }

            const { data, error } = await this.supabase
                .from('profiles')
                .upsert([
                    {
                        id: user.id,
                        username: username || 'Player',
                        updated_at: new Date().toISOString()
                    }
                ]);

            if (error) {
                console.error('Error updating user profile:', error);
                return false;
            }

            console.log('User profile updated successfully');
            return true;
        } catch (error) {
            console.error('Exception in updateUserProfile:', error);
            return false;
        }
    }
}

// Export the Player and PlayerManager classes
if (typeof module !== 'undefined') {
    module.exports = { Player, PlayerManager };
}