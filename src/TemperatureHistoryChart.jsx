import React from "react";

function TemperatureHistoryChart({ history, timeRange,
  setTimeRange}) {
  // <-- FIX: added default empty object
  const chartWidth = 500;
  const chartHeight = 200;

  //const safeChartData = chartData || [];
  //const safeChartData = Array.isArray(history) ? history : [];
 const safeChartData = Array.isArray(history)
    ? [...history].reverse()
    : [];

  //const temperatures = safeChartData.map((d) => d.temperature);

  const temperatures = safeChartData.map(
    (d) => d.temperature
  );

  //let minTemp = temperatures.length > 0 ? Math.min(...temperatures) : 0;
  //let maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : 100;
    let minTemp =
    temperatures.length > 0
      ? Math.min(...temperatures)
      : 0;

  let maxTemp =
    temperatures.length > 0
      ? Math.max(...temperatures)
      : 100;


  const MINIMUM_WINDOW = 2.0;
  if (maxTemp - minTemp < MINIMUM_WINDOW) {
    const midpoint = (maxTemp + minTemp) / 2;
    minTemp = midpoint - MINIMUM_WINDOW / 2;
    maxTemp = midpoint + MINIMUM_WINDOW / 2;
  }

  const points = safeChartData.map((d, index) => {
    const x =
      safeChartData.length > 1
        ? (index / (safeChartData.length - 1)) * chartWidth
        : 0;
    const y =
      chartHeight -
      ((d.temperature - minTemp) / (maxTemp - minTemp)) * chartHeight;
    return `${x},${y}`;
  });

  return (
    <div className="history-card">
      <h2>Temperature History</h2>

      {safeChartData.length > 0 ? (
        <div className="chart-container">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="temperature-chart"
          >
            <line x1="0" y1="0" x2={chartWidth} y2="0" className="grid-line" />
            <line
              x1="0"
              y1={chartHeight / 2}
              x2={chartWidth}
              y2={chartHeight / 2}
              className="grid-line"
            />
            <line
              x1="0"
              y1={chartHeight}
              x2={chartWidth}
              y2={chartHeight}
              className="grid-line"
            />

            <polyline
              points={points.join(" ")}
              fill="none"
              className="temperature-line"
            />
          </svg>

          <div className="chart-labels">
            {/* FIX: added array index [0] so first label renders properly */}
            <span>{safeChartData[0]?.temperature}°C</span>
            <span>
              {safeChartData[safeChartData.length - 1]?.temperature}°C
            </span>
          </div>

          <div className="time-range-container ">
            <button
              className={timeRange === 5 ? "active" : ""}
              onClick={() => setTimeRange(5)}
            >
              5 min
            </button>

            <button
              className={timeRange === 30 ? "active" : ""}
              onClick={() => setTimeRange(30)}
            >
              30 min
            </button>

            <button
              className={timeRange === 60 ? "active" : ""}
              onClick={() => setTimeRange(60)}
            >
              1 hour
            </button>
          </div>
        </div>
      ) : (
        <p>No history data available.</p>
      )}
    </div>
  );
}

export default TemperatureHistoryChart;
