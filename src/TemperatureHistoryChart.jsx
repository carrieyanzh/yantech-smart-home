import React from "react";

function TemperatureHistoryChart({ history, timeRange, setTimeRange }) {  
  const totalWidth = 500;
  const totalHeight = 240;
  
  const padding = { top: 10, right: 30, bottom: 10, left: 40 };  
  const chartWidth = totalWidth - padding.left - padding.right;
  const chartHeight = totalHeight - padding.top - padding.bottom;

  const safeChartData = Array.isArray(history) ? [...history].reverse() : [];
  const temperatures = safeChartData.map((d) => d.temperature);

  let minTemp = temperatures.length > 0 ? Math.min(...temperatures) : 0;
  let maxTemp = temperatures.length > 0 ? Math.max(...temperatures) + 1 : 100;
  
  if (maxTemp - minTemp < 0.2) {
    minTemp -= 0.5;
    maxTemp += 0.5;
  } else {
    const margin = (maxTemp - minTemp) * 0.1;
    minTemp -= margin;
    maxTemp += margin;
  }
  
  const midTemp = (maxTemp + minTemp) / 2;

  const points = safeChartData.map((d, index) => {
    const x = safeChartData.length > 1 
      ? (index / (safeChartData.length - 1)) * chartWidth + padding.left
      : padding.left;

    const y = chartHeight - ((d.temperature - minTemp) / (maxTemp - minTemp)) * chartHeight + padding.top;
    return `${x},${y}`;
  });

  const timeLabels = safeChartData.map((d) => {
    const date = new Date(d.timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  return (
    <div className="history-card">
      {safeChartData.length > 0 ? (
        <div className="chart-container" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>          
          <svg
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            preserveAspectRatio="none"
            className="temperature-chart"
            style={{ width: "100%", height: "auto" }}
          >            
            <line x1={padding.left} y1={padding.top} x2={totalWidth - padding.right} y2={padding.top} className="grid-line" />
            <line x1={padding.left} y1={padding.top + chartHeight / 2} x2={totalWidth - padding.right} y2={padding.top + chartHeight / 2} className="grid-line" />
           
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={totalWidth - padding.right}
              y2={padding.top + chartHeight}
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartHeight}
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
            />
           
            {points.length > 0 && (
              <polyline points={points.join(" ")} fill="none" className="temperature-line" />
            )}
            
            <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fontSize="11" fill="#555" fontWeight="bold">
              {maxTemp.toFixed(1)}°C
            </text>            
            <text x={padding.left - 8} y={padding.top + chartHeight / 2 + 4} textAnchor="end" fontSize="11" fill="#555">
              {midTemp.toFixed(1)}°C
            </text>            
            <text x={padding.left - 8} y={padding.top + chartHeight + 4} textAnchor="end" fontSize="11" fill="#555" fontWeight="bold">
              {minTemp.toFixed(1)}°C
            </text>
          
            <text x={padding.left} y={padding.top + chartHeight + 18} textAnchor="middle" fontSize="11" fill="#666">
              {timeLabels[0]}
            </text>
            <text x={totalWidth - padding.right} y={padding.top + chartHeight + 18} textAnchor="middle" fontSize="11" fill="#666">
              {timeLabels[timeLabels.length - 1]}
            </text>
          </svg>

          <div className="time-range-container" style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button className={timeRange === 5 ? "active" : ""} onClick={() => setTimeRange(5)}>5 min</button>
            <button className={timeRange === 30 ? "active" : ""} onClick={() => setTimeRange(30)}>30 min</button>
            <button className={timeRange === 60 ? "active" : ""} onClick={() => setTimeRange(60)}>1 hour</button>
          </div>
          
        </div>
      ) : (
        <p>No history data available.</p>
      )}
    </div>
  );
}

export default TemperatureHistoryChart;
