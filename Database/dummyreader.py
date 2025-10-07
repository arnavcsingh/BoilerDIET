import mysql.connector
from dotenv import load_dotenv
import os
import random, string
from datetime import datetime, timedelta

def random_id(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def random_date(start, end):
    delta = end - start
    seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=seconds)

def update_user_meal(cursor, cnx, meal_id, new_item_id=None, new_volume=None):
    updates = []
    values = []

    if new_item_id:
        updates.append("ItemId=%s")
        values.append(new_item_id)
    if new_volume:
        updates.append("Volume=%s")
        values.append(new_volume)

    if updates:
        sql = f"UPDATE UserMeals SET {', '.join(updates)} WHERE Id=%s"
        values.append(meal_id)
        cursor.execute(sql, tuple(values))
        cnx.commit()


load_dotenv()
db_password = os.getenv("DB_PASSWORD")

cnx = mysql.connector.connect(
    host="localhost",
    user="root",
    password=db_password,
    database="dummydb"
)
cursor = cnx.cursor()

ingredients_list = [
    ("Chicken Sandwich", "Grilled chicken, lettuce, tomato", 400, 25, 10, 40, "none"),
    ("Veggie Salad", "Lettuce, tomato, cucumber, carrots", 150, 5, 5, 20, "vegan, gluten-free"),
    ("Pasta Alfredo", "Pasta with creamy alfredo sauce", 550, 15, 25, 60, "vegetarian"),
    ("Beef Burger", "Beef patty, bun, cheese, lettuce", 700, 30, 40, 50, "none"),
    ("Fruit Bowl", "Mixed fruits", 120, 1, 0.5, 30, "vegan, gluten-free")
]

cursor.executemany(
    "INSERT INTO Ingredients (ItemId, Name, IngredientDetails, Calories, Protein, Fat, Carbs, Traits) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
    [(random_id(), *meal) for meal in ingredients_list]
)
cnx.commit()

cursor.execute("SELECT ItemId FROM Ingredients")
ingredient_ids = [row[0] for row in cursor.fetchall()]

users_list = []
for i in range(5):
    uid = random_id()
    fname = f"fname{i}"
    lname = f"lname{i}"
    email = f"user{i}@purdue.edu"
    username = f"user{i}"
    users_list.append((uid, fname, lname, email, username))

cursor.executemany(
    "INSERT INTO Users (UserId, FirstName, LastName, Email, Username) VALUES (%s,%s,%s,%s,%s)",
    users_list
)
cnx.commit()

cursor.execute("SELECT UserId FROM Users")
user_ids = [row[0] for row in cursor.fetchall()]

dininghalls = ["Earhart", "Ford", "Hillenbrand", "Wiley", "Windsor"]
meal_types = ["breakfast", "brunch", "lunch", "dinner"]

start_date = datetime(2023, 1, 1)
end_date = datetime(2025, 1, 1)

dch_data = []
for _ in range(5):
    dining = random.choice(dininghalls)
    date = random_date(start_date, end_date).date()
    meal = random.choice(meal_types)
    item = random.choice(ingredient_ids)
    volume = round(random.uniform(0.2, 1.0), 2)
    dch_data.append((dining, date, meal, item, volume))

cursor.executemany(
    "INSERT INTO DiningCourtHistory (DiningCourt, Date, MealType, ItemId, Volume) VALUES (%s,%s,%s,%s,%s)",
    dch_data
)
cnx.commit()

um_data = []
for _ in range(5):
    user = random.choice(user_ids)
    date = random_date(start_date, end_date).date()
    meal = random.choice(meal_types)
    dining = random.choice(dininghalls)
    item = random.choice(ingredient_ids)
    volume = round(random.uniform(0.1, 1.0), 2)
    um_data.append((user, date, meal, dining, item, volume))

cursor.executemany(
    "INSERT INTO UserMeals (UserId, Date, MealType, DiningCourt, ItemId, Volume) VALUES (%s,%s,%s,%s,%s,%s)",
    um_data
)
cnx.commit()

print("Dummy data inserted for Ingredients, Users, DiningCourtHistory, and UserMeals.")

cursor.close()
cnx.close()