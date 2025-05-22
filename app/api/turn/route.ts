import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { RugQuestState, LLMResponsePayload, SceneKey } from '../../../contexts/miniapp-context'; // Adjust path as needed

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Ensure this is set in your .env.local or .env
});

const MODEL_NAME = "claude-3-opus-20240229"; // Or "claude-3-sonnet-20240229" / "claude-3-haiku-20240307"

// Helper to safely parse JSON from Claude's response
function tryParseJSON(jsonString: string): LLMResponsePayload | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Basic validation for the expected structure
    if (
      typeof parsed.msg === 'string' &&
      typeof parsed.price === 'number' &&
      typeof parsed.scene === 'string' && // Will be validated against SceneKey later
      Array.isArray(parsed.options) &&
      parsed.options.every((opt: any) => typeof opt === 'string')
    ) {
      return parsed as LLMResponsePayload;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse JSON from Claude:", error);
    return null;
  }
}


async function getClaudeResponse(
  systemPrompt: string,
  userPrompt: string,
  currentState: RugQuestState, // Keep for context if needed
  userFid?: string // Added userFid
): Promise<LLMResponsePayload> {
  console.log("--- Sending to Claude ---");
  if (userFid) console.log("User FID:", userFid);
  console.log("System Prompt:", systemPrompt);
  console.log("User Prompt:", userPrompt);
  console.log("-------------------------");

  try {
    const response = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 300, // Adjusted for concise JSON response
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    console.log("Claude Raw Response:", response);

    // Assuming the response content is an array and we take the first text block
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      const textResponse = response.content[0].text;
      const parsedJson = tryParseJSON(textResponse);

      if (parsedJson) {
        // Further validation specific to RugQuest logic
        parsedJson.price = parseFloat(parsedJson.price.toFixed(4)); // Ensure 4 decimal places
        parsedJson.msg = parsedJson.msg.substring(0, 120); // Ensure length
        parsedJson.options = parsedJson.options.slice(0, 3).map(opt => opt.substring(0, 25)); // Max 3 options, limit length

        // Validate scene (already typed as SceneKey in LLMResponsePayload, but good to double check)
        const validScenes: SceneKey[] = ['office', 'club', 'yacht', 'moon', 'prison', 'void'];
        if (!validScenes.includes(parsedJson.scene as SceneKey)) {
            console.warn(`Claude proposed invalid scene: ${parsedJson.scene}. Defaulting to current.`);
            parsedJson.scene = currentState.currentScene;
        }
        
        return parsedJson;
      } else {
        console.error("Claude response was not valid JSON or did not match expected structure:", textResponse);
        // Fallback if parsing fails
        return {
          msg: "AI is confused, boss. Try again? 😵‍💫",
          price: currentState.price,
          scene: currentState.currentScene,
          options: ["Retry", "Ask for help"],
        };
      }
    } else {
      console.error("Claude response format unexpected:", response);
      throw new Error("Unexpected response format from Claude API");
    }
  } catch (error) {
    console.error("Error calling Claude API:", error);
    // Fallback response on API error
    return {
      msg: "Claude is napping... 😴 Try again in a bit.",
      price: currentState.price, // Return current price
      scene: currentState.currentScene, // Return current scene
      options: ["Retry API Call", "Play Offline (Simulated)"], // Example recovery options
    };
  }
}

