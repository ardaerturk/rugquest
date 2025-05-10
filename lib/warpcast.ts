import { env } from "@/lib/env";

/**
 * Get the farcaster manifest for the frame, generate yours from Warpcast Mobile
 *  On your phone to Settings > Developer > Domains > insert website hostname > Generate domain manifest
 * @returns The farcaster manifest for the frame
 */
export async function getFarcasterManifest() {
  let frameName = "RugQuest - Token Launch Simulator";
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
      header: env.NEXT_PUBLIC_FARCASTER_HEADER,
      payload: env.NEXT_PUBLIC_FARCASTER_PAYLOAD,
      signature: env.NEXT_PUBLIC_FARCASTER_SIGNATURE,
    },
    frame: {
      version: "1",
      name: frameName,
      iconUrl: `${appUrl}/images/reply-guy.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/images/office.png`,
      buttonTitle: `Start Pumping`,
      splashImageUrl: `${appUrl}/images/splash.png`,
      splashBackgroundColor: "#1F1A29", // Dark purple/black
      webhookUrl: `${appUrl}/api/webhook`,
      // Metadata https://github.com/farcasterxyz/miniapps/discussions/191
      subtitle: "Crypto token simulator with meme vibes", // 30 characters, no emojis or special characters, short description under app name
      description: "Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser. Reply Guy is ready to help you pump... or dump!", // 170 characters, no emojis or special characters, promotional message displayed on Mini App Page
      primaryCategory: "games",
      tags: ["crypto", "defi", "game", "memecoin", "simulator"], // up to 5 tags, filtering/search tags
      tagline: "Pump it or rug it - your choice, ser!", // 30 characters, marketing tagline should be punchy and descriptive
      ogTitle: `${frameName}`, // 30 characters, app name + short tag, Title case, no emojis
      ogDescription: "Launch your token with Reply Guy. Pump it to the moon or rug pull and run - no SEC in the metaverse!", // 100 characters, summarize core benefits in 1-2 lines
      screenshotUrls: [
        // 1284 x 2778, visual previews of the app, max 3 screenshots
        `${appUrl}/images/office.png`,
        `${appUrl}/images/club.png`,
        `${appUrl}/images/moon.png`,
      ],
      heroImageUrl: `${appUrl}/images/office.png`, // 1200 x 630px (1.91:1), promotional display image on top of the mini app store
      ogImageUrl: `${appUrl}/images/office.png`, // 1200 x 630px (1.91:1), promotional image, same as app hero image
      noindex: noindex,
    },
  };
}
