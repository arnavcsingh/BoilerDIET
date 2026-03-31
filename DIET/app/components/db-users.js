const getApiBase = () => {
  const fromGlobal = global?.NUTRITION_API_BASE;
  const fromEnv = process?.env?.EXPO_PUBLIC_NUTRITION_API_BASE;
  const base = (fromGlobal || fromEnv || 'http://10.0.2.2:3000').replace(/\/$/, '');
  return 'http://10.186.99.255:3000'.replace(/\/$/, '');
};

export async function login(email, password) {
	const url = `${getApiBase()}/login`;
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'login failed');
	return json;
}

export async function signup(firstName, lastName, email, password) {
	const url = `${getApiBase()}/signup`;
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName, email, password }) });
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'signup failed');
	return json;
}

export async function updateUserProfile(userId, firstName, lastName, email, password, currentPassword = '', proteinGoal = 50, carbsGoal = 275, fatGoal = 78) {
	const url = `${getApiBase()}/updateUserProfile`;
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, firstName, lastName, email, password, currentPassword, proteinGoal, carbsGoal, fatGoal }) });
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'update user profile failed');
	return json;
}

export async function getUserData(userId) {
	const url = `${getApiBase()}/getUserData`;
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'get user data failed');
	return json;
}

export default {login, signup, updateUserProfile, getUserData};