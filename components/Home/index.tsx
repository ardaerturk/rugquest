"use client";

import RugQuest from "@/components/RugQuest/RugQuest"; // Import the RugQuest component

export default function Home() {
  // The MiniAppProvider in layout.tsx will provide the necessary context for RugQuest
  return <RugQuest />;
}
