import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import Ticker from './components/Ticker';
import Sparkline from './components/Sparkline';
import Button from './components/Button';
import ReplyGuy from './components/ReplyGuy';
import SpeechBubble from './components/SpeechBubble';
import { useMiniApp } from '../../contexts/miniapp-context'; // Adjusted path
import { sdk } from '@farcaster/frame-sdk';

// Constants
const WRITE_YOUR_OWN_OPTION = "✍️ Write your own"; // Same as defined in miniapp-context

// TODO: Implement scene assets and Reply Guy sprite animations
// TODO: Add actual font file for font-pixelated or ensure Tailwind config handles it
// TODO: Implement "Write your own" input field logic

const RugQuest = () => {
  const { rugQuestState, processPlayerChoice, initializeRugQuest, resetRugQuest } = useMiniApp();
  const {
    tokenName,
    price,
    priceChangePercent,
    isPricePositive,
    chartData,
    currentMessage,
    currentOptions,
    currentScene,
    replyGuyMood,
    gameInitialized, // Use this from context
    gameOver,
    endGameMessage,
  } = rugQuestState;

  const gameScreenRef = useRef<HTMLDivElement>(null); // Ref for html2canvas

  // Local state for "Write your own" input
  const [showWriteOwnInput, setShowWriteOwnInput] = useState(false);
  const [writeOwnText, setWriteOwnText] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false); // State for about modal
  const [tokenInputValue, setTokenInputValue] = useState(""); // For custom token name input
  const [showTokenInput, setShowTokenInput] = useState(false); // For token name input modal
  const [isInFarcaster, setIsInFarcaster] = useState(false); // Platform detection

  // Handle About modal toggle with debugging
  const handleToggleAboutModal = () => {
    console.log("About button clicked, current state:", showAboutModal);
    setShowAboutModal(prevState => {
      const newState = !prevState;
      console.log("Setting modal state to:", newState);
      return newState;
    });
  };

  // Placeholder for scene background images - these should ideally be preloaded
  const sceneBackgrounds: { [key: string]: string } = {
    office: '/images/office.png', // Updated path
    club: '/images/club.png',     // Updated path
    yacht: '/images/yacht.png',   // Updated path
    moon: '/images/moon.png',     // Updated path
    prison: '/images/prison.png', // Updated path
    void: '/images/void.png',     // Updated path
  };

  // Check for showTokenInput from context
  useEffect(() => {
    // Set local state based on the context state
    if (!gameInitialized) {
      setShowTokenInput(true);
    }
  }, [gameInitialized]);

  // Platform detection - check if we're in Farcaster frame
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        // Check if we have a Farcaster context with user info
        if (sdk && sdk.context) {
          const context = await sdk.context;
          const isFarcaster = !!context?.user;
          setIsInFarcaster(isFarcaster);
          console.log('Farcaster detection result:', isFarcaster);
        } else {
          setIsInFarcaster(false);
        }
      } catch (error) {
        console.log('Not in Farcaster frame or SDK not available:', error);
        setIsInFarcaster(false);
      }
    };
    checkPlatform();
  }, []);

  const handleOptionClick = (option: string) => {
    if (gameOver) return;

    if (option === "✍️ Write your own") {
      setShowWriteOwnInput(true);
    } else {
      setShowWriteOwnInput(false);
      setWriteOwnText(""); // Clear any previous text
      processPlayerChoice(option);
    }
  };

  const handleWriteOwnSubmit = () => {
    if (gameOver || !writeOwnText.trim()) return;
    processPlayerChoice("✍️ Write your own", writeOwnText.trim());
    setShowWriteOwnInput(false);
    setWriteOwnText("");
  };

  // Unified share function that works for both platforms
  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      // Create share text based on current game state
      let shareText = "";
      
      if (gameOver) {
        // Get emoji based on ending scene
        const endingEmoji = currentScene === 'prison' ? '🔪' : 
                          currentScene === 'yacht' ? '✈️' : 
                          currentScene === 'moon' ? '🌕' : 
                          currentScene === 'void' ? '💀' : '🚀';
      
        // Main message content based on ending                    
        let mainMessage = "";
        if (currentScene === 'prison') {
          mainMessage = `I rugged $${tokenName} at $${price.toFixed(4)} ${endingEmoji}`;
        } else if (currentScene === 'yacht') {
          mainMessage = `Skipped town with half the $${tokenName} bags ${endingEmoji}`;
        } else if (currentScene === 'moon') {
          mainMessage = `Accidentally went legit—$${tokenName} to the moon ${endingEmoji}`;
        } else if (currentScene === 'void') {
          mainMessage = `RugQuest speed-ran $${tokenName} to zero ${endingEmoji}`;
        } else {
          mainMessage = `Game over: $${tokenName} final price $${price.toFixed(4)}!`;
        }
      
        shareText = `"${mainMessage}"\n\nPlaying RugQuest. #RugQuest`;
      } else {
        // Mid-game share
        const priceChange = isPricePositive ? `+${priceChangePercent.toFixed(2)}%` : `${priceChangePercent.toFixed(2)}%`;
        
        const messageToShare = showWriteOwnInput && writeOwnText.trim() 
          ? writeOwnText.trim() 
          : currentMessage;
        
        const optionsList = currentOptions
          .filter(opt => opt !== WRITE_YOUR_OWN_OPTION)
          .map(opt => `- ${opt}`)
          .join("\n");
          
        shareText = `"${messageToShare}"\n\n${optionsList}\n\nPlaying RugQuest at $${price.toFixed(4)} (${priceChange}). https://2025.sucks #RugQuest`;
      }

      if (isInFarcaster) {
        // For Farcaster, try to use SDK with screenshot
        if (!gameScreenRef.current) {
          alert(`Sharing to Farcaster: ${shareText}`);
          return;
        }
        
        const canvas = await html2canvas(gameScreenRef.current, {
          useCORS: true,
          backgroundColor: '#111827',
        });
        
        const imageDataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(imageDataUrl)).blob();
        
        try {
          if (sdk && sdk.actions) {
            await sdk.actions.composeCast({
              text: shareText,
              embeds: [URL.createObjectURL(blob)]
            });
          } else {
            alert(`Sharing to Farcaster: ${shareText}`);
          }
        } catch (error) {
          console.error("Error sharing to Farcaster:", error);
          alert("Could not share to Farcaster. Try again later.");
        }
      } else {
        // Default to Twitter for all other platforms (including World App)
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        window.open(twitterUrl, '_blank');
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Could not share. Try again later.");
    } finally {
      setIsSharing(false);
    }
  };

  // Handler for token name input
  const handleSubmitTokenName = (e: React.FormEvent) => {
    e.preventDefault();
    // Use the entered value, or fall back to DEGENBUTT if empty
    const tokenName = tokenInputValue.trim() || "DEGENBUTT";
    initializeRugQuest(tokenName.toUpperCase());
    setShowTokenInput(false);
  };

  // Show token input form if needed
  if (showTokenInput) {
    return (
      <div className="flex flex-col h-[100vh] w-[100vw] fixed inset-0 bg-black text-white items-center justify-center font-pixelated p-4 overflow-hidden">
        <div className="w-full max-w-xs bg-gray-800 p-6 rounded-md shadow-lg border-2 border-purple-500">
          <h2 className="text-2xl mb-4 text-center">NAME YOUR TOKEN</h2>
          <p className="mb-4 text-sm text-center">What will your memecoin be called?</p>
          <form onSubmit={handleSubmitTokenName}>
            <input
              type="text"
              value={tokenInputValue}
              onChange={(e) => setTokenInputValue(e.target.value)}
              maxLength={10}
              placeholder="DEGENBUTT"
              autoFocus
              className="w-full bg-gray-900 text-white p-2 mb-4 rounded text-center uppercase font-pixelated border border-purple-400"
            />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white p-2 rounded font-pixelated transition-colors">
              LAUNCH TOKEN
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading screen
  if (!gameInitialized) {
    return (
      <div className="flex flex-col h-[100vh] w-[100vw] fixed inset-0 bg-gray-900 text-white items-center justify-center font-pixelated overflow-hidden">
        <div className="animate-pulse">
          Loading RugQuest...
        </div>
      </div>
    );
  }


  // About modal component - rewritten for better z-index and event handling
  const AboutModal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-[9999] flex items-center justify-center p-4" 
      style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}
      onClick={handleToggleAboutModal}
    >
      <div 
        className="bg-gray-800 rounded-md p-4 max-w-xs border-2 border-purple-500"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2 text-center">RugQuest - Token Launch Simulator</h3>
        <p className="mb-4 text-sm text-center">Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser. 🚀💸</p>
        <p className="text-xs text-center text-gray-400 mb-4">Built by @ardaddy</p>
        <div className="flex justify-center">
          <Button onClick={handleToggleAboutModal}>Close</Button>
        </div>
      </div>
    </div>
  );

  // Game over screen
  if (gameOver) {
    return (
      <div ref={gameScreenRef} className="flex flex-col h-[100vh] w-[100vw] max-h-[100vh] fixed inset-0 bg-gray-900 text-white items-center justify-center font-pixelated p-4 text-center overflow-hidden">
        <h2 className="text-2xl mb-4">Game Over!</h2>
        <p className="text-lg mb-4">{endGameMessage || "The rug has been pulled or something."}</p>
        <p className="mb-2">Final Price: ${price.toFixed(4)}</p>
        <div className="mb-4">
            <Sparkline data={chartData} width={128} height={48} />
        </div>
        <Button 
          onClick={handleShare} 
          disabled={isSharing} 
          className="mb-2"
        >
          {isSharing ? "Sharing..." : `Share to ${isInFarcaster ? 'Farcaster ⌐◨-◨' : 'Twitter 🐦'}`}
        </Button>
        <Button onClick={resetRugQuest} disabled={isSharing}>Play Again?</Button>
        
        {/* About button */}
        <button 
          onClick={handleToggleAboutModal} 
          className="absolute top-4 right-4 bg-black bg-opacity-60 hover:bg-purple-700 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md border border-gray-300 transition-transform hover:scale-110 z-40"
          aria-label="About RugQuest"
        >
          <span className="font-bold text-xs">i</span>
        </button>
        
        {/* About modal - conditionally rendered */}
        {showAboutModal && <AboutModal />}
      </div>
    );
  }

  // Main game screen
  return (
    <div 
      ref={gameScreenRef} 
      className="flex flex-col h-[100vh] w-[100vw] fixed inset-0 text-white items-center justify-between font-pixelated overflow-hidden p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${sceneBackgrounds[currentScene] || sceneBackgrounds.office})` }}
    >
      {/* Top Info Area: Price and Chart */}
      <div className="w-full flex flex-col items-center pt-4 z-10"> {/* Ensure this is above other elements if needed */}
        <div className="text-4xl font-bold text-white mb-1 text-shadow-lg"> {/* Added text shadow */}
          ${price.toFixed(4)}
        </div>
        <div className={`text-lg mb-2 ${isPricePositive ? 'text-lime-400' : 'text-red-500'} text-shadow-sm`}> {/* Added text shadow */}
          ({isPricePositive ? '▲' : '▼'} {priceChangePercent.toFixed(2)}%)
        </div>
        {/* Reduced Sparkline size */}
        <Sparkline data={chartData} isPositiveTrend={isPricePositive} width={200} height={50} /> 
      </div>

      {/* Main game area - Classic arcade-style layout */}
      <div className="flex-grow flex flex-col justify-center items-center relative">
        {/* Speech bubble positioned ABOVE Reply Guy */}
        <div className="flex justify-center items-center mb-4 w-full">
          <SpeechBubble 
            message={currentMessage} 
            isLoading={replyGuyMood === 'idle' && (!currentMessage || currentMessage === "Connecting to the degenverse...")}
            typewriterSpeed={30} 
          />
        </div>
        
        {/* Reply Guy centered */}
        <div className="flex justify-center items-center mb-20"> {/* Added margin to create space above control deck */}
          <div style={{ width: '256px', height: '256px' }}>
            <ReplyGuy mood={replyGuyMood} />
          </div>
        </div>
      </div>

      {/* Control Deck - Kept at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 min-h-[25%] max-h-[30%] bg-black bg-opacity-80 flex flex-col items-center justify-center p-3 z-10 backdrop-blur-sm">
        <div className="flex flex-col w-full max-w-xs relative">
          {!showWriteOwnInput && currentOptions.map((option) => (
            <Button key={option} onClick={() => handleOptionClick(option)} className="mb-2 last:mb-0 w-full">
              {option}
            </Button>
          ))}
          {showWriteOwnInput && (
            <>
              <textarea
                className="font-pixelated bg-gray-700 text-white p-2 border-2 border-gray-500 rounded-md w-full mb-2 focus:border-purple-500 focus:outline-none"
                placeholder="Type your degen reply..."
                value={writeOwnText}
                onChange={(e) => setWriteOwnText(e.target.value)}
                rows={3}
                maxLength={140}
              />
              <Button onClick={handleWriteOwnSubmit} className="w-full mb-1">Send It 🚀</Button>
              <Button variant="writeOwn" onClick={() => setShowWriteOwnInput(false)} className="w-full text-xs py-1">Cancel</Button>
            </>
          )}
          
          {/* Share button - hidden during loading states */}
          {replyGuyMood !== 'idle' && (
            <button 
              onClick={handleShare}
              disabled={isSharing}
              className="absolute -top-10 right-0 text-sm bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded shadow-lg"
            >
              {isSharing ? "Sharing..." : `Share ${isInFarcaster ? '⌐◨-◨' : '🐦'}`}
            </button>
          )}
        </div>
      </div>
      
      {/* About button - visible during gameplay */}
      <button 
        onClick={handleToggleAboutModal} 
        className="absolute top-4 right-4 bg-black bg-opacity-60 hover:bg-purple-700 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md border border-gray-300 transition-transform hover:scale-110 z-40"
        aria-label="About RugQuest"
      >
        <span className="font-bold text-xs">i</span>
      </button>
      
      {/* About modal - conditionally rendered */}
      {showAboutModal && <AboutModal />}
    </div>
  );
};

export default RugQuest;
