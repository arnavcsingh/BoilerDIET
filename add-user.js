import mysql from 'mysql2/promise';

const configureDB = {
  host: 'localhost',
  user: 'root',
  password: 'Windowsmongodb1',
  database: 'diningDB'
};

(async () => {
  try {
    const conn = await mysql.createConnection(configureDB);
    await conn.execute(
      INSERT INTO users (UserId, Name) VALUES (?, ?) ON DUPLICATE KEY UPDATE Name = ?,
      ['test@purdue.edu', 'Test User', 'Test User']
    );
    await conn.end();
    console.log(' User test@purdue.edu added to database');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
