import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Mock fallback database for testing without API
// includes food names, calories, nutrition facts based on one serving size
const mockDatabase = {
  "scrambled eggs": { calories: 150, protein: 12, carbs: 1, fat: 11 , allergens: ["eggs"]},
  "pancakes": { calories: 220, protein: 5, carbs: 28, fat: 9, allergens: ["gluten", "milk", "eggs"] },
  "rice": { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, allergens: [""] },
  "grilled cheese": { calories: 340, protein: 10, carbs: 32, fat: 19, allergens: ["gluten", "milk"] },
  "pork potstickers": { calories: 53, protein: 2, carbs: 8, fat: 1.5, allergens: ["pork", "soy", "gluten"] }, 
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
  return amount * (conversions[(unit || '').toLowerCase()] || 1);
}

// DB configuration from environment (.env)
const configureDB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'diningDB',
  waitForConnections: true,
  connectionLimit: 5
};


// Fetch nutrition facts from our DB
async function fetchFromDB(foodName, grams) {
  const connection = await mysql.createConnection(configureDB);
  try {
    // Try to find an exact match (case-insensitive) on the Name column
    const sql = `SELECT * FROM foods WHERE LOWER(Name) = LOWER(?) LIMIT 1`;
    const [rows] = await connection.execute(sql, [foodName]);

    if (!rows || rows.length === 0) return null;

    const entry = rows[0];
    // Normalize column names (some dumps use different casing)
    const rawCalories = entry.calories ?? entry.Calories ?? entry.Calorie ?? null;
    const rawProtein = entry.protein ?? entry.Protein ?? null;
    const rawCarbs = entry.carbs ?? entry.totalCarbohydrate ?? entry.totalcarbohydrate ?? null;
    const rawFat = entry.fat ?? entry.totalFat ?? entry.totalfat ?? null;
    let rawAllergens = entry.allergens ?? entry.Traits ?? null;

    // Normalize allergens into a real array. Handle JSON strings, comma lists, or single values.
    let allergensArr = [];
    if (Array.isArray(rawAllergens)) {
      allergensArr = rawAllergens;
    } else if (typeof rawAllergens === 'string') {
      const s = rawAllergens.trim();
      if (s.length === 0) {
        allergensArr = [];
      } else {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) allergensArr = parsed;
          else if (typeof parsed === 'string') allergensArr = [parsed];
          else allergensArr = [];
        } catch (e) {
          // Not JSON — try comma-separated
          allergensArr = s.split(',').map(a => a.trim()).filter(Boolean);
        }
      }
    } else {
      allergensArr = [];
    }

    const scale = grams / 100;
    const toNumber = v => (v == null ? null : Number(v));
    const calNum = toNumber(rawCalories);
    const protNum = toNumber(rawProtein);
    const carbNum = toNumber(rawCarbs);
    const fatNum = toNumber(rawFat);

    const scaledCalories = calNum != null ? Math.round(calNum * scale) : null;
    const scaledProtein = protNum != null ? Math.round(protNum * scale * 10) / 10 : null;
    const scaledCarbs = carbNum != null ? Math.round(carbNum * scale * 10) / 10 : null;
    const scaledFat = fatNum != null ? Math.round(fatNum * scale * 10) / 10 : null;

    return {
      food: entry.Name || entry.name,
      serving: `${grams}g`,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
      allergens: allergensArr
    };
  } finally {
    await connection.end();
  }
}

