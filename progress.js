// ProgressManager - handles tower progress and game state
class ProgressManager {
    constructor() {
        this.currentTowerLevel = 1;
        this.monstersDefeated = 0;
        this.monstersPerLevel = 10;
        this.bossLevels = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
        this.maxTowerLevel = 50;
    }
    
    // Initialize progress from saved data
    initializeFromSave(saveData) {
        if (saveData) {
            this.currentTowerLevel = saveData.currentTowerLevel || 1;
            this.monstersDefeated = saveData.monstersDefeated || 0;
        }
    }
    
    // Record a monster defeat
    recordMonsterDefeat(monster) {
        this.monstersDefeated++;
        
        // Check if we should advance to the next level
        if (this.monstersDefeated >= this.monstersPerLevel || monster.isBoss) {
            return this.advanceTowerLevel();
        }
        
        return {
            advanced: false,
            newLevel: this.currentTowerLevel,
            monstersRemaining: this.monstersPerLevel - this.monstersDefeated
        };
    }
    
    // Advance to the next tower level
    advanceTowerLevel() {
        if (this.currentTowerLevel < this.maxTowerLevel) {
            this.currentTowerLevel++;
            this.monstersDefeated = 0;
            
            return {
                advanced: true,
                newLevel: this.currentTowerLevel,
                isBossLevel: this.isBossLevel(this.currentTowerLevel),
                monstersRemaining: this.monstersPerLevel
            };
        } else {
            // Player has reached the maximum tower level
            return {
                advanced: false,
                completed: true,
                newLevel: this.currentTowerLevel,
                monstersRemaining: this.monstersPerLevel - this.monstersDefeated
            };
        }
    }
    
    // Check if the current level is a boss level
    isBossLevel(level = this.currentTowerLevel) {
        return this.bossLevels.includes(level);
    }
    
    // Get the remaining monsters for the current level
    getRemainingMonsters() {
        return this.monstersPerLevel - this.monstersDefeated;
    }
    
    // Get progress percentage for current level
    getLevelProgressPercentage() {
        return Math.floor((this.monstersDefeated / this.monstersPerLevel) * 100);
    }
    
    // Get overall tower progress percentage
    getTowerProgressPercentage() {
        return Math.floor((this.currentTowerLevel / this.maxTowerLevel) * 100);
    }
    
    // Convert to a simple object for saving
    toJSON() {
        return {
            currentTowerLevel: this.currentTowerLevel,
            monstersDefeated: this.monstersDefeated
        };
    }
}

// Export the ProgressManager
if (typeof module !== 'undefined') {
    module.exports = { ProgressManager };
}