import App from "@/components/App";
import { env } from "@/lib/env";
import { Metadata } from "next";

const appUrl = env.NEXT_PUBLIC_URL;

const frame = {
  version: "next",
  imageUrl: `${appUrl}/images/office.png`,
  button: {
    title: "Start Pumping",
    action: {
      type: "launch_frame",
      name: "RugQuest",
      url: appUrl,
      splashImageUrl: `${appUrl}/images/splash.png`,
      splashBackgroundColor: "#1F1A29",
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "RugQuest",
    openGraph: {
      title: "RugQuest - Token Launch Simulator",
      description: "Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser!",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  return <App />;
}
