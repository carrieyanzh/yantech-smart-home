import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import TemperatureHistoryChart from "./TemperatureHistoryChart.jsx";

const API_URL = "http://192.168.1.122:8000";

function App() {
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeRange, setTimeRange] = useState(30);

  const intervalRef = useRef(null);

  // Get latest temperature
  const fetchLatestReading = async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/readings/latest`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      setReading((currentReading) => {
        if (
          currentReading &&
          currentReading.temperature === data.temperature &&
          currentReading.timestamp === data.timestamp
        ) {
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

  // Get temperature history
  const fetchHistory1 = async () => {
    try {
      const response = await fetch(`${API_URL}/readings/history?limit=50`);

      if (!response.ok) {
        throw new Error(`History HTTP error: ${response.status}`);
      }

      const data = await response.json();

      setHistory(data);
    } catch (err) {
      console.error("History API error:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(        
        `${API_URL}/readings/history?minutes=${timeRange}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();

      const now = Date.now();

      const filteredData = data.filter((item) => {
        const readingTime = new Date(item.timestamp).getTime();
        const ageMinutes = (now - readingTime) / 1000 / 60;

        return ageMinutes <= timeRange;
      });

      //setHistory(filteredData);
       setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLatestReading();
    fetchHistory();

    const interval = setInterval(() => {
      fetchLatestReading();
      fetchHistory();
    }, 2000);

    /*  intervalRef.current = setInterval(() => {
      fetchLatestReading();
      fetchHistory();
    }, 2000); */

    /*  return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }; */

    return () => clearInterval(interval);
  }, [timeRange]);

  // Check whether latest data is recent
  const isRecent =
    reading && Date.now() - new Date(reading.timestamp).getTime() < 10000;

  const chartData = [...history].reverse();

  const temperatures = history.map((item) => item.temperature);
  const minTemperature =
    temperatures.length > 0 ? Math.min(...temperatures) : null;
  const maxTemperature =
    temperatures.length > 0 ? Math.max(...temperatures) : null;

  const averageTemperature =
    temperatures.length > 0
      ? temperatures.reduce((sum, temperature) => sum + temperature, 0) /
        temperatures.length
      : null;

  // SVG chart dimensions
  const chartWidth = 700;
  const chartHeight = 250;

  let minTemp = 29;
  let maxTemp = 31;

  if (chartData.length > 0) {
    const temperatures = chartData.map((item) => item.temperature);

    minTemp = Math.floor(Math.min(...temperatures) * 10) / 10;
    maxTemp = Math.ceil(Math.max(...temperatures) * 10) / 10;

    // Give chart a little vertical space
    if (minTemp === maxTemp) {
      minTemp -= 0.5;
      maxTemp += 0.5;
    } else {
      minTemp -= 0.1;
      maxTemp += 0.1;
    }
  }

  const points = chartData.map((item, index) => {
    const x =
      chartData.length === 1
        ? chartWidth / 2
        : (index / (chartData.length - 1)) * chartWidth;

    const y =
      chartHeight -
      ((item.temperature - minTemp) / (maxTemp - minTemp)) * chartHeight;

    return `${x},${y}`;
  });

  return (
    <div className="app">
      <header>
        <h1>YanTech Smart Home</h1>
        <p>IoT Temperature Dashboard</p>
      </header>

      <main>
        {loading && !reading && <p>Loading...</p>}

        {error && (
          <div className="error">
            <h2>Connection Error</h2>
            <p>{error}</p>

            <button onClick={fetchLatestReading}>Try Again</button>
          </div>
        )}
        <div className="card">
          <h2>Living Room</h2>
          {/* Data Status */}
          <div className="status">
            <span
              className={isRecent ? "status-dot online" : "status-dot offline"}
            >
              ●
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

        {/* Right Side: Chart Panel */}
        {/* 3. CRITICAL: Pass your state variable 'history' to the component prop */}
        <div className="card">
          <TemperatureHistoryChart
            history={history}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />
        </div>

        <div className="card">
          {/* Temperature Statistics */}
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
      </main>
    </div>
  );
}

export default App;