// Fetches nutrition info from mock database
function fetchFromMock(foodName, grams) {
  const entry = mockDatabase[foodName.toLowerCase()];
  if (!entry) return null;

  const scale = grams / 100;
  const cal = entry.calories != null ? Math.round(entry.calories * scale) : null;
  const prot = entry.protein != null ? Math.round(entry.protein * scale * 10) / 10 : null;
  const carbs = entry.carbs != null ? Math.round(entry.carbs * scale * 10) / 10 : null;
  const fat = entry.fat != null ? Math.round(entry.fat * scale * 10) / 10 : null;
  const allergens = Array.isArray(entry.allergens) ? entry.allergens : (typeof entry.allergens === 'string' ? entry.allergens.split(',').map(a=>a.trim()).filter(Boolean) : []);

  return {
    food: foodName,
    serving: `${grams}g`,
    calories: cal,
    protein: prot,
    carbs: carbs,
    fat: fat,
    allergens: allergens
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

// function to help users avoid their allergens by providing warnings if their chosen meal contains them, and storing them for reference
function checkAllergens(item, restrictedAllergens) {
  if(!item.allergens?.length) return null;

  const found = item.allergens.filter(a =>
    restrictedAllergens.includes(a.toLowerCase())
  );

  if (found.length > 0) {
    return `WARNING: ${item.food} contains: ${found.join(", ")}`;
  }
  return null;
}

// function to help users work towards their dietary goals of the day (week later on), showing progress with each meal
function compareToDailyGoals(totals, userGoals) {
  const summary = {};

  for (const key of ["calories", "protein", "carbs", "fat"]) {
    const remaining = userGoals[key] - totals[key];
    // prints remaining nutritional data goals for rest of day
    summary[key] = {
      consumed: totals[key].toFixed(1),
      goal: userGoals[key],
      remaining: remaining.toFixed(1),
      status:
        totals[key] > userGoals[key]
          ? "Exceeded"
          : totals[key] < userGoals[key] * 0.9
          ? "Below goal"
          : "Within limit",
    };
  }

  return summary;
}

// finds the nutrition values for a set of items, more realistic for our project
async function calculateMealNutrition(mealItems, restrictedAllergens, useMock = false) {
  const results = [];
  const warnings = [];

  for (const item of mealItems) {
    const nutrition = await calculateNutrition(item.food, item.amount, item.unit, useMock);
    if (nutrition) {
      const warning = checkAllergens(nutrition, restrictedAllergens);
      if (warning) warnings.push(warning);
      results.push(nutrition);
    }
  }

  // calculates and returns total nutritional information for all the items combined
  const totals = results.reduce((acc, item) => {
    acc.calories += Number(item.calories);
    acc.protein += Number(item.protein);
    acc.carbs += Number(item.carbs);
    acc.fat += Number(item.fat);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return { items: results, totals, warnings };
}

// Save a completed meal summary into the database, for recall later
async function saveMealToDatabase(mealItems, totals) {
  try {
    const connection = await mysql.createConnection(configureDB);
    const timestamp = new Date().toISOString();

    // Ensure minimal tables exist: Meals and MealItems
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Meals (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        CreatedAt DATETIME NOT NULL,
        Calories FLOAT,
        Protein FLOAT,
        Carbs FLOAT,
        Fat FLOAT
      ) ENGINE=InnoDB;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS MealItems (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        MealId INT NOT NULL,
        Name VARCHAR(255),
        Amount FLOAT,
        Unit VARCHAR(50),
        Calories FLOAT,
        Protein FLOAT,
        Carbs FLOAT,
        Fat FLOAT,
        FOREIGN KEY (MealId) REFERENCES Meals(Id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Insert meal summary
    const [mealResult] = await connection.execute(
      `INSERT INTO Meals (CreatedAt, Calories, Protein, Carbs, Fat) VALUES (?, ?, ?, ?, ?)`,
      [timestamp, totals.calories, totals.protein, totals.carbs, totals.fat]
    );
    const mealId = mealResult.insertId;

    // Insert each item linked to the meal
    for (const item of mealItems) {
      await connection.execute(
        `INSERT INTO MealItems (MealId, Name, Amount, Unit, Calories, Protein, Carbs, Fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mealId, item.food, item.amount, item.unit, item.calories, item.protein, item.carbs, item.fat]
      );
    }

    await connection.end();
    console.log(`Meal saved successfully with ID: ${mealId}`);
  } catch (error) {
    console.error("Error saving meal to database:", error.message);
  }
}

// Calculates a health score from 0–100 based on balance and moderation, for dieatray tracking purposes
function calculateHealthScore(totals, userGoals) {
  /// calculates user consumption ratios
  const calorieRatio = totals.calories / userGoals.calories;
  const proteinRatio = totals.protein / userGoals.protein;
  const carbRatio = totals.carbs / userGoals.carbs;
  const fatRatio = totals.fat / userGoals.fat;

  // Ideal ratios near 1.0, where they achieve their goals give the best score
  // excessive consumption also results in deductions, promoting balance
  const balancePenalty =
    Math.abs(1 - proteinRatio) * 15 +
    Math.abs(1 - carbRatio) * 10 +
    Math.abs(1 - fatRatio) * 10 +
    Math.abs(1 - calorieRatio) * 20;
  // returns results
  const score = Math.max(0, 100 - balancePenalty);
  return score.toFixed(1);
}

// prompts the user to input the food, amount, and unit (will be changed when implemented into our app to automatically receive the info from the CNNs)
async function main() {
  const promptModule = await import('prompt-sync');
  const prompt = promptModule.default({sigint: true});

  console.log("~~~~~ NUTRITION CALCULATOR ~~~~~");
  console.log("Enter each food item below. Type 'quit' to finish.\n");

  // user ipnut of allergens
  const restructedInput = prompt("Enter allergen restrictions: ");
  const restrictedAllergens = restructedInput.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
  
  // user input of nutritional goals for each type
  console.log("\nSet your daily nutrition goals (press Enter to use defaults).");
  const userGoals = {
    calories: Number(prompt("Daily calorie goal (default 2000): ")) || 2000,
    protein: Number(prompt("Daily protein goal (default 50g): ")) || 50,
    carbs: Number(prompt("Daily carbs goal (default 275g): ")) || 275,
    fat: Number(prompt("Daily fat goal (default 70g): ")) || 70
  };

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
  const {items, totals, warnings} = await calculateMealNutrition(mealItems, restrictedAllergens, true);
//  const summary = summarizeNutrition(totals, items.length);

  // logs each items nutritional values based on inputs
  console.log("Meal Breakdown:");
  items.forEach((item) => {
    console.log(
      `- ${item.food}: ${item.calories} kcal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fat}g fat`
    );
  });

  // provides warnings if allergens detected
  if (warnings.length > 0) {
    console.log("\nAllergen Warnings: ");
    warnings.forEach(w => console.log(w));
  }

// logs total nutrition values
  console.log("\nTotal Nutrition:");
  console.log(
    `Calories: ${totals.calories.toFixed(0)} kcal\n` +
    `Protein: ${totals.protein.toFixed(1)} g\n` +
    `Carbs: ${totals.carbs.toFixed(1)} g\n` +
    `Fat: ${totals.fat.toFixed(1)} g`
  );

  // logs remainder of goals
  const goalComparison = compareToDailyGoals(totals, userGoals);
  console.log("\nComparison to Daily Goals:");
  for (const [nutrient, data] of Object.entries(goalComparison)) {
    console.log(
      `${nutrient.toUpperCase()}: Consumed ${data.consumed}/${data.goal} (${data.status}, ${data.remaining} remaining)`
    );
  }

  // calls the saving function to log the meal information onto the database, to be used in later funcions regarding dietary tracking over a week/month
  await saveMealToDatabase(items, totals);

  // Calculate health score based on meal consumption (to be implemented across several meals for 1 day)
  const healthScore = calculateHealthScore(totals, userGoals);
  console.log(`\nHealth Score: ${healthScore}/100`);

}

// Only run interactive main when executed directly, not when imported for tests
if (process.argv[1] && process.argv[1].toLowerCase().endsWith('db-nutrition-calc.js')) {
  main();
}

// Export useful functions for programmatic use / testing
export { calculateMealNutrition, saveMealToDatabase, calculateNutrition };