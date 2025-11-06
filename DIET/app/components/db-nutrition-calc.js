// Mock fallback database for testing without API
// includes food names, calories, nutrition facts based on one serving size
const mockDatabase = {
  "scrambled eggs": { calories: 150, protein: 12, carbs: 1, fat: 11 , allergens: ["eggs"]},
  "pancakes": { calories: 220, protein: 5, carbs: 28, fat: 9, allergens: ["gluten", "milk", "eggs"] },
  "rice": { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, allergens: [""] },
  "grilled cheese": { calories: 340, protein: 10, carbs: 32, fat: 19, allergens: ["gluten", "milk"] },
  "pork potstickers": { calories: 53, protein: 2, carbs: 8, fat: 1.5, allergens: ["pork", "soy", "gluten"] }, 

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
    allergens: entry.allergens || []
  };
}

// tries DB first, falls back to mock database if not
export async function calculateNutrition(foodName, amount, unit = "g", useMock = True) {
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
export async function calculateMealNutrition(mealItems, useMock = false) {
  const results = [];
  const warnings = [];

  for (const item of mealItems) {
    const nutrition = await calculateNutrition(item.food, item.amount, item.unit, useMock);
    results.push(nutrition);
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