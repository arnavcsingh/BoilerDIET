const PurdueDiningScraper = require('./PurdueDiningScraper');
const schedule = require('node-schedule');
const mysql = require('mysql');

class SaveDiningData {
    constructor() {
        this.diningSchedule = {
            'Hillenbrand': {
                'Monday': [ 'Lunch', 'Late Lunch', 'Dinner'],
                'Tuesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Wednesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Thursday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Friday': [],
                'Saturday': [],
                'Sunday': ['Brunch']
            },
            'Earhart': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Lunch', 'Dinner'],
                'Sunday': ['Lunch', 'Dinner']
            },
            'Windsor': {
                'Monday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Tuesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Wednesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Thursday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Friday': ['Lunch', 'Late Lunch'],
                'Saturday': ['Late Lunch', 'Dinner'],
                'Sunday': ['Lunch', 'Dinner']
            },
            'Wiley': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Lunch', 'Dinner'],
                'Sunday': ['Dinner']
            },
            'Ford': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Breakfast', 'Lunch'],
                'Sunday': ['Breakfast', 'Lunch', 'Dinner']
            }
        };
        this.nutritionMap = {
            "Serving Size": "servingSize",
            "Calories": "calories",
            "Calories from fat": "caloriesFromFat",
            "Total fat": "totalFat",
            "Saturated fat": "saturatedFat",
            "Cholesterol": "cholesterol",
            "Sodium": "sodium",
            "Total Carbohydrate": "totalCarbohydrate",
            "Sugar": "sugar",
            "Added Sugar": "addedSugar",
            "Dietary Fiber": "dietaryFiber",
            "Protein": "protein",
            "Calcium": "calcium",
            "Iron": "iron"
        };
    }

    async saveCurrentMenu(date = new Date()) {
        const scraper = new PurdueDiningScraper();
        for (const diningCourt in this.diningSchedule) {
            for (const mealType in diningCourt) {
                const result = await scraper.getMenu(diningCourt, mealType, date);
                if (result.error) throw error;
                this.saveMenu(diningCourt, mealType, date, result.items);
                this.saveMenuItems(result.items);
            }
        }
    }

    saveMenu(diningCourt, mealType, date, items) {
        let con = mysql.createConnection({
            host: "localhost",
            user: "yourusername",
            password: "yourpassword"
        });

        con.connect(function(error) {
            if (error) throw error;
            let sql = "INSERT INTO menu (diningCourt, date, mealType, itemName, itemId) VALUES ?";
            let values = items.map(item => [diningCourt, date.toISOString().split('T')[0], mealType, item.name, item.itemId]);
            con.query(sql, [values], function (err, result) {
                if (err) throw err;
            });
        });

        con.end();
    }

    saveMenuItems(items) {
        let con = mysql.createConnection({
            host: "localhost",
            user: "yourusername",
            password: "yourpassword"
        });

        con.connect(async function(error) {
            if (error) throw error;
            let sql = "SELECT itemId FROM items";
            con.query(sql, function (err, result, fields) {
                if (err) throw err;
            });
            const existingItemIds = fields.map(f => f.itemId);
            const currentItemIds = items.map(i => i.itemId);
            const scraper = new PurdueDiningScraper();
            for (const itemId of currentItemIds) {
                try {
                    if (!existingItemIds.has(itemId)) {

                        const itemData = await scraper.getItem(itemId);
                        const sql = `
                            INSERT INTO items 
                            (itemId, name, ingredients, traits, servingSize, calories, caloriesFromFat, totalFat, saturatedFat, cholesterol, sodium, totalCarbohydrate, sugar, addedSugar, dietaryFiber, protein, calcium, iron)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        const nutrition = {
                            servingSize: null,
                            calories: null,
                            caloriesFromFat: null,
                            totalFat: null,
                            saturatedFat: null,
                            cholesterol: null,
                            sodium: null,
                            totalCarbohydrate: null,
                            sugar: null,
                            addedSugar: null,
                            dietaryFiber: null,
                            protein: null,
                            calcium: null,
                            iron: null
                        };

                        itemData.nutritionFacts.forEach(n => {
                            const col = nutritionMap[n.name];
                            if (col) {
                                nutrition[col] = n.label;
                            }
                        });

                        const values = [
                            itemData.itemId,
                            itemData.name,
                            JSON.stringify(itemData.ingredients),
                            JSON.stringify(itemData.traits),
                            nutrition.servingSize,
                            nutrition.calories,
                            nutrition.caloriesFromFat,
                            nutrition.totalFat,
                            nutrition.saturatedFat,
                            nutrition.cholesterol,
                            nutrition.sodium,
                            nutrition.totalCarbohydrate,
                            nutrition.sugar,
                            nutrition.addedSugar,
                            nutrition.dietaryFiber,
                            nutrition.protein,
                            nutrition.calcium,
                            nutrition.iron
                        ];

                        con.query(sql, values, function (err, result) {
                            if (err) throw err;
                        });
                    }
                } catch (err) {
                    console.error(`Error for item ${item.itemId}:`, err.message);
                }
            }
        });

        con.end();
    }
}

const saver = new SaveDiningData();

// Schedule daily at midnight
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        await saver.saveCurrentMenu(new Date());
    } catch (error) {
        console.error('Scheduled save error:', error.message);
    }
});