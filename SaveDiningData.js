import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
dotenv.config();
import PurdueDiningScraper from './PurdueDiningScraper.js';
import schedule from 'node-schedule';
import mysql from 'mysql2';
//import mysql from 'mysql';
//const PurdueDiningScraper = require('./PurdueDiningScraper');
//const schedule = require('node-schedule');
//const mysql = require('mysql');

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
        const weekday = this.getDayOfWeek(date);
        for (const [diningCourt, schedule] of Object.entries(this.diningSchedule)) {
            const meals = schedule[weekday] || [];
            for (const mealType of meals) {
                console.log(`Fetching menu for ${diningCourt} - ${mealType} (${date.toISOString().split('T')[0]})`);
                const result = await scraper.getMenu(diningCourt, mealType, date);
                if (result.error) {
                    console.error(`Error fetching ${diningCourt} - ${mealType}:`, result.error);
                    continue;
                }
                await this.saveMenuItems(result.items);
                await this.saveMenu(diningCourt, mealType, date, result.items);
            }
        }
    }
    getDayOfWeek(date) {
        return date.toLocaleString('en-US', { weekday: 'long' });
    }
    saveMenu(diningCourt, mealType, date, items) {
        if (items.length === 0) return; // skip empty arrays
        let con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        let foodValues = items.map(item => [item.itemId || uuidv4(), item.name]);
        let foodSql = "INSERT IGNORE INTO foods (ItemId, Name) VALUES ?";
        con.query(foodSql, [foodValues], function(err, result) {
            if (err) throw err;
            let historyValues = items.map(item => [
                diningCourt,
                date.toISOString().split('T')[0],
                mealType,
                item.itemId,
                item.volume
            ]);

            let historySql = "INSERT INTO diningcourthistory (DiningCourt, Date, MealType, ItemId, Volume) VALUES ?";
            con.query(historySql, [historyValues], function(err, result) {
                if (err) throw err;
                con.end();
            });
        });
    }
    saveMenuItems(items) {
        function cleanNumber(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === "string") {
            value = value.toLowerCase().trim();
            value = value.replace(/,/g, '');
            value = value.replace(/[^0-9.]/g, '');
            if (value === "") return null;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
        }
        const nutritionMap = this.nutritionMap;
        let con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        return new Promise((resolve, reject) => {
            con.connect(async (error) => {
                if (error) return reject(error);
                let sql = "SELECT itemId FROM foods";
                const existingItemIds = await new Promise((resolve, reject) => {
                    con.query(sql, (err, results) => {
                        if (err) reject(err);
                        else resolve(results.map(f => f.itemId));
                    });
                });
                const currentItemIds = items.map(i => i.itemId);
                const scraper = new PurdueDiningScraper();
                function itemHasNutrition(itemId) {
                    return new Promise((resolve) => {
                        con.query(
                            "SELECT calories FROM foods WHERE itemId = ?",
                            [itemId],
                            (err, results) => {
                                if (err || results.length === 0) return resolve(false);
                                resolve(results[0].calories !== null);
                            }
                        );
                    });
                }
                for (const itemId of currentItemIds) {
                    try {
                        if (!existingItemIds.includes(itemId) || !(await itemHasNutrition(itemId))) {
                            const itemDataResponse = await scraper.getItem(itemId);
                            if (itemDataResponse.error) {
                                console.warn(`Skipping ${itemId}: ${itemDataResponse.error}`);
                                continue;
                            }
                            const itemData = itemDataResponse.item[0];
                            console.log(`Got nutrition for ${itemData.name}: ${itemData.nutritionFacts.length} facts`);
                            const sql = `
                                INSERT IGNORE INTO foods
                                (itemId, name, IngredientDetails, traits, servingSize, calories, caloriesFromFat, totalFat, saturatedFat, cholesterol, sodium, totalCarbohydrate, sugar, addedSugar, dietaryFiber, protein, calcium, iron)
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
                            if (itemData.nutritionFacts && Array.isArray(itemData.nutritionFacts)) {
                                itemData.nutritionFacts.forEach(n => {
                                    const col = nutritionMap[n.name];
                                    if (col) {
                                        if (col === "servingSize" || col === "calories") {
                                            nutrition[col] = n.label;
                                        } else {
                                            nutrition[col] = cleanNumber(n.label);
                                        }
                                    }
                                });
                            }

                            const values = [
                                itemData.itemId || uuidv4(),
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

                            await new Promise((resolve, reject) => {
                                con.query(sql, values, (err, result) => {
                                    if (err) reject(err);
                                    else resolve(result);
                                });
                            });
                        }
                    } catch (err) {
                        console.error(`Error for item ${itemId}:`, err.message);
                    }
                }
                con.end();
                resolve();
            });
        });
    }
}

const saver = new SaveDiningData();
//Testing to ensure it populates database
(async () => {
    try {
        console.log("=== Manual test run started ===");
        await saver.saveCurrentMenu(new Date());
        console.log("=== Manual test run completed ===");
    } catch (error) {
        console.error("Manual test run error:", error.message);
    }
})();

//Commenting out, just testing right now.

// Schedule daily at midnight
//schedule.scheduleJob('0 0 * * *', async () => {
//    try {
//        await saver.saveCurrentMenu(new Date());
//    } catch (error) {
//        console.error('Scheduled save error:', error.message);
//    }
//});