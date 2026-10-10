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

  const threeHours = 10800000;
  const API_URL = "http://192.168.1.122:8000";

  const isRecent = reading && Date.now() - new Date(reading.timestamp).getTime() < 10000;
  const temperatures = history.map((item) => item.temperature);
  const minTemperature = temperatures.length > 0 ? Math.min(...temperatures) : null;
  const maxTemperature = temperatures.length > 0 ? Math.max(...temperatures) : null;
  const averageTemperature = temperatures.length > 0 ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length : null;

  const fetchLatestReading = async () => {
    try {
      setError("");
      const response = await fetch(`${API_URL}/readings/latest`);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      setReading((currentReading) => {
        if (currentReading && currentReading.temperature === data.temperature && currentReading.timestamp === data.timestamp) {
          return currentReading;
        }
        return data;
      });
      setLoading(false);
    } catch (err) {
      console.error("API error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/readings/history?minutes=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };
  
  const updateDeviceStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/devices/status`);
      if (!response.ok) throw new Error("Failed to fetch device status");
      const devices = await response.json();
      const device = devices.find((item) => item.device_id === "esp32-livingroom");

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
              <span className={isRecent ? "status-badge online" : "status-badge offline"}> ● </span>
              <strong>{isRecent ? "Data Online" : "Data Stale"}</strong>
            </div>
            {reading && (
              <div>
                <h3>🌡️ {reading.temperature}°{reading.unit || "C"}</h3>
                <p>Device: {reading.device_id}</p>
                <p>Reading ID: {reading.id}</p>
                <p><strong>Timestamp:</strong> {new Date(reading?.timestamp).toLocaleString()}</p>
                <button onClick={fetchLatestReading}>Refresh</button>
              </div>
            )}
          </div>
          <div className="card">
            <h2>Temperature History</h2>
            <TemperatureHistoryChart history={history} timeRange={timeRange} setTimeRange={setTimeRange} />
          </div>
          <div className="card">
            <div className="stats-container">
              <div className="stat-card">
                <h3>Minimum</h3>
                <div className="stat-value">{minTemperature !== null ? `${minTemperature.toFixed(1)}°C` : "--"}</div>
              </div>
              <div className="stat-card">
                <h3>Average</h3>
                <div className="stat-value">{averageTemperature !== null ? `${averageTemperature.toFixed(1)}°C` : "--"}</div>
              </div>
              <div className="stat-card">
                <h3>Maximum</h3>
                <div className="stat-value">{maxTemperature !== null ? `${maxTemperature.toFixed(1)}°C` : "--"}</div>
              </div>
            </div>
          </div>
          <div className="card">
             <h3>Data Points</h3>
             <div className="stat-value">{history.length}</div>
          </div>
                    
          <div className="card">
              <h3>Living Room Device</h3>
              <span className={deviceClass}>
                {deviceStatus}
              </span>
              <p className="status-updated">{lastUpdated}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;