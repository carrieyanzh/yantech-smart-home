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
