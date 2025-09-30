import mysql.connector
from dotenv import load_dotenv
import os
import random, string
from datetime import datetime, timedelta

def random_id(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

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

cursor.execute("SELECT * FROM users LIMIT 1")
b = cursor.fetchall()
if not b:
    print("Adding dummy data.")
    dummy_data = []
    for i in range(20):
        uid = random_id()
        fname = f"fname{i}"
        lname = f"lname{i}"
        email = f"user{i}@purdue.edu"
        username = f"user{i}"
        dummy_data.append((uid, fname, lname, email, username))
    sql = """
    INSERT INTO users (UserId, FirstName, LastName, Email, Username)
    VALUES (%s, %s, %s, %s, %s)
    """
    cursor.executemany(sql, dummy_data)
    cnx.commit()

cursor.execute("SELECT FirstName, LastName, Email, Username FROM users")
all_users = cursor.fetchall()
for user in all_users:
    fname, lname, email, username = user
    print(f"{fname} {lname} with email {email} has username {username}")

cursor.close()
cnx.close()
