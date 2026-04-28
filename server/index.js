import dotenv from "dotenv";
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { calculateNutrition, calculateMealNutrition, saveMealToDatabase} from '../db-nutrition-calc.js';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Helpers
function parseServingLabelToGrams(servingLabel = '') {
  if (!servingLabel) return 100;
  const direct = servingLabel.match(/(\d+\.?\d*)\s*g/i);
  if (direct) return parseFloat(direct[1]);
  const oz = servingLabel.match(/(\d+\.?\d*)\s*oz/i);
  if (oz) return parseFloat(oz[1]) * 28.35;
  return 100;
}

function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.get('/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// POST /classify — proxy multipart image to Python inference server
app.post('/classify', async (req, res) => {
  try {
    const inferenceUrl = process.env.INFERENCE_SERVER_URL ?? 'http://localhost:8000';
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      const response = await fetch(`${inferenceUrl}/classify`, {
        method: 'POST',
        headers: { 'content-type': req.headers['content-type'] },
        body,
      });
      const data = await response.json();
      if (response.ok) {
        console.log('[classify] label:', data?.label || '(none)');
        console.log('[classify] top5 matches:', Array.isArray(data?.matches) ? data.matches : []);
      } else {
        console.error('[classify] inference error response:', data);
      }
      res.status(response.status).json(data);
    });
  } catch (err) {
    console.error('classify proxy error:', err);
    res.status(502).json({ ok: false, error: 'Inference server unreachable' });
  }
});

