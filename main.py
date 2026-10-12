from datetime import timedelta
from zoneinfo import ZoneInfo
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
import sqlite3
from pathlib import Path
from contextlib import closing
from ollama import Client


DB_PATH = "/home/pi/yantech-smart-home/nodered/data/yantech.db"
BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR.parent / "nodered" / "data" / "yantech.db"

app = FastAPI(title="YanTech Smart Home API")

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://192.168.1.122:1880",
        "https://vercel.app",  # <--- Add your free hosting URL here
    ],
    #allow_credentials=True,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    #allow_headers=["*"],
    allow_headers=["Content-Type"],
)

# --------------------------------------------------
# Pydantic model
# --------------------------------------------------
class Reading(BaseModel):
    device_id: str = Field(
        min_length = 1,
        max_length = 64,  
        pattern = r"^[A-Za-z0-9_-]+$"
    )
    temperature: float = Field(
        ge=-40,
        le=125,
        allow_inf_nan=False
    )

    unit: Literal["C"] = "C"
     
    class Config:
        extra = "forbid" 


# --------------------------------------------------
def get_connection():
    conn = sqlite3.connect(DATABASE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


# --------------------------------
@app.get("/")
def root():
    return {
        "application": "YanTech Smart Home API",
        "status": "running"
    }

@app.get("/api/v1/smart-climate")
def analyze_smart_climate():
    current_temp = get_latest_temperature()
    if current_temp is None:
        raise HTTPException(status_code=500, detail="Unable to read metrics from SQLite.")
    
    prompt = (
        f"You are the Yantech Smart Home AI manager. The room temperature sensor reads {current_temp}°C.\n"
        f"Our strict comfort target rule is exactly 20°C to 28°C.\n"
        f"Provide a friendly, single-sentence analysis comparing the reading to our rule. "
        f"If it is above 28°C, explicitly state it is too warm and suggest a specific smart home action."
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




# --------------------------------
@app.get("/readings")
def get_readings():
    timestamp = datetime.now(timezone.utc).isoformat()
    with closing(get_connection()) as conn:
        rows = conn.execute("""
            SELECT id, device_id, temperature, unit, timestamp
            FROM temperature_readings
            ORDER BY timestamp DESC
            LIMIT 20
        """).fetchall()

    return [dict(row) for row in rows]

# --------------------------------
@app.get("/readings/latest")
def get_latest_reading():
    timestamp = datetime.now(timezone.utc).isoformat()
    with closing(get_connection()) as conn:
        row = conn.execute("""
            SELECT id, device_id, temperature, unit, timestamp
            FROM temperature_readings
            ORDER BY timestamp DESC
            LIMIT 1
        """).fetchone()


    if row is None:
        return {"message": "No readings found"}

    return dict(row)

# --------------------------------
@app.get("/readings/history")
def get_reading_history(
    minutes: int = Query(default=30, ge=1, le=10080)
):
    with closing(get_connection()) as conn:
        rows = conn.execute("""
            SELECT id, device_id, temperature, unit, timestamp
            FROM temperature_readings
            WHERE datetime(timestamp) >= datetime('now', ?)
            ORDER BY timestamp DESC
        """, (f"-{minutes} minutes",)).fetchall()

    return [
        {
            "id": row["id"],
            "device_id": row["device_id"],
            "temperature": row["temperature"],
            "unit": row["unit"],
            "timestamp": row["timestamp"]
        }
        for row in rows
    ]


# --------------------------------
@app.get("/devices/status")
def get_device_status():
    with closing(get_connection()) as conn:
        rows = conn.execute("""
            SELECT device_id, status, timestamp
            FROM device_status
            WHERE id IN (
                SELECT MAX(id)
                FROM device_status
                GROUP BY device_id
            )
        """).fetchall()

    return [dict(row) for row in rows]


# --------------------------------
@app.get("/alerts/temperature")
def get_temperature_alert(
    threshold: float = Query(default=30.0, ge=-40, le=125)
):
    with closing(get_connection()) as conn:
        row = conn.execute(
            """
            SELECT id, device_id, temperature, unit, timestamp
            FROM temperature_readings
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()

        if row is None:
            return {
                "status": "no_data",
                "alert": False,
                "message": "No temperature readings available",
            }

        temperature = row["temperature"]
        status = "high" if temperature >= threshold else "normal"

        previous = conn.execute(
            """
            SELECT status
            FROM temperature_alert_events
            WHERE device_id = ? AND threshold = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (row["device_id"], threshold),
        ).fetchone()

        state_changed = (
            previous is None or previous["status"] != status
        )

        if state_changed:
            conn.execute(
                """
                INSERT INTO temperature_alert_events
                    (device_id, temperature, threshold, status, timestamp)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    row["device_id"],
                    temperature,
                    threshold,
                    status,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            conn.commit()

    return {
        "status": status,
        "alert": status == "high",
        "threshold": threshold,
        "state_changed": state_changed,
        "message": (
            f"High temperature: {temperature}°C"
            if status == "high"
            else f"Temperature is normal: {temperature}°C"
        ),
        "reading": {
            "id": row["id"],
            "device_id": row["device_id"],
            "temperature": temperature,
            "unit": row["unit"],
            "timestamp": row["timestamp"],
        },
    }




@app.get("/alerts/history")
def get_alert_history(
    limit: int = Query(default=50, ge=1, le=500)
):
    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT id, device_id, temperature,
                   threshold, status, timestamp
            FROM temperature_alert_events
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [dict(row) for row in rows]


@app.get("/ai/summary/daily")
def get_daily_summary(
    day: str | None = Query(
        default=None,
        description="Date in YYYY-MM-DD format; defaults to Singapore today",
    )
):
    singapore_tz = ZoneInfo("Asia/Singapore")

    # Default to today's date in Singapore.
    if day is None:
        day = datetime.now(singapore_tz).date().isoformat()

    # Validate the requested date.
    try:
        selected_date = datetime.strptime(day, "%Y-%m-%d").date()

        if selected_date.isoformat() != day:
            raise ValueError("Invalid date format")

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="date must be a valid date in YYYY-MM-DD format",
        ) from exc

    # Convert Singapore's daily boundaries to UTC.
    start_local = datetime.combine(
        selected_date,
        datetime.min.time(),
        tzinfo=singapore_tz,
    )
    end_local = start_local + timedelta(days=1)

    start_utc = start_local.astimezone(timezone.utc).isoformat()
    end_utc = end_local.astimezone(timezone.utc).isoformat()

    with closing(get_connection()) as conn:
        stats = conn.execute(
            """
            SELECT
                COUNT(*) AS reading_count,
                MIN(temperature) AS min_temperature,
                MAX(temperature) AS max_temperature,
                AVG(temperature) AS avg_temperature
            FROM temperature_readings
            WHERE timestamp >= ? AND timestamp < ?
            """,
            (start_utc, end_utc),
        ).fetchone()

        first_reading = conn.execute(
            """
            SELECT device_id, temperature, unit, timestamp
            FROM temperature_readings
            WHERE timestamp >= ? AND timestamp < ?
            ORDER BY timestamp ASC, id ASC
            LIMIT 1
            """,
            (start_utc, end_utc),
        ).fetchone()

        last_reading = conn.execute(
            """
            SELECT device_id, temperature, unit, timestamp
            FROM temperature_readings
            WHERE timestamp >= ? AND timestamp < ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 1
            """,
            (start_utc, end_utc),
        ).fetchone()

        alerts = conn.execute(
            """
            SELECT device_id, temperature, threshold, status, timestamp
            FROM temperature_alert_events
            WHERE timestamp >= ? AND timestamp < ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 100
            """,
            (start_utc, end_utc),
        ).fetchall()

        status_events = conn.execute(
            """
            SELECT device_id, status, timestamp
            FROM device_status
            WHERE timestamp >= ? AND timestamp < ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 100
            """,
            (start_utc, end_utc),
        ).fetchall()

    reading_count = stats["reading_count"]

    if reading_count == 0:
        return {
            "date": day,
            "timezone": "Asia/Singapore",
            "status": "no_data",
            "message": "No temperature readings were recorded for this date.",
            "reading_count": 0,
            "temperature": None,
            "trend": None,
            "alerts": [dict(row) for row in alerts],
            "device_events": [dict(row) for row in status_events],
        }

    first_temp = first_reading["temperature"]
    last_temp = last_reading["temperature"]
    change = round(last_temp - first_temp, 2)

    if change > 0:
        trend = "rising"
    elif change < 0:
        trend = "falling"
    else:
        trend = "stable"

    return {
        "date": day,
        "timezone": "Asia/Singapore",
        "status": "ok",
        "reading_count": reading_count,
        "temperature": {
            "unit": first_reading["unit"],
            "minimum": round(stats["min_temperature"], 2),
            "maximum": round(stats["max_temperature"], 2),
            "average": round(stats["avg_temperature"], 2),
            "first_reading": dict(first_reading),
            "last_reading": dict(last_reading),
        },
        "trend": {
            "direction": trend,
            "change": change,
            "unit": first_reading["unit"],
            "method": "last reading minus first reading",
        },
        "alert_count": len(alerts),
        "alerts": [dict(row) for row in alerts],
        "device_event_count": len(status_events),
        "device_events": [dict(row) for row in status_events],
    }


# --------------------------------------------------
# GET /ai/summary/daily/text
# Rule-based daily summary; no external AI API
# --------------------------------------------------

@app.get("/ai/summary/daily/text")
def get_daily_summary_text(
    day: str | None = Query(
        default=None,
        description="Date in YYYY-MM-DD format",
    )
):
    # Reuse the existing daily summary calculations.
    data = get_daily_summary(day=day)

    report = []

    report.append(
        f"Daily Smart Home Report for {data['date']}"
    )

    report.append(
        f"Timezone: {data['timezone']}."
    )

    # Handle dates without temperature readings.
    if data["status"] == "no_data":
        report.append(data["message"])

        if data["alerts"]:
            report.append(
                f"{len(data['alerts'])} temperature alert "
                "event(s) were recorded."
            )
        else:
            report.append(
                "No temperature alert events were recorded."
            )

        if data["device_events"]:
            report.append(
                f"{len(data['device_events'])} device status "
                "event(s) were recorded."
            )
        else:
            report.append(
                "No device status events were recorded."
            )

        return {
            "date": data["date"],
            "status": data["status"],
            "summary": " ".join(report),
            "data": data,
        }

    # Summarize temperature statistics.
    temperature = data["temperature"]
    trend = data["trend"]
    unit = temperature["unit"]

    report.append(
        f"The system recorded {data['reading_count']} "
        "temperature reading(s)."
    )

    report.append(
        f"Minimum temperature: "
        f"{temperature['minimum']}{unit}."
    )

    report.append(
        f"Maximum temperature: "
        f"{temperature['maximum']}{unit}."
    )

    report.append(
        f"Average temperature: "
        f"{temperature['average']}{unit}."
    )

    # Explain the first-to-last reading change.
    change = trend["change"]

    if trend["direction"] == "rising":
        report.append(
            f"Temperature increased by {change}{unit} "
            "from the first reading to the last reading."
        )
    elif trend["direction"] == "falling":
        report.append(
            f"Temperature decreased by "
            f"{abs(change)}{unit} from the first reading "
            "to the last reading."
        )
    else:
        report.append(
            "The first and last temperature readings "
            "were the same."
        )

    # Summarize recorded temperature alert events.
    if data["alert_count"] > 0:
        report.append(
            f"{data['alert_count']} temperature alert "
            "event(s) were recorded."
        )
    else:
        report.append(
            "No temperature alert events were recorded."
        )

    # Summarize recorded device status events.
    if data["device_event_count"] > 0:
        report.append(
            f"{data['device_event_count']} device status "
            "event(s) were recorded."
        )
    else:
        report.append(
            "No device status events were recorded."
        )

    return {
        "date": data["date"],
        "status": data["status"],
        "summary": " ".join(report),
        "data": data,
    }




# --------------------------------------------------
# POST /readings
# --------------------------------------------------


@app.post("/readings1")
def create_reading1(reading: Reading):
    # Generate a UTC timestamp for this reading
    timestamp = datetime.now(timezone.utc).isoformat()

    conn = get_connection()

    try:
        cursor = conn.execute(
            """
            INSERT INTO temperature_readings
            (device_id, temperature, unit, timestamp)
            VALUES (?, ?, ?, ?)
            """,
            (
                reading.device_id,
                reading.temperature,
                reading.unit,
                timestamp,
            )
        )

        reading_id = cursor.lastrowid
        conn.commit()

        return {
            "id": reading_id,
            "device_id": reading.device_id,
            "temperature": reading.temperature,
            "unit": reading.unit,
            "timestamp": timestamp,
        }

    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Database operation failed"
        ) from exc

    finally:
        conn.close()


# --------------------------------------------------
@app.post("/readings")
def create_reading(reading: Reading):
    timestamp = datetime.now(timezone.utc).isoformat()

    with closing(get_connection()) as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO temperature_readings
                (device_id, temperature, unit, timestamp)
                VALUES (?, ?, ?, ?)
                """,
                (
                    reading.device_id,
                    reading.temperature,
                    reading.unit,
                    timestamp,
                ),
            )

            reading_id = cursor.lastrowid
            conn.commit()

            return {
                "id": reading_id,
                "device_id": reading.device_id,
                "temperature": reading.temperature,
                "unit": reading.unit,
                "timestamp": timestamp,
            }

        except sqlite3.Error as exc:
            conn.rollback()
            raise HTTPException(
                status_code=500,
                detail="Database operation failed",
            ) from exc


# --------------------------------------------------
# GET /anomalies/temperature
# Rule-based anomaly detection; no external AI API
# --------------------------------------------------

@app.get("/anomalies/temperature")
def detect_temperature_anomalies(
    high_temperature: float = Query(
        default=35.0, gt=-40, le=125
    ),
    change_threshold: float = Query(
        default=5.0, gt=0, le=125
    ),
    max_gap_minutes: int = Query(
        default=10, ge=1, le=1440
    ),
    stale_after_minutes: int = Query(
        default=60, ge=1, le=10080
    ),
):
    now = datetime.now(timezone.utc)

    findings = []
    data_quality_issues = []

    # Parse stored ISO timestamps into timezone-aware UTC values.
    def parse_timestamp(value):
        try:
            parsed = datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )

            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)

            return parsed.astimezone(timezone.utc)

        except (ValueError, TypeError, AttributeError):
            return None

    with closing(get_connection()) as conn:
        rows = conn.execute(
            """
            SELECT id, device_id, temperature, unit, timestamp
            FROM temperature_readings
            ORDER BY device_id, timestamp, id
            """
        ).fetchall()

        configurations = conn.execute(
            """
            SELECT device_id, expected_interval_seconds
            FROM device_monitoring_config
            WHERE enabled = 1
            """
        ).fetchall()

    # Keep track of consecutive readings and latest valid
    # reading timestamps separately for each device.
    previous_by_device = {}
    latest_by_device = {}
    known_devices = set()

    for row in rows:
        reading = dict(row)
        device_id = reading["device_id"]
        temperature = reading["temperature"]
        unit = reading["unit"]
        timestamp_text = reading["timestamp"]

        known_devices.add(device_id)

        # Rule 1: High temperature, Celsius only.
        if unit == "C" and temperature > high_temperature:
            findings.append({
                "type": "high_temperature",
                "severity": "warning",
                "device_id": device_id,
                "timestamp": timestamp_text,
                "observed_temperature": temperature,
                "threshold": high_temperature,
                "unit": unit,
                "message": (
                    f"Temperature {temperature}°C exceeds "
                    f"the configured {high_temperature}°C threshold."
                ),
            })

        timestamp = parse_timestamp(timestamp_text)

        if timestamp is None:
            data_quality_issues.append({
                "type": "invalid_timestamp",
                "device_id": device_id,
                "timestamp": timestamp_text,
                "message": (
                    "The reading timestamp could not be parsed; "
                    "time-based checks were skipped for this reading."
                ),
            })
            continue

        # Record the most recent valid reading per device.
        if (
            device_id not in latest_by_device
            or timestamp > latest_by_device[device_id]["parsed_timestamp"]
        ):
            latest_by_device[device_id] = {
                "timestamp": timestamp_text,
                "parsed_timestamp": timestamp,
                "temperature": temperature,
            }

        previous = previous_by_device.get(device_id)

        # Rule 2: Sudden change between consecutive readings.
        if previous is not None:
            elapsed_seconds = (
                timestamp - previous["parsed_timestamp"]
            ).total_seconds()

            # Do not treat duplicate timestamps or long gaps
            # as evidence of a sudden change.
            if (
                0 < elapsed_seconds <= max_gap_minutes * 60
                and unit == previous["unit"] == "C"
            ):
                change = temperature - previous["temperature"]

                if abs(change) > change_threshold:
                    findings.append({
                        "type": "sudden_temperature_change",
                        "severity": "warning",
                        "device_id": device_id,
                        "timestamp": timestamp_text,
                        "previous_temperature": previous["temperature"],
                        "observed_temperature": temperature,
                        "change": round(change, 2),
                        "unit": unit,
                        "elapsed_seconds": round(elapsed_seconds, 2),
                        "threshold": change_threshold,
                        "max_gap_minutes": max_gap_minutes,
                        "message": (
                            f"Temperature changed by {change:.2f}°C "
                            f"over {elapsed_seconds:.1f} seconds."
                        ),
                    })

        previous_by_device[device_id] = {
            "parsed_timestamp": timestamp,
            "temperature": temperature,
            "unit": unit,
        }

    # Rule 3: Stale/missing readings, but only for configured devices.
    configured_devices = {
        row["device_id"]: row["expected_interval_seconds"]
        for row in configurations
    }

    for device_id, expected_seconds in configured_devices.items():
        latest = latest_by_device.get(device_id)

        if latest is None:
            findings.append({
                "type": "missing_readings",
                "severity": "warning",
                "device_id": device_id,
                "expected_interval_seconds": expected_seconds,
                "stale_after_minutes": stale_after_minutes,
                "minutes_since_last_reading": None,
                "message": (
                    "This configured device has no valid timestamped "
                    "temperature readings."
                ),
            })
            continue

        elapsed_seconds = (
            now - latest["parsed_timestamp"]
        ).total_seconds()

        if elapsed_seconds > stale_after_minutes * 60:
            findings.append({
                "type": "missing_readings",
                "severity": "warning",
                "device_id": device_id,
                "last_reading_timestamp": latest["timestamp"],
                "expected_interval_seconds": expected_seconds,
                "stale_after_minutes": stale_after_minutes,
                "minutes_since_last_reading": round(
                    elapsed_seconds / 60, 2
                ),
                "message": (
                    f"No reading has arrived for "
                    f"{elapsed_seconds / 60:.1f} minutes."
                ),
            })

    # Do not silently claim that unconfigured devices are healthy.
    unconfigured_devices = sorted(
        known_devices - set(configured_devices)
    )

    return {
        "status": "ok",
        "checked_at": now.isoformat(),
        "thresholds": {
            "high_temperature_celsius": high_temperature,
            "sudden_change_celsius": change_threshold,
            "max_comparison_gap_minutes": max_gap_minutes,
            "stale_after_minutes": stale_after_minutes,
        },
        "devices_with_readings": len(known_devices),
        "configured_monitoring_devices": len(configured_devices),
        "unconfigured_devices": unconfigured_devices,
        "missing_reading_checks_skipped_for_unconfigured_devices": (
            unconfigured_devices
        ),
        "finding_count": len(findings),
        "findings": findings,
        "data_quality_issues": data_quality_issues,
    }
