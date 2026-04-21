// Client wrapper for the server-side nutrition API.
// The mobile app (Expo/React Native) cannot import Node native modules
// (mysql2, dotenv, etc.), so this wrapper performs HTTP calls to the
// Express API running locally or on your dev machine.

// Configure the API base URL before starting Expo. Recommended options:
// - For Android emulator (AVD): use 'http://10.0.2.2:3000'
// - For Genymotion: 'http://10.0.3.2:3000'
// - For a physical device: use your PC LAN IP, e.g. 'http://192.168.1.42:3000'
// You can set `global.NUTRITION_API_BASE = 'http://192.168.x.y:3000'` in App startup
// or pass `baseUrl` to each function.

const DEFAULT_BASES = [
	'http://10.0.2.2:3000', // Android emulator
	'http://localhost:3000',
	'http://127.0.0.1:3000'
];

function resolveBase(baseUrl) {
	//if (baseUrl) return baseUrl;
	//if (global?.NUTRITION_API_BASE) return global.NUTRITION_API_BASE;
	// Pick the first likely host; the developer can override when needed.
	return 'http://10.186.104.26:3000';
}

async function getJson(url, opts) {
	const res = await fetch(url, opts);
	const text = await res.text();
	try { return JSON.parse(text); } catch (_e) { throw new Error(`Invalid JSON from ${url}: ${text}`); }
}

export async function calculateNutrition(foodName, amount = 100, unit = 'g', useMock = false, baseUrl, servingLabel = '') {
	const base = resolveBase(baseUrl);
	const qs = new URLSearchParams({ food: String(foodName), amount: String(amount), unit, mock: useMock ? 'true' : 'false' });
	if (servingLabel) qs.set('servingLabel', servingLabel);
	const url = `${base.replace(/\/$/, '')}/nutrition?${qs.toString()}`;
	const json = await getJson(url, { method: 'GET' });
	if (!json.ok) throw new Error(json.error || 'nutrition not found');
	return json.data;
}

export async function calculateMealNutrition(mealItems, restrictedAllergens = [], useMock = false, baseUrl) {
	// Call calculateNutrition for each item concurrently via the API.
	const promises = mealItems.map(i => calculateNutrition(i.food, i.amount, i.unit || 'g', useMock, baseUrl).catch(err => null));
	const results = await Promise.all(promises);
	const filtered = results.filter(Boolean);
	const totals = filtered.reduce((acc, item) => {
		acc.calories += Number(item.calories || 0);
		acc.protein += Number(item.protein || 0);
		acc.carbs += Number(item.carbs || 0);
		acc.fat += Number(item.fat || 0);
		return acc;
	}, { calories: 0, protein: 0, carbs: 0, fat: 0 });
	const warnings = [];
	// Simple allergen check
	if (restrictedAllergens.length) {
		for (const it of filtered) {
			const found = (it.allergens || []).map(a => a.toLowerCase()).filter(a => restrictedAllergens.includes(a));
			if (found.length) warnings.push(`WARNING: ${it.food} contains: ${found.join(', ')}`);
		}
	}
	return { items: filtered, totals, warnings };
}

export async function saveMealToDatabase(mealItems, totals, baseUrl) {
	const base = resolveBase(baseUrl);
	const url = `${base.replace(/\/$/, '')}/meal`;
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: mealItems, totals }) });
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'save failed');
	return json;
}

export async function saveUserMeal(payload, baseUrl) {
	const base = resolveBase(baseUrl);
	const url = `${base.replace(/\/$/, '')}/usermeals`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'save failed');
	return json;
}

export async function fetchUserMeals(query, baseUrl) {
	const base = resolveBase(baseUrl);
	const qs = new URLSearchParams();
	Object.entries(query || {}).forEach(([k, v]) => {
		if (v !== undefined && v !== null) qs.set(k, String(v));
	});
	const url = `${base.replace(/\/$/, '')}/usermeals?${qs.toString()}`;
	const res = await fetch(url);
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'fetch failed');
	return json;
}

export async function editUserMeal(id, volume, baseUrl) { // Edits volume of user meal
	const base = resolveBase(baseUrl);
	const url = `${base.replace(/\/$/, '')}/usermeals/${id}`;
	const res = await fetch(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ volume })
	});
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'edit failed');
	return json;
}

export async function deleteUserMeal(id, baseUrl) { // Deletes user meal
	const base = resolveBase(baseUrl);
	const url = `${base.replace(/\/$/, '')}/usermeals/${id}`;
	const res = await fetch(url, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' }
	});
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'delete failed');
	return json;
}

export default { calculateNutrition, calculateMealNutrition, saveMealToDatabase, saveUserMeal, fetchUserMeals, editUserMeal, deleteUserMeal };
