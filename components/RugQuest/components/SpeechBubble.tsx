import React, { useState, useEffect } from 'react';

interface SpeechBubbleProps {
  message: string;
  isLoading?: boolean; // Optional prop to explicitly indicate loading
  typewriterSpeed?: number;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message, isLoading, typewriterSpeed = 30 }) => {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [dots, setDots] = useState('');

  useEffect(() => {
    let dotInterval: NodeJS.Timeout;
    if (isLoading) {
      setDisplayedMessage(''); // Clear any previous message
      dotInterval = setInterval(() => {
        setDots(prevDots => (prevDots.length >= 3 ? '.' : prevDots + '.'));
      }, 300);
    } else {
      setDots(''); // Clear dots when not loading
    }
    return () => clearInterval(dotInterval);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !message) { // If loading, or message is empty, don't run typewriter
      if (!isLoading && !message) setDisplayedMessage('\u00A0'); // Show nbsp if message is truly empty and not loading
      return;
    }
    
    setDisplayedMessage(''); // Reset for typewriter
    let index = 0;
    const typewriterInterval = setInterval(() => {
      if (index < message.length) {
        setDisplayedMessage(message.substring(0, index + 1));
        index++;
      } else {
        clearInterval(typewriterInterval);
      }
    }, typewriterSpeed);

    return () => clearInterval(typewriterInterval);
  }, [message, typewriterSpeed, isLoading]); // Add isLoading here

  return (
    <div className="relative bg-white text-gray-800 p-3 rounded-lg shadow-md max-w-xs min-h-[70px] font-pixelated border-2 border-gray-400 break-words text-center mx-auto">
      <p className="text-sm leading-snug min-h-[1.5em] whitespace-pre-wrap">
        {isLoading ? dots : displayedMessage}
      </p>
      {/* Triangle pointing down for speech bubble above character */}
      <div
        className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '10px solid white',
        }}
      />
    </div>
  );
};

export default SpeechBubble;
