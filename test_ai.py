import sqlite3
from fastapi import FastAPI, HTTPException
from ollama import Client

app = FastAPI(title="Yantech Smart Home Climate AI")

DB_PATH = "../nodered/data/yantech.db"
OLLAMA_HOST = "http://192.168.1.221:11434"

# Connect to the remote Ollama engine on Windows
ai_client = Client(host=OLLAMA_HOST)

def get_latest_temperature():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Query verified database structure
        cursor.execute("SELECT temperature FROM temperature_readings ORDER BY timestamp DESC LIMIT 1;")
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except sqlite3.Error as e:
        print(f"Database extraction failed: {e}")
        return None

@app.get("/api/v1/smart-climate")
def analyze_smart_climate():
    current_temp = get_latest_temperature()
    if current_temp is None:
        raise HTTPException(status_code=500, detail="Unable to read metrics from SQLite.")

    prompt = (
        f"You are the Yantech Smart Home AI manager. The current room temperature sensor "
        f"reads exactly {current_temp}°C. Provide a friendly, one-sentence analysis of whether "
        f"this temperature is comfortable, and suggest a quick smart home action if it is too warm."
    )

    try:
        response = ai_client.chat(
            model='llama3.2:latest',
            messages=[{'role': 'user', 'content': prompt}]
        )
        return {
            "status": "success",
            "current_temperature_celsius": current_temp,
            "ai_home_insight": response['message']['content'].strip()
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama cross-network drop: {str(e)}")

