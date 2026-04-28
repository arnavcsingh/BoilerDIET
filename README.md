# BoilerDiet

> Many individuals face challenges in accurately monitoring the nutritional content of their meals due to limited time, insufficient nutritional knowledge, and the burden of manual food logging. Overcoming these barriers can empower people to make more informed dietary choices and support healthier lifestyles. In response, we developed an intelligent dietary tracking application that automatically generates nutritional information from user-submitted meal images. The system combines computer vision techniques with Purdue Dining Court data to recognize food items, estimate portion sizes, and compute nutritional values. By integrating a mobile user interface with an inference pipeline, the platform translates advanced dietary assessment methods into a practical, accessible tool that promotes nutritional awareness and healthier eating habits within the Purdue University community.

A Purdue VIP IPAA food-logging mobile app that lets students photograph their dining hall meals, identifies food using a custom YOLO model, and logs nutrition to a personal history.

---

## Architecture

```
Code/
├── DIET/            # Expo / React Native mobile app (TypeScript)
├── server/          # Node.js / Express API server
├── model/           # Python FastAPI inference server (YOLO + embeddings)
├── Database/        # SQL schema and seed scripts
├── modeltorun/      # Active YOLO weights (best.pt)
└── .env             # Shared environment variables (root)
```

Three processes run simultaneously during development:

| Process | Tech | Port |
|---|---|---|
| Mobile app | Expo / React Native | Expo Dev Server |
| API server | Node.js / Express | 3000 |
| Inference server | Python / FastAPI / YOLO | 8000 |

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.11+ with [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
- **MySQL** 8.0+
- **Expo Go** app on your physical device (or an Android/iOS emulator)

---

## Environment Setup

There are two `.env` files:

### `Code/.env` — used by the Node server and Python inference server

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=diningDB
EXPO_PUBLIC_NUTRITION_API_BASE=http://<YOUR_LAN_IP>:3000
```

### `Code/DIET/.env` — used by the Expo app at bundle time

```env
EXPO_PUBLIC_NUTRITION_API_BASE=http://<YOUR_LAN_IP>:3000
```

> Replace `<YOUR_LAN_IP>` with your machine's local network IP (e.g. `192.168.1.42`).  
> On Windows: run `ipconfig` and use the IPv4 address of your Wi-Fi adapter.  
> Both your dev machine and phone must be on the same Wi-Fi network.

### Optional overrides

| Variable | Default | Description |
|---|---|---|
| `INFERENCE_SERVER_URL` | `http://localhost:8000` | Override the FastAPI server URL from Node |
| `YOLO_WEIGHTS_PATH` | `modeltorun/best.pt` | Override the YOLO checkpoint path |
| `PORT` | `3000` | Node server port |

---

## Database Setup

```bash
# From the Code/ directory
mysql -u root -p < Database/db.sql
```

To populate dining hall history data:

```bash
node SaveDiningData.js
```

---

## Running the App

All three processes must be running at the same time. Open three separate terminals.

### 1. Node API Server

```bash
cd Code/server
npm install       # first time only
npm run start-api
```

Runs on `http://localhost:3000`.

### 2. Python Inference Server

```bash
cd Code

# Create and activate the conda environment (first time only)
conda create -n diet_model python=3.11
conda activate diet_model
pip install fastapi uvicorn ultralytics sentence-transformers pymysql python-dotenv pillow

# Start the server
conda activate diet_model
python -m uvicorn model.inference_server:app --host 0.0.0.0 --port 8000 --reload
```

Runs on `http://localhost:8000`. On startup it loads:
- YOLO weights from `modeltorun/best.pt`
- Sentence Transformer model (`all-mpnet-base-v2`)
- Today's dining hall menu embeddings from the database

### 3. Expo Mobile App

```bash
cd Code/DIET
npm install       # first time only
npx expo start -c
```

Scan the QR code with Expo Go on your phone.

---

## App Features

### Camera Flow
1. Tap the camera icon from Home
2. Select your **dining court** and **meal type** in the setup prompt
3. Center your plate in the circle and take a photo
4. The app sends the image to the inference server, which:
   - Runs YOLO food detection
   - Filters today's dining court menu to the selected location/meal type
   - Returns the top-5 closest menu matches via sentence embedding similarity
5. Tap a suggestion to select it, enter servings, and confirm
6. The meal is saved to your history

### Manual Logging
1. Select dining court → meal type → food item from dropdowns
2. Enter serving count
3. View nutrition breakdown and tap **Add to Meal**

### Nutrition Details
- Tap **Details** on any logged food item to see the full nutrition label (calories, fat, carbs, protein, sodium, fiber, etc.)

### Profile & History
- View daily nutrition totals and logged meal history
- Edit or delete individual meal entries
- Track your consecutive logging streak

---

## API Reference

All endpoints are served by the Node server on port 3000.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server liveness check |
| `POST` | `/classify` | Proxy multipart image to FastAPI; returns `{ label, confidence, matches[] }` |
| `GET` | `/nutrition?food=&amount=&unit=` | Nutrition data for a food item |
| `GET` | `/food/:itemId` | Full nutrition label by item ID |
| `GET` | `/diningcourts` | List of all dining courts |
| `GET` | `/mealtypes` | List of meal types |
| `GET` | `/menu?court=&mealType=` | Menu items for a dining court / meal type |
| `GET` | `/menu/all?limit=` | All food items in the database |
| `POST` | `/usermeals` | Save a meal to user history |
| `GET` | `/usermeals?userId=` | Fetch a user's meal history |
| `PUT` | `/usermeals/:id` | Edit a meal entry's serving volume |
| `DELETE` | `/usermeals/:id` | Delete a meal entry |
| `GET` | `/userstreak?userId=` | Get consecutive logging day streak |
| `POST` | `/login` | Authenticate a user |
| `POST` | `/signup` | Register a new user |
| `POST` | `/updateUserProfile` | Update user profile and dietary preferences |

---

## Project Structure

```
DIET/app/
├── _layout.tsx          # Root layout, sets global API base URL
├── index.tsx            # Login / entry screen
├── signup.tsx           # Registration screen
├── home.tsx             # Home / dashboard
├── camera.tsx           # Camera + dining context setup
├── meal_information.tsx # Post-photo food selection & nutrition display
├── manual_logging.tsx   # Manual food logging
├── nutrition.tsx        # Daily nutrition summary
├── NutritionDetails.tsx # Full nutrition label
├── profile.tsx          # User profile & settings
└── components/
    ├── db-nutrition-calc.js  # API helpers: calculateNutrition, saveUserMeal, etc.
    ├── db-users.js           # API helpers: login, signup, getUserData
    ├── Calendar.js           # Calendar UI component
    └── Date.js               # Date formatting utility

model/
├── inference_server.py       # FastAPI app: POST /classify
├── embedding_classification.py  # YOLO label → menu embedding → top-5 matches
└── modeltorun/best.pt        # Active YOLO weights

server/
└── index.js                  # Express API server
```

---

## Team

Purdue VIP — IPAA II (BoilerDiet Spring 2026 and Fall 2026)
