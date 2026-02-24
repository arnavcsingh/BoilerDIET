# Database Dictionary — `diningDB`

## Overview

`diningDB` supports a nutrition tracking application that catalogs Purdue dining court menus, allows users to log meals, and aggregates nutritional data for analysis and visualization.

---

## Tables

---

## `users`

**Description:** Stores user profile information and authentication credentials.

| Column      | Type         | Constraints      | Description            |
| ----------- | ------------ | ---------------- | ---------------------- |
| `UserId`    | VARCHAR(100) | **PRIMARY KEY**  | Unique user identifier |
| `FirstName` | VARCHAR(100) | NOT NULL         | User’s first name      |
| `LastName`  | VARCHAR(100) | NOT NULL         | User’s last name       |
| `Email`     | VARCHAR(255) | UNIQUE, NOT NULL | User’s email address   |
| `Username`  | VARCHAR(100) | NOT NULL         | Username for login     |
| `Password`  | VARCHAR(255) | NOT NULL         | Hashed password        |

---

## `foods`

**Description:** Central nutrition database containing all food items and their nutritional metadata.

| Column              | Type         | Constraints     | Description                 |
| ------------------- | ------------ | --------------- | --------------------------- |
| `ItemId`            | VARCHAR(100) | **PRIMARY KEY** | Unique food identifier      |
| `Name`              | VARCHAR(100) | NOT NULL        | Food item name              |
| `IngredientDetails` | TEXT         | NULL            | Ingredient list             |
| `Calories`          | FLOAT        | NOT NULL        | Calories per serving        |
| `Protein`           | FLOAT        | NULL            | Protein (g)                 |
| `Traits`            | VARCHAR(255) | NULL            | Dietary traits or allergens |
| `servingSize`       | VARCHAR(100) | NULL            | Serving size description    |
| `caloriesFromFat`   | FLOAT        | NULL            | Calories from fat           |
| `totalFat`          | FLOAT        | NULL            | Total fat (g)               |
| `saturatedFat`      | FLOAT        | NULL            | Saturated fat (g)           |
| `cholesterol`       | FLOAT        | NULL            | Cholesterol (mg)            |
| `sodium`            | FLOAT        | NULL            | Sodium (mg)                 |
| `totalCarbohydrate` | FLOAT        | NULL            | Total carbohydrates (g)     |
| `sugar`             | FLOAT        | NULL            | Total sugar (g)             |
| `addedSugar`        | FLOAT        | NULL            | Added sugar (g)             |
| `dietaryFiber`      | FLOAT        | NULL            | Dietary fiber (g)           |
| `calcium`           | FLOAT        | NULL            | Calcium (mg)                |
| `iron`              | FLOAT        | NULL            | Iron (mg)                   |

---

## `diningcourthistory`

**Description:** Historical record of food items served at Purdue dining courts by date and meal type.

| Column        | Type         | Constraints                      | Description                                  |
| ------------- | ------------ | -------------------------------- | -------------------------------------------- |
| `Id`          | INT          | **PRIMARY KEY**, AUTO_INCREMENT  | Record identifier                            |
| `DiningCourt` | VARCHAR(100) | NOT NULL                         | Dining court name                            |
| `Date`        | DATE         | NOT NULL                         | Date served                                  |
| `MealType`    | ENUM         | NOT NULL                         | Breakfast, Brunch, Lunch, Late Lunch, Dinner |
| `ItemId`      | VARCHAR(100) | **FOREIGN KEY → `foods.ItemId`** | Food item served                             |
| `Volume`      | FLOAT        | NULL                             | Portion size                                 |

---

## `usermeals`

**Description:** Logs individual food items consumed by users.

| Column        | Type         | Constraints                      | Description                      |
| ------------- | ------------ | -------------------------------- | -------------------------------- |
| `Id`          | INT          | **PRIMARY KEY**, AUTO_INCREMENT  | Meal log ID                      |
| `UserId`      | VARCHAR(100) | **FOREIGN KEY → `users.UserId`** | User who consumed the food       |
| `Date`        | DATE         | NOT NULL                         | Date consumed                    |
| `MealType`    | ENUM         | NOT NULL                         | breakfast, brunch, lunch, dinner |
| `DiningCourt` | VARCHAR(100) | NULL                             | Dining court source              |
| `ItemId`      | VARCHAR(100) | **FOREIGN KEY → `foods.ItemId`** | Food item consumed               |
| `Volume`      | FLOAT        | NOT NULL                         | Number of servings               |

---

## `meals`

**Description:** Represents an aggregated meal session with total nutrition.

| Column      | Type     | Constraints                     | Description             |
| ----------- | -------- | ------------------------------- | ----------------------- |
| `Id`        | INT      | **PRIMARY KEY**, AUTO_INCREMENT | Meal session ID         |
| `CreatedAt` | DATETIME | NOT NULL                        | Timestamp of creation   |
| `Calories`  | FLOAT    | NOT NULL                        | Total meal calories     |
| `Protein`   | FLOAT    | NULL                            | Total protein (g)       |
| `Carbs`     | FLOAT    | NULL                            | Total carbohydrates (g) |
| `Fat`       | FLOAT    | NULL                            | Total fat (g)           |

---

## `mealitems`

**Description:** Breaks down each meal session into individual food items.

| Column     | Type         | Constraints                                      | Description            |
| ---------- | ------------ | ------------------------------------------------ | ---------------------- |
| `Id`       | INT          | **PRIMARY KEY**, AUTO_INCREMENT                  | Item record ID         |
| `MealId`   | INT          | **FOREIGN KEY → `meals.Id` (ON DELETE CASCADE)** | Parent meal session    |
| `Name`     | VARCHAR(255) | NOT NULL                                         | Food item name         |
| `Amount`   | FLOAT        | NOT NULL                                         | Quantity consumed      |
| `Unit`     | VARCHAR(50)  | NOT NULL                                         | Measurement unit       |
| `Calories` | FLOAT        | NOT NULL                                         | Calories for this item |
| `Protein`  | FLOAT        | NULL                                             | Protein (g)            |
| `Carbs`    | FLOAT        | NULL                                             | Carbohydrates (g)      |
| `Fat`      | FLOAT        | NULL                                             | Fat (g)                |

---

## Relationships

```text
users (1) ────< usermeals
foods (1) ────< diningcourthistory
foods (1) ────< usermeals
meals (1) ────< mealitems (ON DELETE CASCADE)
```

---

## Design Notes

- Menu availability and user consumption are intentionally separated.
- `foods` acts as the single source of truth for nutrition data.
- `usermeals` captures raw consumption logs.
- `meals` and `mealitems` provide aggregated and detailed meal views.
- Schema supports both dining court–based and manual logging workflows.
