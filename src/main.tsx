import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <PrivyProvider
    appId="cmgcn2mkh00m2l70dcj02yhjh"
    config={{
      loginMethods: ["wallet"],
      appearance: {
        walletChainType: "solana-only",
        walletList: ["phantom", "solflare"],
        theme: "dark",
      },
      externalWallets: {
        solana: {
          connectors: toSolanaWalletConnectors(),
        },
      },
    }}
  >
    <App />
  </PrivyProvider>
);
