import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import TemperatureHistoryChart from "./TemperatureHistoryChart.jsx";

function App() {
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [error, setError] = useState("");
  const [deviceStatus, setDeviceStatus] = useState("Checking...");
  const [deviceClass, setDeviceClass] = useState("status-badge unknown");
  const [lastUpdated, setLastUpdated] = useState("Waiting for device status");

  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const TURSO_URL =
    "https://yantech-smart-home-carrieyanzh.aws-ap-northeast-1.turso.io";
     
  const TURSO_TOKEN =
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE3OTQyOTIsImlkIjoiMDFhMTJmMWItNjMwMS03ODFiLTkyZDUtY2ZjODE3YmJiZTIwIiwia2lkIjoiTnBYWVM3Z3lzYzRjVVNicHJ6djZvTC1mWjdaYkV5aWFJYTBoemRsRUVGWSIsInJpZCI6IjRjNTllZDU4LTNkYjgtNGY2YS05OWM3LTVmMzBhMmVkMTYzNCJ9.vlVM-kAkJu4ppu_m9mKl7bcLfTeiViZm7FTkEB-g-boiVBYziPh8ZbsvZic8LjCH9q_GD8h7SFLvUAbU33QBDw";

  //const TURSO_URL = import.meta.env.VITE_TURSO_URL;
  //const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN;

  const threeHours = 10800000;
  //const API_URL = "http://192.168.1.122:8000";
  //const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const API_URL = "http://192.168.1.122:8000";

  const isRecent =
    reading && Date.now() - new Date(reading.timestamp).getTime() < 10000;
  const temperatures = history.map((item) => item.temperature);
  const minTemperature =
    temperatures.length > 0 ? Math.min(...temperatures) : null;
  const maxTemperature =
    temperatures.length > 0 ? Math.max(...temperatures) : null;
  const averageTemperature =
    temperatures.length > 0
      ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length
      : null;

  const fetchLatestReading = async () => {
    try {
      setError("");

      // const response = await fetch(`${API_URL}/readings/latest`);
      const response = await fetch(TURSO_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TURSO_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          statements: [
            {
              q: "SELECT id, device_id, temperature, unit, timestamp FROM temperature_readings ORDER BY timestamp DESC LIMIT 1;",
            },
          ],
        }),
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      console.log("Latest Reading API response:", data);

      const rawRows = data.results?.[0]?.response?.result?.rows || [];
      if (rawRows.length === 0) {
        setReading(null);
        setLoading(false);
        return;
      }

      const latest = {
        id: rawRows[0][0]?.value || rawRows[0][0],
        device_id: rawRows[0][1]?.value || rawRows[0][1],
        temperature: parseFloat(rawRows[0][2]?.value || rawRows[0][2]),
        unit: rawRows[0][3]?.value || rawRows[0][3],
        timestamp: rawRows[0][4]?.value || rawRows[0][4],
      };

      console.log("Cloud Latest reading parsed:", latest);
      setReading(latest);
      setLoading(false);

      /* setReading((currentReading) => {
        if (
          currentReading &&
          currentReading.temperature === data.temperature &&
          currentReading.timestamp === data.timestamp
        ) {
          return currentReading;
        }
        return data;
      });
      setLoading(false); */
    } catch (err) {
      console.error("API error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
  try {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 1000).toISOString();
    const response = await fetch(TURSO_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TURSO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statements: [
          {
            //q: "SELECT id, device_id, temperature, unit, timestamp FROM temperature_readings ORDER BY timestamp DESC LIMIT 20;"
            q: "SELECT id, device_id, temperature, unit, timestamp FROM temperature_readings WHERE timestamp >= ? ORDER BY timestamp ASC;",
            args: [cutoffTime]
          }
        ]
      })
    });

    if (!response.ok) throw new Error("Failed to fetch cloud history");
    const data = await response.json();
    
    // Exact structural extraction for Turso pipeline responses
    //const rawRows = data?.results?.[0]?.response?.result?.rows || [];
   // const rawRows = data?.results?.[0]?.result?.rows || [];
    const rawRows = data?.results?.[0]?.response?.result?.rows || 
                    data?.results?.[0]?.result?.rows || [];
    /* const formattedRows = rawRows.map(row => ({
      id: row[0]?.value ?? row[0],
      device_id: row[1]?.value ?? row[1],
      temperature: parseFloat(row[2]?.value ?? row[2] ?? 0),
      unit: row[3]?.value ?? row[3],
      timestamp: row[4]?.value ?? row[4]
    })); */

     const formattedRows = rawRows.map(row => {
      if (!row || row.length < 5) return null;
      return {
        id: row[0]?.value ?? row[0],
        device_id: row[1]?.value ?? row[1],
        temperature: parseFloat(row[2]?.value ?? row[2] ?? 0),
        unit: row[3]?.value ?? row[3] ?? "C",
        timestamp: row[4]?.value ?? row[4]
      };
}).filter(Boolean);;

    console.log("Cloud History parsed successfully:", formattedRows);
    setHistory(formattedRows);
  } catch (err) {
    console.error("Turso History Parsing Error:", err);
  }
};


  /* const fetchHistory11 = async () => {
    try {
      const response = await fetch(
        `${API_URL}/readings/history?minutes=${timeRange}`,
      );
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();

      console.log("History API response:", data);

      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }; */

  /* const updateDeviceStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/devices/status`);
      if (!response.ok) throw new Error("Failed to fetch device status");
      const devices = await response.json();

      console.log("Device Status API response:", devices);

      const device = devices.find(
        (item) => item.device_id === "esp32-livingroom",
      );

      if (!device) {
        setDeviceStatus("Unknown");
        setDeviceClass("status-badge unknown");
        setLastUpdated("No device status found");
        return;
      }

      const isOnline = device.status.toLowerCase() === "online";
      setDeviceStatus(isOnline ? "Online" : "Offline");
      setDeviceClass(isOnline ? "status-badge online" : "status-badge offline");
      setLastUpdated("Last status update: " + device.timestamp);
    } catch (error) {
      setDeviceClass("status-badge unknown");
      setLastUpdated("Unable to contact API");
      console.error("Device status error:", error);
    }
  }; */

  const updateDeviceStatus = async () => {
  try {
    const response = await fetch(TURSO_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TURSO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statements: [
          {
            q: "SELECT device_id, status, timestamp FROM device_status ORDER BY timestamp DESC;"
          }
        ]
      })
    });

    if (!response.ok) throw new Error("Failed to fetch device status");
    const data = await response.json();
    
    //const rawRows = data?.results?.[0]?.response?.result?.rows || [];
   // const rawRows = data?.results?.[0]?.result?.rows || [];
     const rawRows = data?.results?.[0]?.response?.result?.rows || 
                    data?.results?.[0]?.result?.rows || [];
    // Find the status entry for your living room sensor inside the cloud rows
    //const deviceRow = rawRows.find(row => (row[0]?.value ?? row[0]) === "esp32-livingroom");
     const deviceRow = rawRows.find(row => {
      const id = row?.[0]?.value ?? row?.[0];
      return String(id) === "esp32-livingroom";
    });

     if (!deviceRow || deviceRow.length < 3) {
      setDeviceStatus("Unknown");
      setDeviceClass("status-badge unknown");
      setLastUpdated("No device status logged in cloud");
      return;
    }

    const statusValue = String(deviceRow[1]?.value ?? deviceRow[1] ?? "").toLowerCase();
    const timestampValue = deviceRow[2]?.value ?? deviceRow[2] ?? "N/A";

    const isOnline = statusValue === "online";
    setDeviceStatus(isOnline ? "Online" : "Offline");
    setDeviceClass(isOnline ? "status-badge online" : "status-badge offline");
    setLastUpdated("Last status update: " + new Date(timestampValue).toLocaleTimeString());
  } catch (error) {
    setDeviceClass("status-badge unknown");
    setLastUpdated("Unable to contact Turso API");
    console.error("Device status error:", error);
  }
};

  useEffect(() => {
    fetchLatestReading();
    fetchHistory();
    updateDeviceStatus();

    const interval = setInterval(() => {
      fetchLatestReading();
      fetchHistory();
      updateDeviceStatus();
    }, threeHours);

    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAiInsight = async () => {
    try {
      setAiLoading(true);
      setAiError("");
      setAiInsight(""); // Clear previous text

      const response = await fetch(`${API_URL}/api/v1/smart-climate`);
      if (!response.ok) throw new Error(`AI Engine error: ${response.status}`);

      const data = await response.json();
      console.log("Ollama Response:", data);

      if (data.status === "success") {
        setAiInsight(data.ai_home_insight);
      } else {
        throw new Error("AI engine failed to compute a response.");
      }
    } catch (err) {
      console.error("AI Communication Error:", err);
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>YanTech Smart Home</h1>
        <p>IoT Temperature Dashboard</p>
      </header>

      <main>
        {loading && !reading && <p>Loading...</p>}
        {error && (
          <div className="error-box">
            <h2>Connection Error</h2>
            <p>{error}</p>
            <button onClick={fetchLatestReading}>Try Again</button>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="card">
            <h2>Living Room</h2>
            <div className="status">
              <span
                className={
                  isRecent ? "status-badge online" : "status-badge offline"
                }
              >
                {" "}
                ●{" "}
              </span>
              <strong>{isRecent ? "Data Online" : "Data Stale"}</strong>
            </div>
            {reading && (
              <div>
                <h3>
                  🌡️ {reading.temperature}°{reading.unit || "C"}
                </h3>
                <p>Device: {reading.device_id}</p>
                <p>Reading ID: {reading.id}</p>
                <p>
                  <strong>Timestamp:</strong>{" "}
                  {new Date(reading?.timestamp).toLocaleString()}
                </p>
                <button onClick={fetchLatestReading}>Refresh</button>
              </div>
            )}
          </div>
          <div className="card">
            <h2>Temperature History</h2>
            <TemperatureHistoryChart
              history={history}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
            />
          </div>
          <div className="card">
            <div className="stats-container">
              <div className="stat-card">
                <h3>Minimum</h3>
                <div className="stat-value">
                  {minTemperature !== null
                    ? `${minTemperature.toFixed(1)}°C`
                    : "--"}
                </div>
              </div>
              <div className="stat-card">
                <h3>Average</h3>
                <div className="stat-value">
                  {averageTemperature !== null
                    ? `${averageTemperature.toFixed(1)}°C`
                    : "--"}
                </div>
              </div>
              <div className="stat-card">
                <h3>Maximum</h3>
                <div className="stat-value">
                  {maxTemperature !== null
                    ? `${maxTemperature.toFixed(1)}°C`
                    : "--"}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>Data Points</h3>
            <div className="stat-value">{history.length}</div>
          </div>

          <div className="card">
            <h3>Living Room Device</h3>
            <span className={deviceClass}>{deviceStatus}</span>
            <p className="status-updated">{lastUpdated}</p>
          </div>
          <div className="card">
            <h2>🤖 YanTech AI Assistant</h2>
            <p className="subtitle">Ollama 3.2 Home Climate Insight</p>

            <div className="ai-content-box">
              {aiLoading && (
                <p className="ai-loading">🔄 Consulting AI manager...</p>
              )}
              {aiError && <p className="ai-error-text">❌ {aiError}</p>}
              {aiInsight && <p className="ai-insight-text">{aiInsight}</p>}
              {!aiLoading && !aiInsight && !aiError && (
                <p className="ai-placeholder">
                  Click analyze to review climate comfort.
                </p>
              )}
            </div>

            <button
              className="ai-btn"
              onClick={fetchAiInsight}
              disabled={aiLoading}
            >
              {aiLoading ? "Analyzing..." : "Analyze Climate"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
