"use client";

import { useAddFrame, useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef, // Added useRef import
  type ReactNode,
} from "react";
import { sdk } from '@farcaster/frame-sdk';

// --- RugQuest Specific Types ---
export type SceneKey = 'office' | 'club' | 'yacht' | 'moon' | 'prison' | 'void';
export type ReplyGuyMood = 'idle' | 'talk' | 'panic';

export interface RugQuestState {
  tokenName: string;
  price: number;
  priceChangePercent: number;
  isPricePositive: boolean;
  chartData: number[]; // Stores up to 15 recent prices
  currentMessage: string;
  currentOptions: string[];
  currentScene: SceneKey;
  replyGuyMood: ReplyGuyMood;
  gameInitialized: boolean;
  gameOver: boolean;
  endGameMessage: string;
  lastPlayerChoice: string | null;
  turnCount?: number; // Track turns for game progression and ending
}

export interface LLMResponsePayload {
  msg: string;
  price: number; // New absolute price
  scene: SceneKey;
  options: string[];
}
// --- End RugQuest Specific Types ---

interface MiniAppContextType {
  // OnchainKit properties
  isFrameReady: boolean;
  setFrameReady: () => void;
  addFrame: () => Promise<{ url: string; token: string } | null>;

  // RugQuest Game State and Actions
  rugQuestState: RugQuestState;
  initializeRugQuest: (username?: string) => void;
  processPlayerChoice: (choice: string, freeText?: string) => Promise<void>; // Renamed for clarity
  resetRugQuest: () => void;
}

const WRITE_YOUR_OWN_OPTION = "✍️ Write your own";

// Array of possible initial messages with only one option (Launch $USERNAME)
const initialMessages = [
  {
    message: `GM boss, $USERNAME is ready to deploy. LFG! 🚀`,
    options: ["Launch $USERNAME token"]
  },
  {
    message: `$USERNAME contract deployed. Ready to rug... erm, I mean MOON! 🔥`,
    options: ["Launch $USERNAME token"]
  },
  {
    message: `Chads and degens ready to ape, boss. $USERNAME to the moon? 💎`,
    options: ["Launch $USERNAME token"]
  },
  {
    message: `Website's up, Discord's pumpin'. $USERNAME token locked and loaded! 👾`,
    options: ["Launch $USERNAME token"]
  }
];

