export async function signup(firstName, lastName, email, password) {
    const base = 'http://100.69.156.199:3000';
	const url = `${base.replace(/\/$/, '')}/signup`;
	const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName, email, password }) });
	const json = await res.json();
	if (!json.ok) throw new Error(json.error || 'signup failed');
	return json;
}