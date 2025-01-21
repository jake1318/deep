import { useState, useEffect } from "react";
import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useWallets,
} from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeepBookClient } from "@mysten/deepbook-v3";
import "./App.css";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: "https://fullnode.mainnet.sui.io:443" },
});

const queryClient = new QueryClient();

const App = () => {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [loading, setLoading] = useState(false);
  const [sellToken, setSellToken] = useState<string>("SUI");
  const [buyToken, setBuyToken] = useState<string>("DBUSDC");
  const [sellAmount, setSellAmount] = useState<number>(0);
  const [expectedReceiveAmount, setExpectedReceiveAmount] = useState<number>(0);

  const handleSwapExactBaseForQuote = async () => {
    if (!currentAccount) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!sellAmount || sellAmount <= 0) {
      alert("Please enter a valid sell amount.");
      return;
    }

    setLoading(true);
    try {
      const deepBookClient = new DeepBookClient({
        client: suiClient,
        address: currentAccount.address,
        env: "mainnet",
      });

      // Check if the pool exists
      const poolId = `${sellToken}_${buyToken}`;
      const poolInfo = await deepBookClient.getPoolInfo(poolId);
      if (!poolInfo) throw new Error(`Pool ${poolId} does not exist.`);

      const tx = await deepBookClient.placeMarketOrder({
        poolId,
        quantity: BigInt(sellAmount),
        orderType: "ask",
        recipientAddress: currentAccount.address,
      });

      await signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Swap successful:", result);
            alert("Swap successful!");
          },
          onError: (error) => {
            console.error("Swap failed:", error);
            alert("Swap failed!");
          },
        }
      );
    } catch (error) {
      console.error("Error during swap:", error);
      alert(
        "Error during swap: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateExpectedReceiveAmount = async () => {
    if (!sellAmount || sellAmount <= 0 || !sellToken || !buyToken) {
      setExpectedReceiveAmount(0);
      return;
    }

    try {
      const deepBookClient = new DeepBookClient({
        client: suiClient,
        address: currentAccount?.address || "",
        env: "mainnet",
      });

      const marketPrice = await deepBookClient.getMarketPrice(
        `${sellToken}_${buyToken}`
      );
      if (marketPrice && marketPrice.bestBidPrice) {
        setExpectedReceiveAmount(Number(marketPrice.bestBidPrice) * sellAmount);
      } else {
        setExpectedReceiveAmount(0);
      }
    } catch (error) {
      console.error("Error calculating receive amount:", error);
      setExpectedReceiveAmount(0);
    }
  };

  useEffect(() => {
    calculateExpectedReceiveAmount();
  }, [sellAmount, sellToken, buyToken]);

  return (
    <div className="app-container">
      <Navbar />
      <div className="swap-container">
        <h1>SuiMind Swap</h1>
        <div className="swap-section">
          <select
            value={sellToken}
            onChange={(e) => setSellToken(e.target.value)}
          >
            <option value="SUI">SUI</option>
            <option value="DBUSDC">DBUSDC</option>
          </select>
          <input
            type="number"
            placeholder="Sell Amount"
            value={sellAmount}
            onChange={(e) => setSellAmount(Number(e.target.value))}
          />
        </div>
        <div className="swap-section">
          <select
            value={buyToken}
            onChange={(e) => setBuyToken(e.target.value)}
          >
            <option value="DBUSDC">DBUSDC</option>
            <option value="SUI">SUI</option>
          </select>
          <input
            type="number"
            placeholder="Expected Receive Amount"
            value={expectedReceiveAmount.toFixed(4)}
            disabled
          />
        </div>
        <button
          className="swap-button"
          onClick={handleSwapExactBaseForQuote}
          disabled={!currentAccount || loading}
        >
          {loading ? "Swapping..." : "Swap"}
        </button>
      </div>
      <Footer />
    </div>
  );
};

const Navbar = () => (
  <nav className="navbar">
    <div className="logo">
      <img src="Design_2.png" alt="Sui Mind Logo" className="logo-image" />
      <span>Sui Mind</span>
    </div>
    <CustomWalletButton />
  </nav>
);

const CustomWalletButton = () => {
  const wallets = useWallets();
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<
    string | null
  >(null);

  const handleWalletConnect = async () => {
    if (!wallets || wallets.length === 0) {
      alert("No wallets found. Please install a Sui wallet extension.");
      return;
    }

    const selectedWallet = wallets[0];
    try {
      if (selectedWallet.features["standard:connect"]) {
        const connectFeature = selectedWallet.features["standard:connect"];
        await connectFeature.connect();
        const address = selectedWallet.accounts[0]?.address;
        if (address) {
          setConnectedWalletAddress(address);
        }
      } else {
        alert("The selected wallet does not support connection functionality.");
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      alert("Failed to connect to the wallet.");
    }
  };

  const handleWalletDisconnect = () => {
    setConnectedWalletAddress(null);
    alert("Wallet disconnected successfully.");
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="wallet-container">
      {connectedWalletAddress ? (
        <>
          <button className="wallet-button">
            {formatAddress(connectedWalletAddress)}
          </button>
          <button
            className="wallet-disconnect"
            onClick={handleWalletDisconnect}
          >
            Disconnect
          </button>
        </>
      ) : (
        <button className="wallet-button" onClick={handleWalletConnect}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};

const Footer = () => (
  <footer>
    <p>© 2025 Sui Mind. All rights reserved.</p>
  </footer>
);

export const WrappedApp = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
      <WalletProvider autoConnect={true}>
        <App />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default WrappedApp;
