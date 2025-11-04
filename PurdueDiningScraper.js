//const axios = require('axios');
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class PurdueDiningScraper {
    constructor() {
        this.headers = {
            'content-type': 'application/json',
            'origin': 'https://dining.purdue.edu',
            'referer': 'https://dining.purdue.edu',
            'user-agent': 'Mozilla/5.0'
        };        
    }

    // Simple request helper with retry + exponential backoff for transient network errors
    async requestWithRetry(jsonData, attempts = 3, timeout = 10000) {
        let attempt = 0;
        while (attempt < attempts) {
            try {
                const response = await axios.post(
                    'https://api.hfs.purdue.edu/menus/v3/GraphQL',
                    jsonData,
                    { headers: this.headers, timeout }
                );
                return response;
            } catch (err) {
                attempt++;
                const code = err.code || err.response?.status || 'NO_CODE';
                // If we've exhausted attempts, rethrow with helpful context
                if (attempt >= attempts) {
                    err.message = `Failed after ${attempt} attempts: ${err.message}`;
                    throw err;
                }
                // For transient errors, wait and retry
                const backoffMs = 250 * Math.pow(2, attempt); // 500, 1000, ...
                console.warn(`Request attempt ${attempt} failed (code=${code}). Retrying in ${backoffMs}ms...`);
                await new Promise(r => setTimeout(r, backoffMs));
            }
        }
    }

    async getMenu(diningCourt, mealType, date = new Date()) {

        date = date.toLocaleDateString('en-CA');

        const jsonData = {
            operationName: 'getLocationMenu',
            variables: { name: diningCourt, date: date },
            query: `query getLocationMenu($name: String!, $date: Date!) {
                diningCourtByName(name: $name) {
                    dailyMenu(date: $date) { 
                        meals { 
                            name stations { 
                                items { 
                                    hasComponents item { 
                                        itemId name
                                        components { itemId name } 
                                    } 
                                } 
                            } 
                        } 
                    } 
                } 
            }`
        };

        try {
            const response = await this.requestWithRetry(jsonData, 3, 10000);
            return this.parseMenuData(response.data, mealType);
        } catch (error) {
            // Provide clearer messages for common node/network errors
            const code = error.code || (error.response && error.response.status) || 'UNKNOWN';
            return { error: `Failed to fetch menu data (${code}): ${error.message}`, items: [] };
        }
    }

    parseMenuData(data, mealType) {
        const meals = data?.data?.diningCourtByName?.dailyMenu?.meals;
        const foodItems = [];

        for (const meal of meals) {
            if (meal.name !== mealType) continue;
            for (const station of meal.stations) {
                for (const itemAppearance of station.items) {
                    const item = itemAppearance.item;
                    if (itemAppearance.hasComponents) {
                        for (const component of item.components) {
                            foodItems.push({
                                itemId: component.itemId || uuidv4(),
                                name: component.name,
                            });
                        }
                    } else {
                        foodItems.push({
                            itemId: item.itemId  || uuidv4(),
                            name: item.name,
                        });
                    }
                }
            }     
        }

        return {
            error: foodItems.length ? null : `No items found for ${mealType}`,
            items: foodItems
        };
    }

    async getItem(itemId) {
        const jsonData = {
            variables: { id: itemId },
            query: `query getItem($id: Guid!) {  
                itemByItemId(itemId: $id) {
                    itemId    name    ingredients 
                    nutritionFacts { label name }
                    traits { name } 
                } 
            }`
        };

        try {
            const response = await this.requestWithRetry(jsonData, 3, 10000);
            return this.parseItemData(response.data, itemId);
        } catch (error) {
            const code = error.code || (error.response && error.response.status) || 'UNKNOWN';
            return { error: `Failed to fetch item data (${code}): ${error.message}`, item: [] };
        }
    }

    parseItemData(data, itemId) {
        const item = data?.data?.itemByItemId;
        const item_data = [];
        item_data.push({
            itemId: item.itemId,
            name: item.name,
            ingredients: (item.ingredients || []),
            nutritionFacts: (item.nutritionFacts || []).map(n => ({
                dailyValueLabel: n.dailyValueLabel,
                label: n.label,
                name: n.name
            })),
            traits: (item.traits || []).map(t => t.name),
        });
        
        return {
            error: item ? null : `Item data not found for ${itemId}`,
            item: item_data
        };
    }
}

//module.exports = PurdueDiningScraper;
export default PurdueDiningScraper;