"use client";

import { MiniAppProvider } from "@/contexts/miniapp-context";
import { env } from "@/lib/env";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniKit } from "@worldcoin/minikit-js";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { base } from "viem/chains";

const ErudaProvider = dynamic(
  () => import("../components/Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

function WorldcoinMiniKitProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Worldcoin MiniKit
    MiniKit.install(env.NEXT_PUBLIC_WLD_APP_ID);
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErudaProvider>
      <WorldcoinMiniKitProvider>
        <MiniKitProvider
          projectId={env.NEXT_PUBLIC_MINIKIT_PROJECT_ID}
          notificationProxyUrl="/api/notification"
          chain={base}
        >
          <MiniAppProvider>{children}</MiniAppProvider>
        </MiniKitProvider>
      </WorldcoinMiniKitProvider>
    </ErudaProvider>
  );
}
