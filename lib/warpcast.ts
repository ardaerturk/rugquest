import { env } from "@/lib/env";

/**
 * Get the farcaster manifest for the frame, generate yours from Warpcast Mobile
 *  On your phone to Settings > Developer > Domains > insert website hostname > Generate domain manifest
 * @returns The farcaster manifest for the frame
 */
export async function getFarcasterManifest() {
  let frameName = "RugQuest";
  let noindex = false;
  const appUrl = env.NEXT_PUBLIC_URL;
  if (appUrl.includes("localhost")) {
    frameName += " Local";
    noindex = true;
  } else if (appUrl.includes("ngrok")) {
    frameName += " NGROK";
    noindex = true;
  } else if (appUrl.includes("https://dev.")) {
    frameName += " Dev";
    noindex = true;
  }
  return {
    accountAssociation: {
      header: 'eyJmaWQiOjQ3OTE3MCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweGZEMDk0MTk2OTU2NThBNjdlRTgwY2Q3Nzg0MThlZWU2NDM4YTE4YzMifQ',
      payload: 'eyJkb21haW4iOiIyMDI1LnN1Y2tzIn0',
      signature: 'MHhjNTc1NjdjNThhMDUyM2IxYzFmYzU0OTM5NWE1ZWFmN2E1ZTkxYTAzNDExYzQwYjNhMjNiYzg0NmZjODc0MjFhNDBhN2ViODY2YjhjZmJhZmRhNzEzZDIyNmRkYjNkM2FhMjA1YjMxY2JjNGMyZDE2NGMwMGU5NDhiMjExNDViMzFi',
    },
    frame: {
      version: "1",
      name: frameName,
      iconUrl: `${appUrl}/images/reply-guy.png`, // 1024x1024 PNG icon
      homeUrl: appUrl,
      imageUrl: `${appUrl}/images/office.png`,
      buttonTitle: `Start Pumping`,
      splashImageUrl: `${appUrl}/images/splash.png`,
      splashBackgroundColor: "#1F1A29", // Dark purple/black
      webhookUrl: `${appUrl}/api/webhook`,
      
      // Updated Metadata for Farcaster Mini App Store - Following Official Spec
      subtitle: "Token Launch Simulator", // 30 characters max, no emojis, short description under app name
      description: "Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser. Reply Guy is ready to help you pump or dump!", // 170 characters max, promotional message for Mini App Page
      primaryCategory: "games", // From pre-defined categories: games, social, finance, utility, etc.
      tags: ["crypto", "token", "simulator", "memecoin", "game"], // up to 5 tags for filtering/search, no spaces, singular form
      tagline: "Token Launch Simulator", // 30 characters max, punchy marketing tagline
      ogTitle: "RugQuest - Token Simulator", // 30 characters max, app name + short tag, Title case, no emojis
      ogDescription: "Pump to moon or rug pull and run!", // 100 characters max, summarize core benefits in 1-2 lines
      
      // Visual Assets
      screenshotUrls: [
        // Portrait screenshots 1284 x 2778, max 3 screenshots showing core value/magic moments
        `${appUrl}/images/office.png`, // Starting scene - shows the premise
        `${appUrl}/images/club.png`,  // Success scene - shows progression
        `${appUrl}/images/moon.png`,  // Victory scene - shows aspiration
      ],
      heroImageUrl: `${appUrl}/images/office.png`, // 1200 x 630px (1.91:1), promotional display image on mini app store
      ogImageUrl: `${appUrl}/images/office.png`, // 1200 x 630px (1.91:1), promotional image for sharing (same as hero)
      
      noindex: noindex,
    },
  };
}
