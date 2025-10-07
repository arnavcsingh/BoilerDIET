import mysql from 'mysql2/promise';
import fetch from 'node-fetch';

// Mock fallback database for testing without API
// includes food names, calories, nutrition facts based on one serving size
const mockDatabase = {
  "scrambled eggs": { calories: 150, protein: 12, carbs: 1, fat: 11 },
  "pancakes": { calories: 220, protein: 5, carbs: 28, fat: 9 },
  "rice": { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  "grilled cheese": { calories: 340, protein: 10, carbs: 32, fat: 19 },
  "pork potstickers": { calories: 53, protein: 2, carbs: 8, fat: 1.5 }, 
  // more items in actual API database
};

// Converts commonly used units for measurements to grams
function convertToGrams(amount, unit) {
  const conversions = {
    g: 1,
    kg: 1000,
    oz: 28.35,
    lb: 453.6,
    ml: 1, // assume density 1g/ml for liquids
    cup: 240,
    tbsp: 15,
    tsp: 5
  };
  // converts the amount to g with the lowercase formatted unit, in case user uses uppercase
  return amount * (conversions[unit.toLowerCase()] || 1);
}

// sets up the formatting of the data to be fetched from the DB
const configureDB = {
  host: 'localhost',
  user: 'your_user',
  password: 'the_password',
  database: "the_database"
};


// Fetch nutrition facts from our DB
async function fetchFromDB(foodName, grams) {
  const connection = await mysql.createConnection(configureDB);
  // fetches the information stores in the DB in the way its configures
  const [rows] = await connection.execute(
    [foodName.toLowerCase()]
  );
  
  await connection.end();

  if (!rows.length) return null;

  // assume base values for one portion size are per 100g, can be altered to fetch the base quantity for one serving size
  const entry = rows[0]
  const scale = grams / 100; 
  return {
    food: foodName,
    serving: `${grams}g`,
    calories: (entry.calories * scale).toFixed(0),
    protein: (entry.protein * scale).toFixed(1),
    carbs: (entry.carbs * scale).toFixed(1),
    fat: (entry.fat * scale).toFixed(1),
  };
}

// Fetches nutirtion info from mock database if it cant access the API
function fetchFromMock(foodName, grams) {
  const entry = mockDatabase[foodName.toLowerCase()];
  // returns null if food item doesnt exist in food database
  if (!entry) return null;

  // assume base values for one portion size are per 100g, can be altered to fetch the base quantity for one serving size
  const scale = grams / 100; 
  return {
    food: foodName,
    serving: `${grams}g`,
    calories: (entry.calories * scale).toFixed(0),
    protein: (entry.protein * scale).toFixed(1),
    carbs: (entry.carbs * scale).toFixed(1),
    fat: (entry.fat * scale).toFixed(1),
  };
}

// tries DB first, falls back to mock database if not
async function calculateNutrition(foodName, amount, unit = "g", useMock = false) {
  const grams = convertToGrams(amount, unit);

  try {
    if (useMock) return fetchFromMock(foodName, grams);
    return await fetchFromDB(foodName, grams);
  } 
  
  catch (err) {
    console.warn("Falling back to mock database: ", err.message);
    return fetchFromMock(foodName, grams);
  }
}

// finds the nutrition values for a set of items, more realistic for our project
async function calculateMealNutrition(mealItems, useMock = false) {
  const results = [];
  for (const item of mealItems) {
    const nutrition = await calculateNutrition(item.food, item.amount, item.unit, useMock);
    if (nutrition) results.push(nutrition);
  }

  // calculates and returns total nutritional information for all the items combined
  const totals = results.reduce((acc, item) => {
    acc.calories += Number(item.calories);
    acc.protein += Number(item.protein);
    acc.carbs += Number(item.carbs);
    acc.fat += Number(item.fat);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return { items: results, totals };
}
// prompts the user to input the food, amount, and unit (will be changed when implemented into our app to automatically receive the info from the CNNs)
async function main() {
  const promptModule = await import('prompt-sync');
  const prompt = promptModule.default({sigint: true});

  console.log("~~~~~ NUTRITION CALCULATOR ~~~~~");
  console.log("Enter each food item below. Type 'quit' to finish.\n");

  const mealItems = [];

  // gets user input for each food item, loops until the user quits
  while (true) {
    const food = prompt("Food: ");
    if (!food || food.toLowerCase() === "quit") {
      break;
    }

    const amount = Number(prompt("Amount: "));
    const unit = prompt("Unit (g, oz, cup, etc.): ");

    // confirmation of selected item and amount
    mealItems.push({food, amount, unit});
    console.log(`Added ${amount} ${unit} of ${food}\n`);
  }

  if (mealItems.length === 0) {
    console.log("Exiting.");
    return;
  }

  console.log("\nCalculating nutrition...\n");
  const {items, totals} = await calculateMealNutrition(mealItems);

  // logs each items nutritional values based on inputs
  console.log("Meal Breakdown:");
  items.forEach((item) => {
    console.log(
      `- ${item.food}: ${item.calories} kcal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fat}g fat`
    );
  });

// logs total nutrition values
  console.log("\nTotal Nutrition:");
  console.log(
    `Calories: ${totals.calories.toFixed(0)} kcal\n` +
    `Protein: ${totals.protein.toFixed(1)} g\n` +
    `Carbs: ${totals.carbs.toFixed(1)} g\n` +
    `Fat: ${totals.fat.toFixed(1)} g`
  );
}

main();