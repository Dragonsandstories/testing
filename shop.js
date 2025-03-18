// Shop class - handles purchasing items, upgrades, and skills
class Shop {
    constructor(skillsManager) {
        this.skillsManager = skillsManager;
        this.items = this.generateItems();
    }
    
    // Generate shop items
    generateItems() {
        return {
            potions: [
                { id: 'health_small', name: 'Small Health Potion', type: 'consumable', effect: 'health', amount: 30, price: 10, description: 'Restores 30 health points' },
                { id: 'health_medium', name: 'Medium Health Potion', type: 'consumable', effect: 'health', amount: 75, price: 25, description: 'Restores 75 health points' },
                { id: 'health_large', name: 'Large Health Potion', type: 'consumable', effect: 'health', amount: 150, price: 50, description: 'Restores 150 health points' },
                { id: 'mana_small', name: 'Small Mana Potion', type: 'consumable', effect: 'mana', amount: 20, price: 10, description: 'Restores 20 mana points' },
                { id: 'mana_medium', name: 'Medium Mana Potion', type: 'consumable', effect: 'mana', amount: 50, price: 25, description: 'Restores 50 mana points' },
                { id: 'mana_large', name: 'Large Mana Potion', type: 'consumable', effect: 'mana', amount: 100, price: 50, description: 'Restores 100 mana points' }
            ],
            equipment: [
                // Weapons
                { id: 'wand_basic', name: 'Apprentice Wand', type: 'weapon', slot: 'weapon', stats: { intelligence: 2 }, price: 50, description: 'A basic wand for beginners' },
                { id: 'wand_fire', name: 'Fire Wand', type: 'weapon', slot: 'weapon', stats: { intelligence: 4, damageBonus: { fire: 0.1 } }, price: 150, description: 'Enhances fire magic' },
                { id: 'wand_ice', name: 'Frost Wand', type: 'weapon', slot: 'weapon', stats: { intelligence: 4, damageBonus: { ice: 0.1 } }, price: 150, description: 'Enhances ice magic' },
                { id: 'staff_arcane', name: 'Arcane Staff', type: 'weapon', slot: 'weapon', stats: { intelligence: 6, manaRegen: 0.05 }, price: 300, description: 'Enhances magical abilities and regenerates mana' },
                { id: 'staff_elemental', name: 'Elemental Staff', type: 'weapon', slot: 'weapon', stats: { intelligence: 8, damageBonus: { fire: 0.05, ice: 0.05, lightning: 0.05 } }, price: 500, description: 'Enhances all elemental magic' },
                
                // Head armor
                { id: 'hat_apprentice', name: 'Apprentice Hat', type: 'armor', slot: 'head', stats: { intelligence: 1, vitality: 1 }, price: 40, description: 'A basic hat for beginner mages' },
                { id: 'hat_scholar', name: 'Scholar Hood', type: 'armor', slot: 'head', stats: { intelligence: 2, vitality: 2 }, price: 120, description: 'Increases magical power and health' },
                { id: 'hat_archmage', name: 'Archmage Hat', type: 'armor', slot: 'head', stats: { intelligence: 4, vitality: 3, manaRegen: 0.02 }, price: 300, description: 'Worn by powerful mages' },
                
                // Body armor
                { id: 'robe_apprentice', name: 'Apprentice Robe', type: 'armor', slot: 'body', stats: { intelligence: 2, vitality: 2 }, price: 60, description: 'A basic robe for beginner mages' },
                { id: 'robe_scholar', name: 'Scholar Robe', type: 'armor', slot: 'body', stats: { intelligence: 3, vitality: 3 }, price: 180, description: 'Enhances magical abilities and provides protection' },
                { id: 'robe_archmage', name: 'Archmage Robe', type: 'armor', slot: 'body', stats: { intelligence: 6, vitality: 4, manaRegen: 0.03 }, price: 450, description: 'A powerful robe with magical enhancements' }
            ],
            skills: [] // Will be populated dynamically based on available skills
        };
    }
    
    // Get available skills for a player to purchase
    getAvailableSkills(player) {
        const availableSkills = this.skillsManager.getAvailableSkillsToLearn(player.skills);
        return availableSkills.map(skill => ({
            ...skill,
            price: 100 + (skill.level * 50),
            type: 'skill'
        }));
    }
    
    // Process a purchase
    purchaseItem(player, itemId) {
        // Find the item across all categories
        let item = null;
        let category = null;
        
        for (const cat of Object.keys(this.items)) {
            const found = this.items[cat].find(i => i.id === itemId);
            if (found) {
                item = found;
                category = cat;
                break;
            }
        }
        
        // Check available skills as well
        if (!item) {
            const availableSkills = this.getAvailableSkills(player);
            item = availableSkills.find(s => s.id === itemId);
            if (item) {
                category = 'skills';
            }
        }
        
        // If item not found
        if (!item) {
            return {
                success: false,
                message: "Item not found."
            };
        }
        
        // Check if player has enough gold
        if (player.gold < item.price) {
            return {
                success: false,
                message: "Not enough gold."
            };
        }
        
        // Process the purchase based on item type
        player.gold -= item.price;
        
        if (category === 'potions') {
            // Consumable items are used immediately
            if (item.effect === 'health') {
                player.health = Math.min(player.maxHealth, player.health + item.amount);
                return {
                    success: true,
                    message: `Used ${item.name}. Restored ${item.amount} health.`
                };
            } else if (item.effect === 'mana') {
                player.mana = Math.min(player.maxMana, player.mana + item.amount);
                return {
                    success: true,
                    message: `Used ${item.name}. Restored ${item.amount} mana.`
                };
            }
        } else if (category === 'equipment') {
            // Equipment is equipped
            const slot = item.slot;
            player.equipment[slot] = item;
            
            // Apply item stats to player
            this.applyEquipmentStats(player);
            
            return {
                success: true,
                message: `Equipped ${item.name}.`
            };
        } else if (category === 'skills') {
            // Add the skill to player's skills
            player.skills.push(item);
            
            return {
                success: true,
                message: `Learned new skill: ${item.name}.`
            };
        }
        
        return {
            success: false,
            message: "Unknown item type."
        };
    }
    
    // Apply equipment stats to player
    applyEquipmentStats(player) {
        // Reset player to base stats
        player.strength = 5;
        player.intelligence = 10;
        player.vitality = 5;
        player.agility = 5;
        
        // Apply equipment bonuses
        for (const slot of Object.keys(player.equipment)) {
            const item = player.equipment[slot];
            if (item && item.stats) {
                for (const stat of Object.keys(item.stats)) {
                    if (stat in player) {
                        player[stat] += item.stats[stat];
                    }
                }
            }
        }
        
        // Update derived stats
        player.maxHealth = 100 + (player.vitality * 10);
        player.maxMana = 50 + (player.intelligence * 5);
        
        // Cap health and mana to new maximums
        player.health = Math.min(player.health, player.maxHealth);
        player.mana = Math.min(player.mana, player.maxMana);
    }
}

// Export the Shop class
if (typeof module !== 'undefined') {
    module.exports = { Shop };
}