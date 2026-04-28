import os
from datetime import date

import pymysql
import pymysql.cursors
import numpy as np
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-mpnet-base-v2"
_MODEL: SentenceTransformer | None = None
_EMBEDDING_DATE: str | None = None
_EMBEDDING_MAP: dict[str, tuple[np.ndarray, float]] = {}


def normalize(text: str) -> str:
    return text.replace("_", " ").lower().strip()


def get_db_connection() -> pymysql.connections.Connection:
    load_dotenv()
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME")
    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER", "root")

    if not database:
        raise ValueError("Missing DB_NAME in environment/.env")

    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        cursorclass=pymysql.cursors.DictCursor,
    )


def get_todays_menu_items() -> list[str]:
    sql = """
        SELECT DISTINCT f.Name
        FROM diningcourthistory d
        JOIN foods f ON d.ItemId = f.ItemId
        WHERE d.Date = %s
          AND f.Name IS NOT NULL
          AND f.Name <> ''
    """

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, (date.today().isoformat(),))
        rows = cursor.fetchall()
    finally:
        conn.close()

    return [row["Name"] for row in rows]


def get_model() -> SentenceTransformer:
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(MODEL_NAME)
    return _MODEL


def get_todays_embedding_map() -> dict[str, tuple[np.ndarray, float]]:
    global _EMBEDDING_DATE, _EMBEDDING_MAP

    today = date.today().isoformat()
    if _EMBEDDING_DATE == today and _EMBEDDING_MAP:
        return _EMBEDDING_MAP

    model = get_model()
    original_menu_items = get_todays_menu_items()
    if not original_menu_items:
        _EMBEDDING_DATE = today
        _EMBEDDING_MAP = {}
        return _EMBEDDING_MAP

    normalized_menu_items = [normalize(item) for item in original_menu_items]
    item_embeddings = model.encode(
        normalized_menu_items,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    _EMBEDDING_MAP = {
        item: (embedding, 0.0)
        for item, embedding in zip(original_menu_items, item_embeddings)
    }
    _EMBEDDING_DATE = today
    return _EMBEDDING_MAP


def top_5_menu_matches(query: str) -> list[str]:
    embedding_map = get_todays_embedding_map()
    if not embedding_map:
        return []

    model = get_model()
    query_embedding = model.encode(
        normalize(query),
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    items = list(embedding_map.keys())
    embeddings = np.stack([embedding_map[item][0] for item in items])

    scores = embeddings @ query_embedding

    top_k = min(5, len(items))
    top_indices = np.argsort(scores)[-top_k:][::-1]

    return [items[index] for index in top_indices]


def get_filtered_menu_items(court: str, meal_type: str | None = None) -> list[str]:
    """Return menu item names for a specific dining court (and optional meal type) for today."""
    sql = """
        SELECT DISTINCT f.Name
        FROM diningcourthistory d
        JOIN foods f ON d.ItemId = f.ItemId
        WHERE d.Date = %s
          AND d.DiningCourt = %s
          AND f.Name IS NOT NULL
          AND f.Name <> ''
    """
    params: list = [date.today().isoformat(), court]

    if meal_type:
        sql += " AND d.MealType = %s"
        params.append(meal_type)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
    finally:
        conn.close()

    return [row["Name"] for row in rows]


def top_5_matches_filtered(query: str, court: str | None, meal_type: str | None) -> list[str]:
    """Top-5 matches filtered to a specific dining court/meal type.
    Falls back to today's full menu if no court is provided or filtered list is empty."""
    if not court:
        return top_5_menu_matches(query)

    filtered_items = get_filtered_menu_items(court, meal_type)
    if not filtered_items:
        # Fallback: no items for that court today, use full menu
        return top_5_menu_matches(query)

    model = get_model()
    query_embedding = model.encode(
        normalize(query),
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    normalized_items = [normalize(item) for item in filtered_items]
    item_embeddings = model.encode(
        normalized_items,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    scores = item_embeddings @ query_embedding
    top_k = min(5, len(filtered_items))
    top_indices = np.argsort(scores)[-top_k:][::-1]

    return [filtered_items[i] for i in top_indices]


def main() -> None:
    print("Loading model once...")
    get_model()
    print("Model ready. Type a query (or 'exit').")

    while True:
        query = input("Enter food query: ").strip()
        if query.lower() in {"exit", "quit", "q"}:
            break
        if not query:
            print("Please enter a non-empty query.")
            continue

        results = top_5_menu_matches(query)
        if not results:
            print("No menu items found for today.")
            continue

        print("Top 5 matches:")
        for index, item in enumerate(results, start=1):
            print(f"{index}. {item}")


if __name__ == "__main__":
    main()