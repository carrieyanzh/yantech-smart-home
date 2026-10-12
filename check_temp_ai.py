import sqlite3
import os
from ollama import Client

# 1. Path to your Node-RED SQLite Database
DB_PATH = "../nodered/data/yantech.db"

# 2. Point to the Windows 10 Ollama Server instance
WINDOWS_PC_IP = "192.168.1.221"
client = Client(host=f"http://{WINDOWS_PC_IP}:11434")

def read_latest_temperature():
    if not os.path.exists(DB_PATH):
        print(f"❌ Error: Database file not found at: {os.path.abspath(DB_PATH)}")
        return None

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # ✅ Query using your verified table and column names
        cursor.execute("SELECT temperature FROM temperature_readings ORDER BY timestamp DESC LIMIT 1;")
        row = cursor.fetchone()
        conn.close()
        
        if row:
            # row[0] extracts the actual value from the tuple
            return row[0] 
        else:
            print("⚠️ The temperature_readings table is empty.")
            return None
            
    except sqlite3.OperationalError as e:
        print(f"❌ SQLite Error: {e}")
        return None

def analyze_with_ai(temp_value):
    print(f"\n🤖 Connecting to Llama 3.2 on Windows to evaluate temperature: {temp_value}°C...")
    
    prompt = (
        f"You are the Yantech Smart Home Assistant. The current indoor room temperature "
        f"sensor reads exactly {temp_value}°C. Give a concise, friendly 1-sentence analysis "
        f"of whether this temperature is pleasant or needs adjustment."
    )
    
    try:
        response = client.chat(
            model='llama3.2:latest',
            messages=[{'role': 'user', 'content': prompt}]
        )
        print("\n🏠 Yantech AI Response:")
        print(response['message']['content'].strip())
        
    except Exception as e:
        print(f"❌ Failed to reach the Windows AI engine: {e}")

if __name__ == "__main__":
    print("🔍 Fetching live data from Yantech smart home databases...")
    current_temperature = read_latest_temperature()
    
    if current_temperature is not None:
        analyze_with_ai(current_temperature)