// GET /nutrition?food=Rice&amount=1&unit=serving
app.get('/nutrition', async (req, res) => {
  try {
    const { food, amount = 1, unit = 'serving', servingLabel = '', mock = 'false' } = req.query;
    console.log('GET /nutrition - food:', food, 'amount:', amount, 'unit:', unit, 'servingLabel:', servingLabel);
    if (!food) return res.status(400).json({ ok: false, error: 'food query required' });
    const useMock = mock === 'true';
    const data = await calculateNutrition(food, Number(amount), unit, useMock, servingLabel);
    console.log('Nutrition result:', data ? 'found' : 'NOT FOUND');
    if (!data) return res.status(404).json({ ok: false, error: 'not found' });
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('GET /nutrition error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Get the nutrition details of a specific item using its itemId
app.get('/food/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ ok: false, error: 'itemId required' });
    
    const conn = await mysql.createConnection(configureDB);
    const [rows] = await conn.execute(
      `SELECT itemId, name, IngredientDetails, Calories, Protein, totalCarbohydrate AS totalCarbs, totalFat,
              saturatedFat, cholesterol, sodium, sugar, addedSugar, dietaryFiber, calcium, iron,
              Traits, servingSize, caloriesFromFat
       FROM foods WHERE itemId = ?`,
      [itemId]
    );
    await conn.end();
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'food not found' });
    }
    
    const food = rows[0];
    const nutritionData = {
      itemId: food.itemId,
      name: food.name,
      ingredientDetails: food.IngredientDetails || '',
      traits: food.Traits || '',
      servingSize: food.servingSize || '',
      calories: Number(food.Calories || 0),
      caloriesFromFat: Number(food.caloriesFromFat || 0),
      totalFat: Number(food.totalFat || 0),
      saturatedFat: Number(food.saturatedFat || 0),
      cholesterol: Number(food.cholesterol || 0),
      sodium: Number(food.sodium || 0),
      totalCarbs: Number(food.totalCarbs || 0),
      sugar: Number(food.sugar || 0),
      addedSugar: Number(food.addedSugar || 0),
      dietaryFiber: Number(food.dietaryFiber || 0),
      protein: Number(food.Protein || 0),
      calcium: Number(food.calcium || 0),
      iron: Number(food.iron || 0),
    };
    
    return res.json({ ok: true, data: nutritionData });
  } catch (err) {
    console.error('GET /food/:itemId error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /meal  { items: [...], totals: { calories, protein, carbs, fat } }
app.post('/meal', async (req, res) => {
  try {
    const { items, totals } = req.body;
    if (!Array.isArray(items) || !totals) return res.status(400).json({ ok: false, error: 'items and totals required' });
    await saveMealToDatabase(items, totals);
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /meal error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Nutrition API listening on port ${port}`));

// DB helper for menu endpoints (reuse same env-based config as db-nutrition-calc)
const configureDB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'MySR00tP@s$!',
  database: process.env.DB_NAME || 'diningDB',
  waitForConnections: true,
  connectionLimit: 5
};

// List known dining courts from diningcourthistory
app.get('/diningcourts', async (req, res) => {
  try {
    console.log('Attempting to connect to DB with config:', { host: configureDB.host, user: configureDB.user, database: configureDB.database, hasPassword: !!configureDB.password });
    const conn = await mysql.createConnection(configureDB);
    console.log('DB connection successful');
    const [rows] = await conn.execute(`SELECT DISTINCT DiningCourt FROM diningcourthistory ORDER BY DiningCourt`);
    console.log('Query result:', rows.length, 'rows returned');
    await conn.end();
    const courts = rows.map(r => (r.DiningCourt || r.diningCourt || r.diningcourt));
    console.log('Courts mapped:', courts);
    return res.json({ ok: true, courts });
  } catch (err) {
    console.error('GET /diningcourts error:', err.code, err.sqlState, err.message);
    return res.status(500).json({ ok: false, error: err.message, code: err.code, sqlState: err.sqlState });
  }
});

// Get menu items for a dining court and optionally filter by meal type
app.get('/menu/all', async (req, res) => {
  try {
    let limit = Number(req.query.limit) || 2000;
    if (limit < 1) limit = 1;
    if (limit > 5000) limit = 5000;

    const conn = await mysql.createConnection(configureDB);
    const [rows] = await conn.query(
      `SELECT DISTINCT ItemId AS itemId, Name AS name, servingSize
       FROM foods
       WHERE Name IS NOT NULL
       ORDER BY Name
       LIMIT ${Math.trunc(limit)}`
    );
    await conn.end();

    const items = rows.map((r) => ({
      label: r.name,
      value: r.itemId || r.name,
      servingSize: r.servingSize || '1 serving',
    }));

    return res.json({ ok: true, items });
  } catch (err) {
    console.error('GET /menu/all error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/menu', async (req, res) => {
  try {
    const { court, mealType } = req.query;
    if (!court) return res.status(400).json({ ok: false, error: 'court query required' });
    
    const conn = await mysql.createConnection(configureDB);
    let sql = `SELECT DISTINCT f.itemId, f.name, f.servingSize, f.Traits FROM diningcourthistory dch
               JOIN foods f ON dch.ItemId = f.itemId
               WHERE dch.DiningCourt = ?`;
    const params = [court];
    
    // Filter by meal type if provided
    if (mealType) {
      sql += ` AND dch.MealType = ?`;
      params.push(mealType);
    }
    
    sql += ` ORDER BY f.name LIMIT 1000`;
    const [rows] = await conn.execute(sql, params);
    await conn.end();
    
    // Deduplicate by food name (first occurrence only) and create unique values
    const seen = new Map();
    const items = [];
    rows.forEach((r, idx) => {
      const foodName = r.name;
      if (!foodName) return;
      const key = foodName.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, true);
        items.push({
          label: foodName,
          value: `${foodName}_${idx}`, // Unique value to prevent React duplicate key errors
          servingSize: r.servingSize || '100g',
          itemId: r.itemId,
          traits: r.Traits || '[]'
        });
      }
    });
    
    return res.json({ ok: true, items });
  } catch (err) {
    console.error('GET /menu error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Get available meal types
app.get('/mealtypes', async (req, res) => {
  try {
    const mealTypes = ['Breakfast', 'Brunch', 'Lunch', 'Late Lunch', 'Dinner'];
    return res.json({ ok: true, mealTypes });
  } catch (err) {
    console.error('GET /mealtypes error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Save a user meal into usermeals table
app.post('/usermeals', async (req, res) => {
  try {
    const { userId, diningCourt = null, mealType = 'lunch', foodName, servings = 1, servingLabel = '' } = req.body || {};
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    if (!foodName) return res.status(400).json({ ok: false, error: 'foodName required' });

    const conn = await mysql.createConnection(configureDB);

    // Resolve itemId by food name
    const [itemRows] = await conn.execute(
      'SELECT itemId FROM foods WHERE LOWER(name) = LOWER(?) LIMIT 1',
      [foodName]
    );
    if (!itemRows.length) {
      await conn.end();
      return res.status(404).json({ ok: false, error: 'food not found' });
    }
    const itemId = itemRows[0].itemId;

    // Store the number of servings directly (no conversion to grams needed since DB stores per-serving)
    const numServings = Number(servings || 1);

    const dateOnly = toLocalDateString();

    await conn.execute(
      `INSERT INTO usermeals (UserId, Date, MealType, DiningCourt, ItemId, Volume)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, dateOnly, mealType, diningCourt, itemId, numServings]
    );

    await conn.end();
    return res.json({ ok: true, volume: numServings, itemId });
  } catch (err) {
    console.error('POST /usermeals error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Get user streak (consecutive days of logging food)
app.get('/userstreak', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });

    const conn = await mysql.createConnection(configureDB);

    // Get all distinct dates the user has logged meals, ordered descending
    const [rows] = await conn.execute(
      `SELECT DISTINCT Date FROM usermeals WHERE UserId = ? ORDER BY Date DESC`,
      [userId]
    );
    await conn.end();

    if (!rows.length) {
      return res.json({ ok: true, streak: 0 });
    }

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dates = rows.map(r => {
      if (r.Date instanceof Date) return toLocalDateString(r.Date);
      return String(r.Date).slice(0, 10);
    });
    let streak = 0;
    let checkDate = today;

    // Check if user logged today or yesterday to start the streak
    const todayStr = toLocalDateString(today);
    const yesterdayStr = toLocalDateString(yesterday);

    if (dates.includes(todayStr)) {
      checkDate = today;
      streak = 1;
    } else if (dates.includes(yesterdayStr)) {
      checkDate = yesterday;
      streak = 1;
    } else {
      // No streak - user hasn't logged today or yesterday
      return res.json({ ok: true, streak: 0 });
    }

    // Count consecutive days backwards
    while (true) {
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = toLocalDateString(prevDate);

      if (dates.includes(prevDateStr)) {
        streak++;
        checkDate = prevDate;
      } else {
        break;
      }
    }

    return res.json({ ok: true, streak });
  } catch (err) {
    console.error('GET /userstreak error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Fetch user meals (optionally by date or date range)
app.get('/usermeals', async (req, res) => {
  try {
    const { userId, date, startDate, endDate } = req.query;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });

    const conn = await mysql.createConnection(configureDB);

    const today = toLocalDateString();
    const start = startDate || date || today;
    const end = endDate || date || today;

    const [rows] = await conn.execute(
      `SELECT um.Id, um.Date, um.MealType, um.DiningCourt, um.ItemId, um.Volume,
              f.name AS foodName, f.servingSize, f.Calories, f.Protein, f.totalCarbohydrate AS carbs, f.totalFat AS fat
       FROM usermeals um
       JOIN foods f ON um.ItemId = f.itemId
       WHERE um.UserId = ? AND um.Date BETWEEN ? AND ?
       ORDER BY um.Date DESC, um.Id DESC`,
      [userId, start, end]
    );

    await conn.end();

    const meals = rows.map(r => {
      const numServings = Number(r.Volume || 0); // Volume now stores number of servings
      const scale = numServings; // No division by 100; nutrition values are already per-serving
      return {
        id: r.Id,
        date: r.Date,
        mealType: r.MealType,
        diningCourt: r.DiningCourt,
        itemId: r.ItemId,
        foodName: r.foodName,
        servingSize: r.servingSize,
        volume: numServings,
        calories: Number(r.Calories || 0) * scale,
        protein: Number(r.Protein || 0) * scale,
        carbs: Number(r.carbs || 0) * scale,
        fat: Number(r.fat || 0) * scale,
      };
    });

    const totals = meals.reduce((acc, m) => {
      acc.calories += m.calories;
      acc.protein += m.protein;
      acc.carbs += m.carbs;
      acc.fat += m.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return res.json({ ok: true, meals, totals });
  } catch (err) {
    console.error('GET /usermeals error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Edits a meal's volume
app.put('/usermeals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { volume } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });
    if (volume === undefined) return res.status(400).json({ ok: false, error: 'volume required' });

    const conn = await mysql.createConnection(configureDB);

    await conn.execute(
      `UPDATE usermeals SET Volume = ? WHERE Id = ?`,
      [Number(volume), id]
    );

    await conn.end();
    return res.json({ ok: true, volume: Number(volume) });
  } catch (err) {
    console.error('PUT /usermeals error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Deletes a meal item
app.delete('/usermeals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });

    const conn = await mysql.createConnection(configureDB);

    await conn.execute(
      `DELETE FROM usermeals WHERE Id = ?`,
      [id]
    );

    await conn.end();
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /usermeals error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /login - Validate user credentials
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });
    if (!password) return res.status(400).json({ ok: false, error: 'password required' });
    
    const conn = await mysql.createConnection(configureDB);
    const [rows] = await conn.execute(
      `SELECT UserId, firstName, lastName, email FROM users WHERE email = ? AND password = ?`,
      [email, password]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Invalid email or password' });
    }

    const user = rows[0];
    console.log("Login successful for user:", email);
    return res.json({ ok: true, user: { userId: user.UserId, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (err) {
    console.error('POST /login error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/signup', async (req, res) => {
  try {
    const {firstName, lastName, email, password } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });
    if (!password ) return res.status(400).json({ ok: false, error: 'password required' });
    const conn = await mysql.createConnection(configureDB);
    const userId = Date.now(); // Generate unique ID from timestamp
    await conn.execute(
      `INSERT INTO users (UserId, firstName, lastName, email, password)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, firstName, lastName, email, password]
    );
    console.log("Successfully signed up user:", email);
    await conn.end();
    return res.json({ ok: true, userId });
  }catch (err) {
    console.error('POST /signup error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/getUserData', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    
    const conn = await mysql.createConnection(configureDB);
    const [rows] = await conn.execute(
      `SELECT UserId, firstName, lastName, email, proteinGoal, carbsGoal, fatGoal, allergens FROM users WHERE UserId = ?`,
      [userId]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const user = rows[0];
    console.log("Retrieved user data for userId:", userId);
    return res.json({ ok: true, userId: user.UserId, firstName: user.firstName, lastName: user.lastName, email: user.email, proteinGoal: user.proteinGoal || 50, carbsGoal: user.carbsGoal || 275, fatGoal: user.fatGoal || 78, allergens: user.allergens || '' });
  } catch (err) {
    console.error('POST /getUserData error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/updateUserProfile', async (req, res) => {
  try {
    const { userId, firstName, lastName, email, password, currentPassword, proteinGoal, carbsGoal, fatGoal, allergens } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
    
    const conn = await mysql.createConnection(configureDB);
    
    // if the user is updating their password, they need to enter their current password as well
    if (password) {
      if (!currentPassword) {
        await conn.end();
        return res.status(400).json({ ok: false, error: 'current password required' });
      }
      
      const [rows] = await conn.execute(
        `SELECT password FROM users WHERE UserId = ?`,
        [userId]
      );
      
      if (rows.length === 0 || rows[0].password !== currentPassword) {
        await conn.end();
        return res.status(401).json({ ok: false, error: 'Current password is incorrect' });
      }
    }
    
    await conn.execute(
      `UPDATE users SET firstName = ?, lastName = ?, email = ?, password = ?, proteinGoal = ?, carbsGoal = ?, fatGoal = ?, allergens = ? WHERE UserId = ?`,
      [firstName, lastName, email, password || null, proteinGoal || 50, carbsGoal || 275, fatGoal || 78, allergens || '', userId]
    );
    await conn.end();
    
    console.log("Updated user profile for userId:", userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /updateUserProfile error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});