import React from 'react';
import Image from 'next/image';

// TODO: Implement actual sprite sheet and animations (idle, talk, panic)
interface ReplyGuyProps {
  mood?: 'idle' | 'talk' | 'panic'; // For future sprite changes based on mood
}

const ReplyGuy: React.FC<ReplyGuyProps> = ({ mood = 'idle' }) => {
  // For now, we use a static image. Animations would require a sprite sheet
  // and logic to change the background-position or swap images.

  // Removed margin to prevent any movement
  const containerClasses = "flex items-center justify-center";
  // Keeping the large size
  const imageSize = 256; 

  // Placeholder for mood-based visual changes 
  let moodEffectClass = '';
  if (mood === 'panic') {
    moodEffectClass = 'animate-pulse-red'; // Example: reuse pulse animation for panic
  } else if (mood === 'talk') {
    // Potentially a slight bounce or glow when talking, if not using sprite frames
  }

  return (
    <div
      className={`${containerClasses} ${moodEffectClass}`}
      style={{ 
        width: `${imageSize}px`, 
        height: `${imageSize}px`,
        // Ensure pixelation is preserved for crisp rendering
        imageRendering: 'pixelated'
      }}
      aria-label="Reply Guy character"
    >
      <Image
        src="/images/reply-guy.png" // Path to the saved image
        alt="Reply Guy"
        width={imageSize}
        height={imageSize}
        className="pixelated-image" // For crisp pixel art rendering if needed
        priority // Preload if it's above the fold or critical
      />
    </div>
  );
};

export default ReplyGuy;

// Add to globals.css if needed for crisp pixel rendering:
/*
.pixelated-image {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
*/
