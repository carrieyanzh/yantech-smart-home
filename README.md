## YanTech Smart Home IoT Dashboard 
modern cloud-hybrid architecture 

https://yantech-smart-home.vercel.app/
https://app.turso.tech/carrieyanzh/databases/yantech-smart-home/data

![Dashboard Screenshot](pic1.png)

# React + Vite

```text
Simplified Local-First Architecture

┌─────────────────── LOCAL HOME NETWORK ───────────────────┐   ┌──────────────────── FREE CLOUD TIERS ────────────────────┐
│                                                          │   │                                                          │
│  ┌───────────────┐       ┌──────────────┐                │   │   ┌──────────────────┐       Pulls Data     ┌───────────┐│
│  │ ESP32 Sensors │ ───►  │  Raspberry Pi│  ──────────────┼───┼──►│    Turso Cloud   │ ◄──────────────────  │  Vercel   ││
│  └───────────────┘ MQTT  │  (Node-RED)  │ HTTP POST Sync │   │   │ (SQLite Database)│                      │ (React UI)││
│                          └──────────────┘                │   │   └──────────────────┘                      └───────────┘│
│                                                          │   │            ▲                                             │
│  ┌───────────────┐                                       │   │            │ Queries Data                                │
│  │  Windows PC   │ ◄─────────────────── Ngrok Tunnel ────┼───┼────────────┘                                             │
│  │  (Ollama AI)  │             (For AI Insights Only)    │   │                                                          │
└──────────────────────────────────────────────────────────┘   └──────────────────────────────────────────────────────────┘


```

🏛️ Core Design & Operational Stack

1. Frontend UI Tier (Vercel Cloud Host):
	• Hosts your compiled, responsive React.js + Vite client dashboard application.
	• Deploys automatically out-of-the-box via Git-integrated pipelines whenever you push changes to your GitHub repository.
	• Accessible securely worldwide via cell phones or remote office networks without opening insecure router ports.
2. Data Storage Tier (Turso Cloud Database):
	• A distributed cloud relational database engine built explicitly to scale edge SQLite database architectures natively [0.1].
	• The Role: Decoupled entirely from the local Raspberry Pi storage. If your local Pi reboots or loses electricity, your cloud data charts and metrics history stay completely secure and readable.
3. Data Routing Engine (Local Raspberry Pi Node-RED):
	• Acts as your dedicated local IoT gateway coordinator.
	• Intercepts incoming wireless raw sensor strings from ESP32 transmitter chips over local MQTT data streams.
	• Normalizes payloads into structural query parameters and instantly packages them into clean JSON transactions, sending them up to Turso's secure /v2/pipeline cloud access gate via an HTTP Request node [0.1].
4. AI Computational Layer (Local Windows PC + Ollama):
	• Runs your local Llama 3.2 model engine without incurring expensive cloud subscription processing token fees.
	• Leverages your Windows machine's dedicated graphics processing architecture (GPU) to run prompt inference instantly inside your home network.


Windows Node Setup & Ngrok Configuration

To link your cloud-hosted React dashboard back to your local Windows PC's artificial intelligence model, your machine needs to open a safe internet bridge using Ngrok.


1. How to Install Ngrok on Windows

1). Go to the official Ngrok Signup Page and create a free account.
2). Download the official Ngrok Windows ZIP file executable package.
3). Extract the ngrok.exe file and save it to a clean folder on your computer (e.g., C:\ngrok).
4). Copy your unique account authorization token string from your online Ngrok dashboard portal, open your Windows Command Prompt (cmd), and authenticate your machine:

ngrok config add-authtoken YOUR_ACTUAL_PERSONAL_NGROK_AUTH_TOKEN


2. How to Start the Secure Tunnel Bridge
Open your Windows terminal and instantiate a network forwarding bridge pointing straight to Ollama's local engine port:
ngrok http 11434


3. Setting Strict Windows Environment Cross-Origin Variables
Because web browsers block modern script injection cross-talk by default, you must configure your Windows runtime memory context layout to explicitly trust external requests.

:: 1. Completely close any background instances from locking target files
taskkill /f /im ollama.exe

:: 2. Allow incoming connections from outside the computer (e.g., your Ngrok tunnel)
set OLLAMA_HOST=0.0.0.0

:: 3. Authorize cross-origin browser requests (e.g., your live Vercel web domain)
set OLLAMA_ORIGINS=*

:: 4. Fire up the Ollama background engine explicitly using these variables
ollama serve

⚙️ Production Checklist File Configurations
📄 Node-RED Function Node (Payload Builder)
const token = "YOUR_TURSO_JWT_TOKEN_HERE";

msg.headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
};

msg.payload = {
    "statements": [
        {
            "q": "INSERT INTO temperature_readings (device_id, temperature, unit, timestamp) VALUES (?, ?, ?, ?);",
            "params": [
                msg.payload.device_id || "esp32-livingroom", 
                parseFloat(msg.payload.temperature), 
                "C", 
                new Date().toISOString()
            ]
        }
    ]
};
return msg;

