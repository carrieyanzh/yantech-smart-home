import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const API_URL = "http://192.168.1.122:8000";

function App() {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const intervalRef = useRef(null);

  const fetchLatestReading = async () => {
  try {
    setError("");

    const response = await fetch(`${API_URL}/readings/latest`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    setReading(currentReading => {
      // No change → keep existing React state
      if (
        currentReading &&
        currentReading.temperature === data.temperature
      ) {
        return currentReading;
      }

      // Temperature changed → update React
      return data;
    });

    setLoading(false);

  } catch (err) {
    console.error("API error:", err);
    setError(err.message);    
  }
};

useEffect(() => {
  fetchLatestReading();

  //const interval = setInterval(fetchLatestReading, 2000);
  intervalRef.current = setInterval(fetchLatestReading, 2000);
   return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, []);

  const handleManualRefresh = () => {    
    if (intervalRef.current) clearInterval(intervalRef.current);   
    
    fetchLatestReading();        
    intervalRef.current = setInterval(fetchLatestReading, 2000);
  };

  return (
    <div className="app">
      <header>
        <h1>YanTech Smart Home</h1>
        <p>IoT Temperature Dashboard</p>
      </header>

      <main>
        {/* {loading && <p>Loading...</p>} */}

        {error && (
          <div className="error">
            <h2>Connection Error</h2>
            <p>{error}</p>
            <button onClick={fetchLatestReading}>Try Again</button>
          </div>
        )}

        {reading && (
          <div className="card">
            <h2>Living Room</h2>

            <div className="temperature">
              🌡️ {reading?.temperature}°{reading?.unit}
            </div>

            <div className="details">
              <p>
                <strong>Device:</strong> {reading?.device_id}
              </p>

              <p>
                <strong>Reading ID:</strong> {reading?.id}
              </p>

              <p>
                <strong>Timestamp:</strong>{" "}
                {new Date(reading?.timestamp).toLocaleString()}
              </p>
            </div>

            <button onClick={fetchLatestReading}>Refresh</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
