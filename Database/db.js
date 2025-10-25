import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

//path: & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe" -u root -p diningDB > newDB.sql

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//Utility function for executing prepared statements safely
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// USERS

//Create new user
export async function createUser({ UserId, FirstName, LastName, Email, Username }) {
  const sql = `
    INSERT INTO Users (UserId, FirstName, LastName, Email, Username)
    VALUES (?, ?, ?, ?, ?)
  `;
  await query(sql, [UserId, FirstName, LastName, Email, Username]);
  console.log(`User ${Username} added`);
}

//Get user by ID
export async function getUserById(UserId) {
  const rows = await query(`SELECT * FROM Users WHERE UserId = ?`, [UserId]);
  return rows[0] || null;
}

//Get user by username
export async function getUserByUsername(Username) {
  const rows = await query(`SELECT * FROM Users WHERE Username = ?`, [Username]);
  return rows[0] || null;
}

// INGREDIENTS

//Create single ingredient
export async function createIngredient(food) {
  const sql = `
    INSERT INTO Foods 
    (ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits,
     servingSize, caloriesFromFat, totalFat, saturatedFat, cholesterol, sodium,
     totalCarbohydrate, sugar, addedSugar, dietaryFiber, calcium, iron)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    food.ItemId,
    food.Name,
    food.IngredientDetails,
    food.Calories,
    food.Protein,
    food.Fat,
    food.Carbs,
    food.Traits,
    food.servingSize,
    food.caloriesFromFat,
    food.totalFat,
    food.saturatedFat,
    food.cholesterol,
    food.sodium,
    food.totalCarbohydrate,
    food.sugar,
    food.addedSugar,
    food.dietaryFiber,
    food.calcium,
    food.iron,
  ];
  await query(sql, values);
  console.log(`Ingredient ${food.Name} added`);
}

//Bulk insert ingredients
export async function bulkInsertIngredients(foods) {
  const sql = `
    INSERT INTO Foods
    (ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits,
     servingSize, caloriesFromFat, totalFat, saturatedFat, cholesterol, sodium,
     totalCarbohydrate, sugar, addedSugar, dietaryFiber, calcium, iron)
    VALUES ?
  `;
  const values = foods.map(f => [
    f.ItemId, f.Name, f.IngredientDetails, f.Calories, f.Protein, f.Fat, f.Carbs, f.Traits,
    f.servingSize, f.caloriesFromFat, f.totalFat, f.saturatedFat, f.cholesterol, f.sodium,
    f.totalCarbohydrate, f.sugar, f.addedSugar, f.dietaryFiber, f.calcium, f.iron
  ]);
  const conn = await pool.getConnection();
  await conn.query(sql, [values]);
  conn.release();
  console.log(`Inserted ${foods.length} ingredients`);
}

//Search ingredients
export async function searchIngredients(queryString, limit = 20, offset = 0) {
  const sql = `
    SELECT * FROM Foods
    WHERE Name LIKE CONCAT('%', ?, '%')
    LIMIT ? OFFSET ?
  `;
  return await query(sql, [queryString, limit, offset]);
}

// DINING COURT HISTORY

// Create single history entry
export async function createDiningCourtHistoryEntry({ DiningCourt, Date, MealType, ItemId, Volume }) {
  const sql = `
    INSERT INTO DiningCourtHistory (DiningCourt, Date, MealType, ItemId, Volume)
    VALUES (?, ?, ?, ?, ?)
  `;
  await query(sql, [DiningCourt, Date, MealType, ItemId, Volume]);
  console.log(`Added menu item ${ItemId} for ${DiningCourt} on ${Date}`);
}

//Get dining court menu for date & meal type
export async function getDiningCourtMenu(DiningCourt, Date, MealType) {
  const sql = `
    SELECT d.*, f.Name, f.Calories, f.Protein, f.Fat, f.Carbs, f.Traits,
           f.servingSize, f.caloriesFromFat, f.totalFat, f.saturatedFat, f.cholesterol,
           f.sodium, f.totalCarbohydrate, f.sugar, f.addedSugar, f.dietaryFiber, f.calcium, f.iron
    FROM DiningCourtHistory d
    JOIN Foods f ON d.ItemId = f.ItemId
    WHERE d.DiningCourt = ? AND d.Date = ? AND d.MealType = ?
  `;
  return await query(sql, [DiningCourt, Date, MealType]);
}

// USER MEALS

//Create a user meal
export async function createUserMeal({ UserId, Date, MealType, DiningCourt, ItemId, Volume }) {
  const sql = `
    INSERT INTO UserMeals (UserId, Date, MealType, DiningCourt, ItemId, Volume)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [UserId, Date, MealType, DiningCourt, ItemId, Volume]);
  console.log(`Logged meal for user ${UserId}`);
}

//Delete user meal
export async function deleteUserMeal(mealId, userId) {
  const sql = `DELETE FROM UserMeals WHERE Id = ? AND UserId = ?`;
  const result = await query(sql, [mealId, userId]);
  console.log(result.affectedRows ? `Meal ${mealId} deleted` : `No matching meal found`);
}

//Get meals for user (optionally by date/meal type)
export async function getUserMeals(UserId, { startDate = null, endDate = null, mealType = null } = {}) {
  let sql = `
    SELECT um.*, f.Name, f.Calories, f.Protein, f.Fat, f.Carbs, f.Traits,
           f.servingSize, f.caloriesFromFat, f.totalFat, f.saturatedFat, f.cholesterol,
           f.sodium, f.totalCarbohydrate, f.sugar, f.addedSugar, f.dietaryFiber, f.calcium, f.iron
    FROM UserMeals um
    JOIN Foods f ON um.ItemId = f.ItemId
    WHERE um.UserId = ?
  `;
  const params = [UserId];
  if (startDate && endDate) {
    sql += ` AND um.Date BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }
  if (mealType) {
    sql += ` AND um.MealType = ?`;
    params.push(mealType);
  }
  sql += ` ORDER BY um.Date DESC`;
  return await query(sql, params);
}

// Export the pool for reuse
export default pool;