const initialRugQuestState: RugQuestState = {
  tokenName: 'TOKEN',
  price: 0.0100,
  priceChangePercent: 0,
  isPricePositive: true,
  chartData: [0.0100],
  currentMessage: "Connecting to the degenverse...", // Initial loading message
  currentOptions: [], // Options will be fetched
  currentScene: 'office',
  replyGuyMood: 'idle', // Start idle while loading
  gameInitialized: false,
  gameOver: false,
  endGameMessage: '',
  lastPlayerChoice: null,
  turnCount: 0,
};

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const { isFrameReady, setFrameReady, context: miniKitContext } = useMiniKit();
  const addFrame = useAddFrame();
  const [rugQuestState, setRugQuestState] = useState<RugQuestState>(initialRugQuestState);
  const isInitializingRef = useRef(false); // Ref to prevent multiple initializations

  const updateStateFromLLM = useCallback((llmResponse: LLMResponsePayload, playerChoice: string) => {
    setRugQuestState(prevState => {
      const newPrice = llmResponse.price;
      const oldPrice = prevState.price;
      const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
      const newChartData = [...prevState.chartData, newPrice].slice(-15);

      let finalOptions = llmResponse.options;
      if (!finalOptions.includes(WRITE_YOUR_OWN_OPTION)) {
        finalOptions = [...finalOptions, WRITE_YOUR_OWN_OPTION];
      }
      // Ensure "Write your own" is last if it was added, or if it exists, move it to last.
      if (finalOptions.includes(WRITE_YOUR_OWN_OPTION) && finalOptions[finalOptions.length -1] !== WRITE_YOUR_OWN_OPTION) {
        finalOptions = finalOptions.filter(opt => opt !== WRITE_YOUR_OWN_OPTION);
        finalOptions.push(WRITE_YOUR_OWN_OPTION);
      }


      return {
        ...prevState,
        price: newPrice,
        priceChangePercent: changePercent,
        isPricePositive: newPrice >= oldPrice,
        chartData: newChartData,
        currentMessage: llmResponse.msg.replace(/\$USERNAME/g, `$${prevState.tokenName}`).replace(/\$TOKEN/g, `$${prevState.tokenName}`),
        currentOptions: finalOptions,
        currentScene: llmResponse.scene,
        replyGuyMood: 'talk',
        lastPlayerChoice: playerChoice,
      };
    });
  }, []);

  const processPlayerChoice = useCallback(async (choice: string, freeText?: string) => {
    if (rugQuestState.gameOver && choice !== "GAME_START") return; // Allow GAME_START even if technically gameOver

    console.log("Player chose:", choice, "Free text:", freeText);
    
    // Check if this is "Launch $USERNAME" - the first real game action
    const isLaunchAction = choice.startsWith("Launch ");
    const isGameStart = choice === "GAME_START";
    
    // If this is the Launch action, we'll treat it as a special first turn
    if (isLaunchAction) {
      choice = "GAME_START"; // Use GAME_START for the API call to start the game proper
    }
    
    // Set a specific loading state for the message
    // The SpeechBubble component will handle the "..." animation
    const messageWhileLoading = isGameStart || isLaunchAction ? "Connecting to the degenverse..." : ""; // Empty string triggers "..."

    // Increment turn count for non-initialization actions
    const newTurnCount = (rugQuestState.turnCount || 0) + (isGameStart ? 0 : 1);
    
    const currentStateBeforeApiCall = { 
        ...rugQuestState, 
        lastPlayerChoice: isGameStart ? null : choice,
        turnCount: newTurnCount
    };

    setRugQuestState(prev => ({
      ...prev,
      currentMessage: messageWhileLoading, 
      replyGuyMood: 'idle', 
      currentOptions: [], 
      lastPlayerChoice: isGameStart ? prev.lastPlayerChoice : choice,
      // Add a new flag to indicate loading to SpeechBubble if needed, or rely on empty message
    }));

    try {
      const response = await fetch('/api/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choice, // This will be "GAME_START" for the initial call
          freeText,
          state: currentStateBeforeApiCall, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        setRugQuestState(prev => ({
          ...prev,
          currentMessage: `Oops, connection to the degenverse glitchin'. Try again? (${errorData.error || response.statusText})`,
          currentOptions: prev.lastPlayerChoice ? [prev.lastPlayerChoice, "Try different move", WRITE_YOUR_OWN_OPTION] : ["Try Again", WRITE_YOUR_OWN_OPTION],
          replyGuyMood: 'panic',
        }));
        return;
      }

      const llmResponse: LLMResponsePayload = await response.json();
      
      if (!llmResponse.msg || typeof llmResponse.price !== 'number' || !llmResponse.scene || !Array.isArray(llmResponse.options)) {
        console.error("Invalid LLM response structure:", llmResponse);
        setRugQuestState(prev => ({
          ...prev,
          currentMessage: "The AI is spittin' nonsense, boss. Maybe try a different approach?",
          currentOptions: ["Retry Last Move", "Fresh Idea", WRITE_YOUR_OWN_OPTION],
          replyGuyMood: 'panic',
        }));
        return;
      }
      
      updateStateFromLLM(llmResponse, choice);

      // Check for game ending conditions and force ending at high turn counts
      const highTurnCount = newTurnCount >= 12;
      
      if (llmResponse.scene === 'void' || llmResponse.price <= 0) {
        // Void or zero price ending
        setRugQuestState(prev => ({ 
          ...prev, 
          gameOver: true, 
          endGameMessage: llmResponse.msg || "Total annihilation. Bravo. 💀", 
          currentOptions: ["Play Again?"]
        }));
      } else if (llmResponse.scene === 'prison') {
        // Prison ending
        setRugQuestState(prev => ({ 
          ...prev, 
          gameOver: true, 
          endGameMessage: llmResponse.msg || "Orange looks good on you 😂 SEC says hi.", 
          currentOptions: ["Restart Simulation"]
        }));
      } else if (llmResponse.scene === 'moon' && (llmResponse.price >= 0.1000 || highTurnCount)) {
        // Moon ending - the big win (at high price or high turn count)
        setRugQuestState(prev => ({ 
          ...prev, 
          gameOver: true, 
          endGameMessage: llmResponse.msg || `$${prev.tokenName} hit the stratosphere! You're rich, anon! 🌕`, 
          currentOptions: ["Cash Out"]
        }));
      } else if (highTurnCount) {
        // Force an ending if turn count is too high, even if AI didn't end it
        // Pick a random ending based on price
        const price = llmResponse.price;
        const initialPrice = 0.0100;
        
        if (price >= initialPrice * 10) {
          // High price = moon ending
          setRugQuestState(prev => ({ 
            ...prev, 
            gameOver: true,
            currentScene: 'moon',
            endGameMessage: `After an epic ${newTurnCount}-turn run, $${prev.tokenName} moons! The degens made you their king! 🚀`,
            currentOptions: ["Cash Out"]
          }));
        } else if (price <= initialPrice * 0.5) {
          // Low price = void ending
          setRugQuestState(prev => ({ 
            ...prev, 
            gameOver: true,
            currentScene: 'void',
            endGameMessage: `After ${newTurnCount} wild turns, $${prev.tokenName} crashed and burned. Total annihilation! 💀`,
            currentOptions: ["Try Again?"]
          }));
        } else {
          // Medium price = SEC raid ending
          setRugQuestState(prev => ({ 
            ...prev, 
            gameOver: true,
            currentScene: 'prison',
            endGameMessage: `Turn ${newTurnCount}: SEC kicks down the door! Your ${newTurnCount}-turn $${prev.tokenName} journey ends in cuffs. 🚔`,
            currentOptions: ["Serve Time"]
          }));
        }
      }

    } catch (error) {
      console.error("Failed to process player choice:", error);
      setRugQuestState(prev => ({
        ...prev,
        currentMessage: "Network error, boss! The memes aren't flowing. Try again.",
        currentOptions: prev.lastPlayerChoice ? [prev.lastPlayerChoice, "Refresh", WRITE_YOUR_OWN_OPTION] : ["Try Again", WRITE_YOUR_OWN_OPTION],
        replyGuyMood: 'panic',
      }));
    }
  }, [rugQuestState, updateStateFromLLM]);

  const initializeRugQuest = useCallback((username: string = "USERNAME") => {
    console.log("initializeRugQuest called with username:", username);
    
    // Check if we're already initialized or initializing - be extra defensive
    if (rugQuestState.gameInitialized || isInitializingRef.current) {
      console.log("Game already initialized or initializing - skipping");
      return;
    }
    
    isInitializingRef.current = true;
    console.log("Setting isInitializingRef.current =", isInitializingRef.current);
    
    // Select a random initial message
    const randomIndex = Math.floor(Math.random() * initialMessages.length);
    const initialMessageObj = initialMessages[randomIndex];
    
    const initialPrice = 0.0100;
    const baseState = {
      ...initialRugQuestState,
      tokenName: username,
      price: initialPrice,
      chartData: [initialPrice],
      currentMessage: initialMessageObj.message.replace(/\$USERNAME/g, `$${username}`),
      gameInitialized: true,
      gameOver: false,
      endGameMessage: '',
      replyGuyMood: 'talk' as ReplyGuyMood, // Set to 'talk' since this is an active message
      currentOptions: initialMessageObj.options.map(opt => opt.replace(/\$USERNAME/g, `$${username}`)),
      turnCount: 0, // Initialize turn count
    };
    
    console.log("Setting initial rugQuestState with hardcoded message");
    setRugQuestState(baseState);
    
    // No immediate API call - will happen when user selects "Launch $USERNAME"
  }, [rugQuestState.gameInitialized]); // Removed processPlayerChoice dependency

  const resetRugQuest = useCallback(() => {
    initializeRugQuest(rugQuestState.tokenName);
  }, [initializeRugQuest, rugQuestState.tokenName]);

  const handleAddFrame = useCallback(async () => {
    try {
      const result = await addFrame();
      if (result) {
        return result;
      }
      return null;
    } catch (error) {
      console.error("[error] adding frame", error);
      return null;
    }
  }, [addFrame]);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  useEffect(() => {
    if (isFrameReady && !miniKitContext?.client?.added) { // Use renamed context
      handleAddFrame();
    }
  }, [miniKitContext?.client?.added, handleAddFrame, isFrameReady]);

  // Function to get username from Farcaster SDK context
  const getFarcasterUsername = useCallback(async () => {
    try {
      // Try to get username from Farcaster SDK
      if (!sdk || !sdk.context) {
        return "TOKEN";
      }
      
      const farcasterContext = await sdk.context;
      const user = farcasterContext?.user;
      
      if (user?.username) {
        return user.username.toUpperCase();
      } else if (user?.displayName) {
        // Fall back to display name if username is not available
        return user.displayName.toUpperCase();
      }
      
      // Default fallback name
      return "TOKEN";
    } catch (error) {
      console.error("Error accessing Farcaster context:", error);
      return "TOKEN";
    }
  }, []);

  // State for custom token name input
  const [customTokenName, setCustomTokenName] = useState("");
  const [showTokenNameInput, setShowTokenNameInput] = useState(false);

  // Auto-initialize RugQuest on load - run once only
  useEffect(() => {
    const initializeGame = async () => {
      console.log("Auto-init useEffect running", {
        gameInitialized: rugQuestState.gameInitialized,
        isInitializingRef: isInitializingRef.current
      });
      
      if (!rugQuestState.gameInitialized && !isInitializingRef.current) {
        const username = await getFarcasterUsername();
        console.log("Auto-initializing game with username:", username);
        
        if (username !== "TOKEN") {
          // We have a Farcaster username, use it
          initializeRugQuest(username);
        } else {
          // We don't have a username, show input prompt
          setShowTokenNameInput(true);
        }
      }
    };
    
    initializeGame();
  }, [getFarcasterUsername, initializeRugQuest, rugQuestState.gameInitialized]); // Added proper dependencies

  return (
    <MiniAppContext.Provider
      value={{
        isFrameReady,
        setFrameReady,
        addFrame: handleAddFrame,
        rugQuestState,
        initializeRugQuest,
        processPlayerChoice,
        resetRugQuest,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const currentContext = useContext(MiniAppContext); // Renamed to avoid conflict
  if (currentContext === undefined) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return currentContext;
}
