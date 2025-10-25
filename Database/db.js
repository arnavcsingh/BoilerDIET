import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "dummydb",
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
export async function createIngredient({ ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits }) {
  const sql = `
    INSERT INTO Ingredients (ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits]);
  console.log(`Ingredient ${Name} added`);
}

//Bulk insert ingredients
export async function bulkInsertIngredients(ingredients) {
  const sql = `
    INSERT INTO Ingredients (ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits)
    VALUES ?
  `;
  const values = ingredients.map(i => [i.ItemId, i.Name, i.IngredientDetails, i.Calories, i.Protein, i.Fat, i.Carbs, i.Traits]);
  const conn = await pool.getConnection();
  await conn.query(sql, [values]);
  conn.release();
  console.log(`Inserted ${ingredients.length} ingredients`);
}

//Search ingredients
export async function searchIngredients(queryString, limit = 20, offset = 0) {
  const sql = `
    SELECT * FROM Ingredients
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
    SELECT d.*, i.Name, i.Calories, i.Traits
    FROM DiningCourtHistory d
    JOIN Ingredients i ON d.ItemId = i.ItemId
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
    SELECT um.*, i.Name, i.Calories, i.Protein, i.Fat, i.Carbs
    FROM UserMeals um
    JOIN Ingredients i ON um.ItemId = i.ItemId
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