import mysql from "mysql2/promise";
import dotenv from "dotenv";
import crypto from "crypto";
import readline from "readline";

dotenv.config();

function randomId(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function randomDate(start, end) {
  const diff = end.getTime() - start.getTime();
  return new Date(start.getTime() + Math.random() * diff);
}

async function updateUserMeal(connection, mealId, newItemId = null, newVolume = null) {
  const updates = [];
  const values = [];

  if (newItemId) {
    updates.push("ItemId = ?");
    values.push(newItemId);
  }
  if (newVolume) {
    updates.push("Volume = ?");
    values.push(newVolume);
  }

  if (updates.length > 0) {
    const sql = `UPDATE UserMeals SET ${updates.join(", ")} WHERE Id = ?`;
    values.push(mealId);
    await connection.execute(sql, values);
    console.log(`Meal ${mealId} updated successfully.`);
  } else {
    console.log("No updates provided.");
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  const dbPassword = process.env.DB_PASSWORD;

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: dbPassword,
    database: "dummydb",
  });

  // --- Insert dummy data (same as before) ---
  const ingredientsList = [
    ["Chicken Sandwich", "Grilled chicken, lettuce, tomato", 400, 25, 10, 40, "none"],
    ["Veggie Salad", "Lettuce, tomato, cucumber, carrots", 150, 5, 5, 20, "vegan, gluten-free"],
    ["Pasta Alfredo", "Pasta with creamy alfredo sauce", 550, 15, 25, 60, "vegetarian"],
    ["Beef Burger", "Beef patty, bun, cheese, lettuce", 700, 30, 40, 50, "none"],
    ["Fruit Bowl", "Mixed fruits", 120, 1, 0.5, 30, "vegan, gluten-free"],
  ];

  const ingredientIds = [];
  for (const meal of ingredientsList) {
    const itemId = randomId();
    ingredientIds.push(itemId);
    await connection.execute(
      `INSERT INTO Ingredients (ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, ...meal]
    );
  }

  const usersList = [];
  for (let i = 0; i < 5; i++) {
    const uid = randomId();
    const fname = `fname${i}`;
    const lname = `lname${i}`;
    const email = `user${i}@purdue.edu`;
    const username = `user${i}`;
    usersList.push([uid, fname, lname, email, username]);
  }

  for (const user of usersList) {
    await connection.execute(
      `INSERT INTO Users (UserId, FirstName, LastName, Email, Username)
       VALUES (?, ?, ?, ?, ?)`,
      user
    );
  }

  const [userRows] = await connection.execute("SELECT UserId FROM Users");
  const userIds = userRows.map((row) => row.UserId);

  const diningHalls = ["Earhart", "Ford", "Hillenbrand", "Wiley", "Windsor"];
  const mealTypes = ["breakfast", "brunch", "lunch", "dinner"];
  const startDate = new Date("2023-01-01");
  const endDate = new Date("2025-01-01");

  // DiningCourtHistory
  for (let i = 0; i < 5; i++) {
    const dining = diningHalls[Math.floor(Math.random() * diningHalls.length)];
    const date = randomDate(startDate, endDate).toISOString().split("T")[0];
    const meal = mealTypes[Math.floor(Math.random() * mealTypes.length)];
    const item = ingredientIds[Math.floor(Math.random() * ingredientIds.length)];
    const volume = (Math.random() * (1.0 - 0.2) + 0.2).toFixed(2);

    await connection.execute(
      `INSERT INTO DiningCourtHistory (DiningCourt, Date, MealType, ItemId, Volume)
       VALUES (?, ?, ?, ?, ?)`,
      [dining, date, meal, item, volume]
    );
  }

  // UserMeals
  for (let i = 0; i < 5; i++) {
    const user = userIds[Math.floor(Math.random() * userIds.length)];
    const date = randomDate(startDate, endDate).toISOString().split("T")[0];
    const meal = mealTypes[Math.floor(Math.random() * mealTypes.length)];
    const dining = diningHalls[Math.floor(Math.random() * diningHalls.length)];
    const item = ingredientIds[Math.floor(Math.random() * ingredientIds.length)];
    const volume = (Math.random() * (1.0 - 0.1) + 0.1).toFixed(2);

    await connection.execute(
      `INSERT INTO UserMeals (UserId, Date, MealType, DiningCourt, ItemId, Volume)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user, date, meal, dining, item, volume]
    );
  }

  console.log("Dummy data inserted for Ingredients, Users, DiningCourtHistory, and UserMeals.");

  // --- Interactive prompt ---
  const mealId = await askQuestion("Enter the Id of the meal you want to update: ");
  const newItemId = await askQuestion("Enter new ItemId (leave blank to skip): ");
  const newVolumeInput = await askQuestion("Enter new Volume (leave blank to skip): ");
  const newVolume = newVolumeInput ? parseFloat(newVolumeInput) : null;

  await updateUserMeal(connection, mealId, newItemId || null, newVolume);

  await connection.end();
}

main().catch((err) => console.error("Error:", err));