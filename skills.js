// Skills manager - handles all player skills and attacks
class SkillsManager {
    constructor() {
        this.skillTypes = this.defineSkillTypes();
    }
    
    // Define all available skill types and their upgrade paths
    defineSkillTypes() {
        return [
            {
                id: 'fire',
                name: 'Fire Magic',
                description: 'Harness the raw power of flames',
                skills: [
                    { level: 1, name: 'Fireball', damage: 10, manaCost: 5, description: 'A basic ball of fire' },
                    { level: 2, name: 'Firestorm', damage: 15, manaCost: 8, description: 'A storm of flames that burns enemies' },
                    { level: 3, name: 'Inferno', damage: 25, manaCost: 12, description: 'Engulf enemies in a raging inferno' },
                    { level: 4, name: 'Meteor Shower', damage: 40, manaCost: 20, description: 'Call down meteors from the sky' }
                ]
            },
            {
                id: 'ice',
                name: 'Ice Magic',
                description: 'Control the freezing power of ice',
                skills: [
                    { level: 1, name: 'Ice Shard', damage: 8, manaCost: 4, description: 'A sharp shard of ice' },
                    { level: 2, name: 'Frost Lance', damage: 14, manaCost: 7, description: 'A piercing lance of frost' },
                    { level: 3, name: 'Blizzard', damage: 22, manaCost: 11, description: 'A freezing storm that slows enemies' },
                    { level: 4, name: 'Glacial Burst', damage: 35, manaCost: 18, description: 'Exploding ice crystals that freeze enemies' }
                ]
            },
            {
                id: 'lightning',
                name: 'Lightning Magic',
                description: 'Command electric energy with deadly precision',
                skills: [
                    { level: 1, name: 'Spark', damage: 9, manaCost: 4, description: 'A small electric spark' },
                    { level: 2, name: 'Lightning Bolt', damage: 16, manaCost: 8, description: 'A bolt of lightning strikes the enemy' },
                    { level: 3, name: 'Chain Lightning', damage: 24, manaCost: 12, description: 'Lightning that chains between multiple enemies' },
                    { level: 4, name: 'Thunderstorm', damage: 38, manaCost: 19, description: 'A devastating storm of lightning' }
                ]
            },
            {
                id: 'shadow',
                name: 'Shadow Magic',
                description: 'Manipulate darkness to drain life and corrupt enemies',
                skills: [
                    { level: 1, name: 'Shadow Strike', damage: 7, manaCost: 3, description: 'A fast strike from the shadows' },
                    { level: 2, name: 'Dark Tendrils', damage: 13, manaCost: 6, description: 'Shadowy tendrils grip the enemy' },
                    { level: 3, name: 'Void Blast', damage: 21, manaCost: 10, description: 'A blast of void energy' },
                    { level: 4, name: 'Soul Drain', damage: 33, manaCost: 17, description: 'Drain the life essence of enemies' }
                ]
            },
            {
                id: 'arcane',
                name: 'Arcane Magic',
                description: 'Pure magical energy that bypasses resistances',
                skills: [
                    { level: 1, name: 'Arcane Missile', damage: 9, manaCost: 4, description: 'A guided missile of pure arcane energy' },
                    { level: 2, name: 'Mystic Orb', damage: 15, manaCost: 7, description: 'An orb of swirling arcane power' },
                    { level: 3, name: 'Arcane Barrage', damage: 23, manaCost: 11, description: 'Multiple missiles of arcane energy' },
                    { level: 4, name: 'Arcane Nova', damage: 36, manaCost: 18, description: 'An explosion of pure arcane power' }
                ]
            }
        ];
    }
    
    // Get initial skills for a new player
    getInitialSkills() {
        return [
            this.getSkillByNameAndLevel('Fireball', 1),
            this.getSkillByNameAndLevel('Ice Shard', 1)
        ];
    }

    // Get a skill by name and level
    getSkillByNameAndLevel(name, level) {
        for (const skillType of this.skillTypes) {
            for (const skill of skillType.skills) {
                if (skill.name === name && skill.level === level) {
                    return {
                        ...skill,
                        type: skillType.id
                    };
                }
            }
        }
        return null;
    }

    // Get the next upgrade for a given skill
    getUpgradeForSkill(skillName) {
        for (const skillType of this.skillTypes) {
            for (let i = 0; i < skillType.skills.length; i++) {
                if (skillType.skills[i].name === skillName && i < skillType.skills.length - 1) {
                    return {
                        ...skillType.skills[i + 1],
                        type: skillType.id
                    };
                }
            }
        }
        return null;
    }

    // Get all available skills to learn (that the player doesn't already have)
    getAvailableSkillsToLearn(playerSkills) {
        const availableSkills = [];
        const playerSkillNames = playerSkills.map(skill => skill.name);
        
        for (const skillType of this.skillTypes) {
            const firstSkill = skillType.skills[0];
            if (!playerSkillNames.includes(firstSkill.name)) {
                availableSkills.push({
                    ...firstSkill,
                    type: skillType.id
                });
            }
        }
        
        return availableSkills;
    }

    // Calculate actual damage for a skill based on player stats
    calculateDamage(skill, playerLevel, playerIntelligence) {
        const baseDamage = skill.damage;
        const levelMultiplier = 1 + (playerLevel * 0.1);
        const intelligenceBonus = playerIntelligence * 0.5;
        
        // Add some randomness to damage (-10% to +10%)
        const randomFactor = 0.9 + (Math.random() * 0.2);
        
        return Math.floor((baseDamage + intelligenceBonus) * levelMultiplier * randomFactor);
    }
}

// Export the SkillsManager class
if (typeof module !== 'undefined') {
    module.exports = { SkillsManager };
}