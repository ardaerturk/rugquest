import React from 'react';

interface SparklineProps {
  data: number[]; // Array of price points
  width?: number;
  height?: number;
  strokeColor?: string;
  isPositiveTrend?: boolean; // To color based on overall trend or last change
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 128, // Increased default width
  height = 48, // Increased default height
  strokeColor, // Optional: will be determined by trend if not provided
  isPositiveTrend = true, // Default to positive, can be updated from context
}) => {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-gray-800 animate-pulse ml-2 rounded-md"></div>;
  }

  const determinedColor = strokeColor ? strokeColor : isPositiveTrend ? "url(#greenGradient)" : "url(#redGradient)";

  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  let range = maxVal - minVal;
  if (range === 0) range = 1; // Avoid division by zero if all values are the same

  // Add some padding to the y-axis to prevent line touching top/bottom edges
  const yPadding = height * 0.1;
  const effectiveHeight = height - 2 * yPadding;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      // Adjust y to be within the padded effective height
      const yBase = ((val - minVal) / range) * effectiveHeight;
      const y = height - yPadding - yBase; // Invert y-axis and add padding
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="ml-3 shadow-lg" // Added margin and shadow for degen feel
    >
      <defs>
        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4ade80', stopOpacity: 1 }} /> {/* lime-400 */}
          <stop offset="100%" style={{ stopColor: '#86efac', stopOpacity: 0.3 }} /> {/* lighter lime */}
        </linearGradient>
        <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#f87171', stopOpacity: 1 }} /> {/* red-500 */}
          <stop offset="100%" style={{ stopColor: '#fca5a5', stopOpacity: 0.3 }} /> {/* lighter red */}
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={determinedColor}
        strokeWidth="2.5" // Thicker line
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
