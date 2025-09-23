import mysql.connector
from dotenv import load_dotenv
import os
import random, string
from datetime import datetime, timedelta

def random_id(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def random_timestamp(start, end):
    delta = end - start
    seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=seconds)

load_dotenv()
db_password = os.getenv("DB_PASSWORD")

cnx = mysql.connector.connect(
    host = "localhost",
    user = "root",
    password = db_password,
    database= "dummydb",
)
cursor = cnx.cursor()
cursor.execute("DESCRIBE users")
columns = cursor.fetchall()
print("Column Info:")
for col in columns:
    print(col)

dininghalls = ["Earhart","Ford","Hillenbrand","Wiley","Windsor"]
types =["breakfast","lunch","dinner"]

cursor.execute("SELECT * FROM users LIMIT 1")
b = cursor.fetchall()
if not b:
    print("Adding dummy data.")
    dummy_data = []
    start = datetime(2023, 1, 1)
    end = datetime(2025, 1, 1)
    for i in range(20):
        uid = random_id()
        fname = f"fname{i}"
        lname = f"lname{i}"
        email = f"user{i}@purdue.edu"
        ts = random_timestamp(start, end).strftime('%Y-%m-%d %H:%M:%S')
        typeMeal = random.choice(types)
        loc = random.choice(dininghalls)
        dummy_data.append((uid, fname, lname, email, ts, typeMeal, loc))
    sql = """
    INSERT INTO users (user_id, fname, lname, email, created_at, type, location)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    cursor.executemany(sql, dummy_data)
    cnx.commit()


cursor.execute("SELECT fname, lname, email, type, location, created_at FROM users")
all_users = cursor.fetchall()
for user in all_users:
    fname, lname, email, meal_type, location, created_at = user
    print(f"{fname} {lname} with email {email} ate {meal_type} at {location} on {created_at}")




cursor.close()
cnx.close()