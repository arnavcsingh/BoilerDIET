//const axios = require('axios');
import axios from 'axios';


class PurdueDiningScraper {
    constructor() {
        this.headers = {
            'content-type': 'application/json',
            'origin': 'https://dining.purdue.edu',
            'referer': 'https://dining.purdue.edu',
            'user-agent': 'Mozilla/5.0'
        };        
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
            const response = await axios.post(
                'https://api.hfs.purdue.edu/menus/v3/GraphQL',
                jsonData,
                { headers: this.headers }
            );

            return this.parseMenuData(response.data, mealType);
        } catch (error) {
            return { error: `Failed to fetch menu data: ${error.message}`, items: [] };
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
                                itemId: component.itemId,
                                name: component.name,
                            });
                        }
                    } else {
                        foodItems.push({
                            itemId: item.itemId,
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
            const response = await axios.post(
                'https://api.hfs.purdue.edu/menus/v3/GraphQL',
                jsonData,
                { headers: this.headers }
            );

            return this.parseItemData(response.data, itemId);
        } catch (error) {
            return { error: `Failed to fetch item data: ${error.message}`, item: [] };
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