------------------
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3OTQyOTIsImlkIjoiMDFhMTJmMWItNjMwMS03ODFiLTkyZDUtY2ZjODE3YmJiZTIwIiwia2lkIjoiTnBYWVM3Z3lzYzRjVVNicHJ6djZvTC1mWjdaYkV5aWFJYTBoemRsRUVGWSIsInJpZCI6IjRjNTllZDU4LTNkYjgtNGY2YS05OWM3LTVmMzBhMmVkMTYzNCJ9.vlVM-kAkJu4ppu_m9mKl7bcLfTeiViZm7FTkEB-g-boiVBYziPh8ZbsvZic8LjCH9q_GD8h7SFLvUAbU33QBDw" // Your token

msg.headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
};

msg.payload = {
    "statements": [
        {
            "q": "INSERT INTO device_status (device_id, status, timestamp) VALUES (?, ?, ?);",
            "params": [msg.payload.device_id, msg.payload.status, new Date().toISOString()]
        }        
    ]
};

return msg;
---------------------
msg.device_id   = msg.payload.device_id;
msg.temperature = msg.payload.temperature;
msg.unit        = msg.payload.unit;

return msg;

```text
![Dashboard Screenshot](pic2.png)
```


```text
YanTech Smart Home
│
├── ESP32-C3 + DS18B20
│
├── MQTT
│
├── Node-RED
│     └── SQLite
│
├── FastAPI
│     ├── /readings/latest
│     └── /readings/history?minutes=5/30/60
│
└── React
      ├── Latest temperature
      ├── History chart
      ├── 5 min
      ├── 30 min
      ├── 1 hour
      └── Min / Average / Max

```
Node-RED HTTP Request Node URL
https://yantech-smart-home-carrieyanzh.aws-ap-northeast-1.turso.io
method: post

at raspberry 

(venv) pi@raspberrypi:~/yantech-smart-home/fastapi $ python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload




pi@raspberrypi:~/yantech-smart-home $ sqlite3 nodered/data/yantech.db ".tables"
device_status         readings              temperature_readings


We will use a new device ID and separate MQTT topics so that the existing ESP32 telemetry is unaffected.

Existing web dashboard

Add one simulated light switch

FastAPI — port 8000

Validate command and publish MQTT message

MQTT broker + Node-RED

Receive command and update simulated state

SQLite + dashboard

Persist and display the confirmed simulated state

YanTech Lab Smart Home — project roadmap

Phase 1 — API security and reliability

CORS issue solved

Validate API requests and device IDs.

Handle MQTT connection failures and API errors.

Add timeouts, logging, and useful error messages.

Verify database paths and handle database errors safely.

Goal: make the existing system reliable before adding more features.

Phase 2 — MQTT device control

Create a simulated light; no physical switching.

FastAPI publishes ON or OFF commands.

Node-RED validates the commands and simulates the device.

Publish the resulting state through MQTT.

Add a light toggle to the existing dashboard.

Show command status separately from confirmed device state.

Phase 3 — Event history and audit trail

Create an SQLite event-history table.

Record light commands, state changes, device online/offline events, and errors.

Store event type, device ID, timestamp, and details.

Add an event-history view and time filters to the dashboard.

Expose history through FastAPI endpoints.

Phase 4 — Alerts and notifications

Detect high or low temperatures using configurable thresholds.

Alert when the ESP32 goes offline or stops sending readings.

Detect MQTT, API, or database failures.

Display active alerts on the dashboard.

Prevent repeated notifications for the same unresolved problem.

Add alert acknowledgement and recovery messages.

Later, integrate Telegram or email notifications.

Goal: the system tells you when something needs attention, rather than requiring you to watch the dashboard.

Phase 5 — Temperature-based automation

Create configurable rules, such as “if temperature exceeds a threshold, generate an alert.”

Add rule enable/disable controls.

Use time windows, cooldowns, and hysteresis to prevent rapid repeated actions.

Simulate actions such as turning the light on or off.

Record every rule trigger and resulting action in SQLite.

Goal: move from monitoring to rule-based smart-home behavior.

Phase 6 — Enhanced dashboard and reports

Combine temperature, device health, simulated-light state, and alerts.

Add daily and weekly temperature summaries.

Display event counts, device uptime, and alert history.

Improve responsive layout and loading/error indicators.

Keep your existing temperature history, time filters, and min/max/average statistics.

Phase 7 — AI smart-home assistant

Start with read-only AI features, then consider carefully controlled actions.

AI summaries: explain daily temperature trends and device events in plain English.

Anomaly detection: identify unusual temperature changes or missing readings.

Natural-language queries: ask “What happened to my living-room sensor today?”

Rule recommendations: suggest useful automation rules based on historical readings.

AI-assisted troubleshooting: summarize errors and suggest likely causes.

Optional natural-language control: translate requests such as “turn on the simulated light” into validated API commands.

Possible technology: Python, FastAPI, an LLM API, and later a local model if suitable. AI suggestions must be validated, and device actions should require explicit authorization.

Phase 8 — Deployment and professional portfolio

Configure services to restart automatically after a Raspberry Pi reboot.

Add health checks, structured logs, backups, and recovery procedures.

Keep credentials out of source code.

Add automated tests for API endpoints and automation rules.

Document architecture, MQTT topics, database schema, setup, and troubleshooting.

Publish a project README and architecture diagram for your YanTech Lab portfolio.
>>>>>>> 44f94cff6b51f5d7c6f98623cad04a1b3784cc67
