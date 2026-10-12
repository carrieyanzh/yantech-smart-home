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
    "https://yantech-smart-home-carrieyanzh.aws-ap-northeast-1.turso.io/v2/pipeline";
     
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
      const response = await fetch(TURSO_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TURSO_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [  // 🚀 Changed from "statements" to "requests" for Turso compliance
            {
              type: "execute",
              stmt: {  // 🚀 Wrapped inside an explicit execute block format
                sql: "SELECT id, device_id, temperature, unit, timestamp FROM temperature_readings ORDER BY timestamp DESC LIMIT 1;"
              }
            }
          ]
        }),
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      console.log("Raw Turso Latest Response:", data);

      // Navigate Turso's exact native data payload packaging block structure
      const rawRows = data?.results?.[0]?.response?.result?.rows || [];
      if (rawRows.length === 0) {
        setReading(null);
        setLoading(false);
        return;
      }

      const latest = {
        id: rawRows[0][0]?.value ?? rawRows[0][0],
        device_id: rawRows[0][1]?.value ?? rawRows[0][1],
        temperature: parseFloat(rawRows[0][2]?.value ?? rawRows[0][2] ?? 0),
        unit: rawRows[0][3]?.value ?? rawRows[0][3] ?? "C",
        timestamp: rawRows[0][4]?.value ?? rawRows[0][4],
      };

      console.log("Cloud Latest reading parsed:", latest);
      setReading(latest);
      setLoading(false);
    } catch (err) {
      console.error("API error:", err);
      setError(err.message);
      setLoading(false);
    }
  };


 const fetchHistory = async () => {
    try {
    
       let rowLimit = 25; 
      if (timeRange === 30) rowLimit = 120;
      if (timeRange === 60 || timeRange === 1) rowLimit = 250; 
      const response = await fetch(TURSO_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TURSO_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: {
                // 🚀 Pull the latest 20 rows using a subquery, then sort them chronologically (ASC) 
                // so the chart reads beautifully from left to right!
               // sql: "SELECT * FROM (SELECT id, device_id, temperature, unit, timestamp FROM temperature_readings ORDER BY timestamp DESC LIMIT 20) ORDER BY timestamp ASC;"
                 sql: `SELECT * FROM (SELECT id, device_id, temperature, unit, timestamp FROM temperature_readings ORDER BY timestamp DESC LIMIT ${rowLimit}) ORDER BY timestamp ASC;`
                

              }
            }
          ]
        })
      });

      if (!response.ok) throw new Error("Failed to fetch cloud history");
      const data = await response.json();
      
      const rawRows = data?.results?.[0]?.response?.result?.rows || 
                      data?.results?.[0]?.result?.rows || [];
      
      const formattedRows = rawRows.map(row => {
        if (!row || row.length < 5) return null;
        return {
          id: row[0]?.value ?? row[0],
          device_id: row[1]?.value ?? row[1],
          temperature: parseFloat(row[2]?.value ?? row[2] ?? 0),
          unit: row[3]?.value ?? row[3] ?? "C",
          timestamp: row[4]?.value ?? row[4]
        };
      }).filter(Boolean);

      console.log("Parsed History for Chart:", formattedRows);
      setHistory(formattedRows);
    } catch (err) {
      console.error("Turso History Parsing Error:", err);
    }
  };


   const updateDeviceStatus = async () => {
    try {
      const response = await fetch(TURSO_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TURSO_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              type: "execute",
              stmt: {
                sql: "SELECT device_id, status, timestamp FROM device_status ORDER BY timestamp DESC LIMIT 5;"
              }
            }
          ]
        })
      });

      if (!response.ok) throw new Error("Failed to fetch device status");
      const data = await response.json();
      
      const rawRows = data?.results?.[0]?.response?.result?.rows || [];
      
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

  /* const fetchAiInsight = async () => {
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
  }; */


    const fetchAiInsight = async () => {
    try {
      setAiLoading(true);
      setAiError("");
      setAiInsight("");

      // 1. Verify that we have a valid temperature reading to send
      if (!reading) {
        throw new Error("No recent temperature data available to analyze.");
      }

      // 🚀 2. Paste your secure Windows PC Ollama Ngrok tunnel URL here
      const OLLAMA_TUNNEL_URL = "https://compile-garland-unsteady.ngrok-free.dev";

      // 3. Assemble the prompt grounding instructions
      const promptText = `You are the YanTech Smart Home AI manager. The room temperature sensor reads ${reading.temperature}°C. Our strict comfort target rule is exactly 20°C to 25°C. Provide a friendly, single-sentence analysis comparing the reading to our rule. If it is above 25°C, explicitly state it is too warm and suggest a specific smart home action.`;

      // 4. Send the prompt directly to the Ollama engine via the secure tunnel link
      const response = await fetch(`${OLLAMA_TUNNEL_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3.2:latest",
          messages: [{ role: "user", content: promptText }],
          stream: false // Disables streaming to return a clean single text block string
        }),
      });

      if (!response.ok) throw new Error("Could not connect to local Windows AI engine.");
      const data = await response.json();
      
      console.log("Ollama Cloud Response:", data);
      
      // 5. Extract the text response and update the state
      const aiResponseText = data?.message?.content || "AI generated an empty response.";
      setAiInsight(aiResponseText.trim());

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
