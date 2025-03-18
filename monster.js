// Monster class - handles all monster-related functionality
class Monster {
    constructor(level) {
        this.level = level;
        this.generateMonster();
    }

    // Generate a monster appropriate for the current level
    generateMonster() {
        const isBoss = this.level % 5 === 0;
        
        if (isBoss) {
            this.generateBoss();
        } else {
            this.generateRegularMonster();
        }
    }

    // Generate a boss monster
    generateBoss() {
        const bossTypes = [
            { name: 'Demon Lord', baseHealth: 100, baseAttack: 20, healthMultiplier: 10, attackMultiplier: 2 },
            { name: 'Elder Dragon', baseHealth: 120, baseAttack: 18, healthMultiplier: 12, attackMultiplier: 1.8 },
            { name: 'Necromancer', baseHealth: 90, baseAttack: 22, healthMultiplier: 9, attackMultiplier: 2.2 },
            { name: 'Golem Guardian', baseHealth: 150, baseAttack: 15, healthMultiplier: 15, attackMultiplier: 1.5 },
            { name: 'Shadow Titan', baseHealth: 110, baseAttack: 19, healthMultiplier: 11, attackMultiplier: 1.9 }
        ];
        
        const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
        
        this.name = `${bossType.name}`;
        this.maxHealth = bossType.baseHealth + (this.level * bossType.healthMultiplier);
        this.health = this.maxHealth;
        this.attack = bossType.baseAttack + (this.level * bossType.attackMultiplier);
        this.isBoss = true;
        this.goldReward = Math.floor(15 + (this.level * 2));
        this.xpReward = Math.floor(25 + (this.level * 3));
        this.scoreReward = 250 + (this.level * 20);
    }

    // Generate a regular monster
    generateRegularMonster() {
        const monsterTypes = [
            { name: 'Slime', baseHealth: 30, baseAttack: 5, healthMultiplier: 5, attackMultiplier: 1 },
            { name: 'Goblin', baseHealth: 25, baseAttack: 7, healthMultiplier: 4, attackMultiplier: 1.2 },
            { name: 'Skeleton', baseHealth: 20, baseAttack: 8, healthMultiplier: 3, attackMultiplier: 1.5 },
            { name: 'Spider', baseHealth: 15, baseAttack: 9, healthMultiplier: 3, attackMultiplier: 1.4 },
            { name: 'Bat', baseHealth: 12, baseAttack: 6, healthMultiplier: 2, attackMultiplier: 1.1 },
            { name: 'Rat', baseHealth: 10, baseAttack: 4, healthMultiplier: 2, attackMultiplier: 0.8 },
            { name: 'Wolf', baseHealth: 22, baseAttack: 7, healthMultiplier: 3.5, attackMultiplier: 1.3 },
            { name: 'Imp', baseHealth: 18, baseAttack: 10, healthMultiplier: 3, attackMultiplier: 1.6 }
        ];
        
        const monsterType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        
        this.name = monsterType.name;
        this.maxHealth = monsterType.baseHealth + (this.level * monsterType.healthMultiplier);
        this.health = this.maxHealth;
        this.attack = monsterType.baseAttack + (this.level * monsterType.attackMultiplier);
        this.isBoss = false;
        this.goldReward = Math.floor(5 + (this.level * 1.5));
        this.xpReward = Math.floor(10 + (this.level * 1.5));
        this.scoreReward = 100 + (this.level * 10);
    }

    // Get health percentage for health bar
    getHealthPercentage() {
        return Math.max(0, Math.min(100, Math.floor((this.health / this.maxHealth) * 100)));
    }

    // Take damage and return whether monster died
    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

// Export the Monster class
if (typeof module !== 'undefined') {
    module.exports = { Monster };
}