import React from 'react';

interface TickerProps {
  tokenName: string;
  price: number;
  change: number; // Percentage change
  isPositive: boolean;
}

const Ticker: React.FC<TickerProps> = ({ tokenName, price, change, isPositive }) => {
  const priceFormatted = price.toFixed(4);
  const changeFormatted = change.toFixed(2);
  const changeColor = isPositive ? 'text-lime-400' : 'text-red-500'; // Degen colors

  return (
    <div className="bg-transparent text-white flex items-baseline px-2 font-pixelated">
      <span className="text-lg mr-2">${tokenName}</span>
      <span className="text-3xl font-bold">${priceFormatted}</span>
      <span className={`ml-2 text-lg ${changeColor} ${isPositive ? 'animate-pulse-green' : 'animate-pulse-red'}`}>
        ({isPositive ? '▲' : '▼'}{changeFormatted}%)
      </span>
    </div>
  );
};

export default Ticker;

// Add to globals.css or a style tag if not using Tailwind JIT for animations:
/*
@keyframes pulse-green {
  0%, 100% { opacity: 1; text-shadow: 0 0 5px #32CD32; }
  50% { opacity: 0.7; text-shadow: 0 0 15px #32CD32; }
}
@keyframes pulse-red {
  0%, 100% { opacity: 1; text-shadow: 0 0 5px #FF0000; }
  50% { opacity: 0.7; text-shadow: 0 0 15px #FF0000; }
}
.animate-pulse-green {
  animation: pulse-green 1.5s infinite;
}
.animate-pulse-red {
  animation: pulse-red 1.5s infinite;
}
*/