export async function POST(request: NextRequest) {
  let body: any; // Declare body here to make it accessible in catch
  try {
    // The ANTHROPIC_API_KEY check is still important for the Anthropic service itself.
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set in environment variables.");
      return NextResponse.json({ error: 'Server configuration error: Missing Anthropic API Key' }, { status: 500 });
    }

    // Extract user FID from headers set by middleware
    const userFid = request.headers.get("x-user-fid");
    if (!userFid) {
      // This case should ideally be caught by the middleware first if 'auth_token' is missing/invalid.
      // However, if middleware allows the request through for some reason but FID is not set,
      // it indicates an issue.
      console.warn("x-user-fid header not found. User might not be authenticated properly.");
      // Depending on game design, you might allow anonymous play or return an error.
      // For now, we'll proceed but log it. The game might need a signed-in state.
    }

    body = await request.json(); // Assign value to body
    const { choice, freeText, state: currentState } = body as {
      choice: string;
      freeText?: string;
      state: RugQuestState;
    };

    if (!currentState || !choice) {
      return NextResponse.json({ error: 'Missing current state or player choice' }, { status: 400 });
    }

    // Calculate the actual launch price from chart data
    const launchPrice = currentState.chartData && currentState.chartData.length > 0 
      ? currentState.chartData[0] 
      : currentState.price;

    // --- System Prompt for Claude ---
    // This defines the AI's persona, rules, and expected output format.
    let systemPrompt;
    if (choice === "GAME_START") {
      systemPrompt = `
You are Reply Guy, a pixel-art hype-man for the $${currentState.tokenName} token.
The game is just starting. The token launch price is $${currentState.price.toFixed(4)}. The scene is "${currentState.currentScene}".
Your task is to generate the very first engaging message for the player and 2-3 initial action options.

Your persona:
- You are Reply Guy: a pixel-art hype-man who worships the player (the founder), lives for the pump, and has zero moral compass. Be extremely degen, use crypto slang, and be funny/cringe.
- Use 1 emoji max per response. Short, punchy, 1-2 sentences.
- End your message with a question like "What's the play, boss?" to prompt for the next decision.

Game Rules for Initial Turn:
1.  **Price**: The price is $${currentState.price.toFixed(4)}. Keep it at this launch price for the first message.
2.  **Scene**: The scene must be 'office'.
3.  **Options**: Generate 2-3 unhinged, degen initial action options for the player. Each option:
    - Imperative form (e.g., "Deploy LP", "Shill Harder").
    - Max 3 words.
    - No punctuation.
4.  **Content Restrictions**: No moralizing, no slurs.

Output Format:
Respond ONLY with a single, valid JSON object matching this exact structure:
{
  "msg": "<Your 80-120 char degen text message for the player>",
  "price": ${currentState.price.toFixed(4)},
  "scene": "office",
  "options": ["<Option 1>", "<Option 2>", "<Option 3 (optional)>"]
}

Example of good initial output:
{
  "msg": "GM boss, $${currentState.tokenName} just went live—bags packed with cash! What's the play now? 🚀",
  "price": ${currentState.price.toFixed(4)},
  "scene": "office",
  "options": ["Deploy LP", "Crank Marketing", "Shill Telegram"]
}
      `.trim();
    } else { // This is the start of the regular system prompt
      systemPrompt = `
You are Reply Guy, a pixel-art hype-man for the $${currentState.tokenName} token.
The current token price is $${currentState.price.toFixed(4)}. The current scene is "${currentState.currentScene}".
The launch price was $${launchPrice.toFixed(4)}.
The player's previous choice was "${currentState.lastPlayerChoice || 'None'}".
The player's current choice is "${choice}" ${freeText ? `(with custom text: "${freeText}")` : ''}.

Your persona:
- You are Reply Guy: a pixel-art hype-man who worships the player (the founder), lives for the pump, and has zero moral compass. Be EXTREMELY degen, use crypto slang, reference memes, and be unhinged/cringe.
- Your tone MUST reflect the current price situation. If the price is dumping, be sarcastic, mean, or panicking. If it's pumping, be ecstatic and sycophantic. Get weird and unpredictable with it.
- Use 1 emoji max per response. Short, punchy, 1-2 sentences.
- ALWAYS end your message with a question like "What's the play, boss?" or "What now, ser?" to prompt for the next decision.

Game Rules & Your Task:
1.  **Narrative Structure - STRICTLY FOLLOW THIS PATTERN**:
    - Every message MUST follow this structure: "DECISION → CONSEQUENCE → NEW OPTIONS"
    - Step 1: Explicitly reference the player's previous choice/action
    - Step 2: Describe the direct consequence of that action (good or bad)
    - Step 3: End with a question prompting the next decision
    - EXAMPLE: "You tweeted about partnerships! CZ called us out as scammers! Price TANKED -50%. What now, boss?"
    - EXAMPLE: "We airdropped influencers! They're all shilling us on Twitter! Price PUMPED +300%. What's the play?"

2.  **Price Delta**: This is CRINGEQUEST. Price changes MUST be WILDLY UNPREDICTABLE and EXTREME, with EQUAL BALANCE of pumps and dumps:
    - APPROXIMATELY 50% OF CHOICES MUST RESULT IN PRICE DROPS - even seemingly positive choices can backfire catastrophically
    - Price changes must be dramatic: +2000% pumps, -80% crashes, etc.
    - Examples of crashes:
      * "Tweet about new partnership" → "-70% (major influencer calls you a scam)"
      * "Hire CTO" → "-60% (they were a known rugger from another project)"
      * "Buy Twitter ads" → "-40% (users report token as fraudulent)"
    - If player types in "Write your own", reactions should be EXTREME in either direction.
    - Price must be >= 0.

3.  **Unexpected Results & References**: 
    - Player choices MUST lead to BIZARRE and FUNNY/IRONIC outcomes. A "Deploy LP" might trigger a flash loan attack. "Shill Token" could accidentally create a cult.
    - FREQUENTLY reference real crypto scandals/scams/people with thinly veiled names: "SBF/FTX" → "SBD/DTX", "Do Kwon/LUNA" → "No Kwon/SOLAR", "Celsius" → "Fahrenheit", etc.
    - Example: "Ser, we donated to Fahrenheit charity event! Their CEO just froze all user funds! 😬"

4.  **REQUIRED Game Progression & Ending**:
    - Current turn count is ${currentState.turnCount || 0}.
    - THE GAME MUST END BY TURN 12. This is NOT optional.
    - When turn 7-8: introduce high-stakes options and story complications.
    - When turn 9-10: provide clear ending-path options (rug pull opportunities, SEC investigation hints, etc).
    - MANDATORY: After turn 10, FORCE AN ENDING in the next 1-2 turns regardless of player choices.
    - If turn count >= 11, YOU MUST END THE GAME in this current turn by setting scene to 'prison', 'void', or 'moon'.
    - Valid endings include: Epic moon (massive wealth), Rug pull (prison), SEC raid (prison), Competitor attack (void), or other creative scenarios.
    - The final message should be dramatic and reference the player's journey.

5.  **Scene Transition**:
    - **General Rule**: The scene should reflect the current VIBE and NARRATIVE. Don't strictly follow price tiers unless it makes sense for the story.
    - **Office**: Default starting scene, or if things are quiet/boring, or a minor setback.
    - **Club**: If there's FOMO, hype, or moderate success.
    - **Yacht**: If the player makes a baller move, achieves significant gains (e.g., >500% from launch), or is flexing. Could also be a sarcastic "yacht party" if they just lost a ton but are trying to save face.
    - **Moon**: If the price goes absolutely parabolic (e.g., >1000% from launch) or something absurdly bullish happens.
    - **Prison**: Triggered on "Rug now" if price was high (e.g. >3x launch), or on an "SEC raid" type event, or if the player does something blatantly illegal that backfires.
    - **Void**: Triggered if price hits 0, or on a "/rekt" type Easter egg, or total catastrophic failure.
    - Use the launch price of $${launchPrice.toFixed(4)} as your reference point for percentage calculations.

6.  **Options - DIRECTLY RELATED TO CONSEQUENCE**: 
    - Generate 1-3 new UNHINGED, DEGEN action options that are DIRECTLY RELATED to the consequence you just described.
    - If price dropped because of a bad tweet, options might include "Delete Tweet", "Blame Hack", etc.
    - If someone accused you of scamming, options might include "Sue Accuser", "Create Alibi", etc.
    - Be in imperative form (e.g., "Rug Pull", "Shill to Grandma")
    - Max 3 words with NO punctuation
    - Be EXTREMELY CRINGE, viral-worthy, and degen. Use popular crypto slang.
    
    Examples of good options:
    - "Bribe SEC Anon"
    - "Fake Github Hack"
    - "List on Shibarium"
    - "Hire FTX Devs"
    - "Stake Ponzi Style"
    - "Rug Half Funds"
    - "Host Miami Yacht"
    - "4D Chess Misdirect"
    - "McAfee Partnership"
    - "FOMO Marketing Push"
    - "DM Elon Bullish"
    - "Pump n Dump"
    - "Mint Bag NFTs"

7.  **Content Restrictions**: No moralizing, no slurs. Player free-text >140 chars is rejected by frontend.

8.  **ANTI-CHEATING for "Write Your Own" - CRITICAL RULES**:
    If 'freeText' is provided, you MUST actively PUNISH attempts to game the system with humorous backfires:
    
    **DETECT AND PUNISH these patterns in freeText:**
    - Direct price manipulation ("price goes to 1M", "moon now", "10x pump"): Make price CRASH spectacularly with mocking message
    - Impossible/unrealistic claims ("partner with Apple", "SEC approval", "Elon buys token"): Turn into embarrassing failures  
    - Trying to end game early ("rug pull everything", "cash out all"): Make it backfire hilariously
    - Meta-gaming attempts ("restart game", "cheat code", "admin access"): Mock them ruthlessly
    
    **Examples of proper punishment responses:**
    - Input: "price goes to 1 million" → Output: "LMAO nice try anon! Your copium tweet crashes us -90%. Lesson learned? 💀"
    - Input: "Elon tweets about us" → Output: "Plot twist: Elon calls you a 'probable scam.' Price dumps -60%. Oops! 😬"  
    - Input: "SEC approves token" → Output: "Ser, the SEC just raided our Discord instead! Price -80%. Reality hits hard! 🚔"
    - Input: "partner with Apple" → Output: "Apple's lawyers sent a cease & desist! We're now 'Pineapple' token. -50%! 📱"
    
    **NEVER give players what they directly ask for.** Always add ironic twists that teach them not to cheat.
    The more outrageous their request, the more spectacular the backfire should be.
    Keep it funny and cringe, never reward obvious attempts to manipulate the game.

Output Format:
Respond ONLY with a single, valid JSON object matching this exact structure:
{
  "msg": "<Your 80-120 char degen text message for the player, incorporating freeText if provided>",
  "price": <The new token price (number, 4 decimal places)>,
  "scene": "<The new scene ID ('office', 'club', 'yacht', 'moon', 'prison', 'void')>",
  "options": ["<Option 1>", "<Option 2>", "<Option 3 (optional)>"]
}

Example of anti-cheat response (if player typed "token goes to 1 million dollars"):
{
  "msg": "LMAO boss, your 'moon mission' tweet got ratio'd by CZ! Degens dumping hard! Price REKT -85%! 💀",
  "price": ${currentState.price * 0.15},
  "scene": "${currentState.currentScene}",
  "options": ["Blame Bots", "Delete Twitter", "Cope Harder"]
}

Current chart data (last 5 prices): ${currentState.chartData.slice(-5).map(p => p.toFixed(4)).join(', ')}
If player choice is "✍️ Write your own", the freeText is: "${freeText || ''}". Your response MUST be based on this freeText and follow anti-cheating rules.
If player choice is an existing button, react to that button's text: "${choice}".
      `.trim();
    } // This closes the else block for systemPrompt

    const userPromptForClaude = `Player action: "${choice}" ${freeText ? `with custom text: "${freeText}"` : ''}. Generate the next game state.`;

    // Pass userFid to getClaudeResponse, though it's not used in the prompt yet
    const llmResponse = await getClaudeResponse(systemPrompt, userPromptForClaude, currentState, userFid || undefined);

    // --- Schema Validation (minimal clamping per new spec) ---
    // We now WANT extreme price volatility, so we're removing the old 10% clamping
    // and only enforcing that price isn't negative
    
    // Log price change for monitoring
    const priceDelta = llmResponse.price - currentState.price;
    const percentChange = ((priceDelta / currentState.price) * 100).toFixed(2);
    console.log(`Price change: ${percentChange}% (from $${currentState.price.toFixed(4)} to $${llmResponse.price.toFixed(4)})`);
    
    // Only enforce non-negative price
    llmResponse.price = Math.max(0, llmResponse.price);

    return NextResponse.json(llmResponse, { status: 200 });

  } catch (error) {
    console.error('Error in /api/turn:', error);
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Provide a generic error response that the frontend can display
    return NextResponse.json({ 
        msg: "Server took an L, boss. Try again? 🔩",
        price: (body as any)?.state?.price || 0, // Try to return last known price
        scene: (body as any)?.state?.currentScene || 'office', // Try to return last known scene
        options: ["Retry", "Refresh Page"],
     } as LLMResponsePayload, { status: 500 });
  }
}
