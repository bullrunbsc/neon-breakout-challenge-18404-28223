import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
const CONTRACT_ADDRESS = "FFPMq7uQ4J26hDrjwHQHd9DhfdsUJmS6v3L4dzHTpump";
const Landing = () => {
  const navigate = useNavigate();
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);

  // Keyboard shortcut for admin panel (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        navigate("/admin");
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [navigate]);
  useEffect(() => {
    // Fetch current game
    const fetchGame = async () => {
      const {
        data
      } = await supabase.from("games").select("*").order("created_at", {
        ascending: false
      }).limit(1).single();
      setCurrentGame(data);
    };
    fetchGame();

    // Subscribe to game changes
    const channel = supabase.channel("games-landing").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "games"
    }, payload => {
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        setCurrentGame(payload.new);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    // Fetch latest payouts
    const fetchPayouts = async () => {
      const {
        data
      } = await supabase.from("payouts").select("*").order("created_at", {
        ascending: false
      }).limit(5);
      if (data) {
        setPayouts(data);
      }
    };
    fetchPayouts();
  }, []);
  useEffect(() => {
    if (!currentGame) return;
    if (currentGame.status === "countdown" && currentGame.started_at) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(currentGame.started_at).getTime();
        const diff = Math.max(0, Math.floor((start - now) / 1000));
        setCountdown(diff);
        if (diff === 0) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [currentGame]);
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    toast.success("Contract address copied!");
  };
  const handleJoinGame = async () => {
    console.log("🔍 Join game state:", { ready, authenticated, wallets });
    
    if (!ready) {
      toast.error("Privy not ready");
      console.log("❌ Privy not ready");
      return;
    }

    if (!authenticated || wallets.length === 0) {
      console.log("🔐 Calling login()");
      login();
      return;
    }

    const walletAddress = wallets[0]?.address;
    console.log("💳 Wallet address:", walletAddress);
    
    if (!walletAddress) {
      toast.error("No wallet address found");
      console.log("❌ No wallet address");
      return;
    }

    if (!currentGame) {
      toast.error("No active game found");
      return;
    }

    // Check if already joined
    const {
      data: existingPlayer
    } = await supabase.from("players").select("*").eq("game_id", currentGame.id).eq("wallet_address", walletAddress).single();
    if (existingPlayer) {
      navigate(`/game?gameId=${currentGame.id}&wallet=${walletAddress}`);
      return;
    }

    // Join game
    const {
      error
    } = await supabase.from("players").insert({
      game_id: currentGame.id,
      wallet_address: walletAddress
    });
    if (error) {
      toast.error("Failed to join game");
      console.error(error);
      return;
    }
    toast.success("Joined game!");
    navigate(`/game?gameId=${currentGame.id}&wallet=${walletAddress}`);
  };
  return <>
      {/* Arcade Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-background">
        {/* Radial gradient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(145_80%_50%_/_0.08),transparent_70%)]" />
        
        {/* Scanlines effect */}
        <div className="absolute inset-0 scanlines opacity-30" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(hsl(145 80% 50% / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(145 80% 50% / 0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

        {/* Animated neon lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse-slow" />
        <div className="absolute top-1/2 right-0 w-1/2 h-px bg-gradient-to-l from-transparent via-accent/30 to-transparent" style={{
        animation: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }} />
        <div className="absolute bottom-1/3 left-1/4 w-1/3 h-px bg-gradient-to-r from-accent/30 via-transparent to-primary/30" style={{
        animation: "pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }} />

        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-24 h-24 border-l-2 border-t-2 border-primary/30" />
        <div className="absolute top-0 right-0 w-24 h-24 border-r-2 border-t-2 border-primary/30" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-l-2 border-b-2 border-accent/30" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-r-2 border-b-2 border-accent/30" />

        {/* Floating neon particles */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" style={{
        animation: "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }} />
      </div>

      {/* Single Screen Layout */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-7xl w-full space-y-10">
          {/* Title */}
          <div className="text-center space-y-5">
            <div className="relative inline-block">
              <h1 className="text-8xl md:text-9xl font-black tracking-[-0.05em] text-foreground uppercase" style={{
              textShadow: "0 0 80px hsl(145 80% 50% / 0.5), 0 0 40px hsl(145 80% 50% / 0.3)",
              fontFamily: "'Orbitron', 'Chakra Petch', 'Rajdhani', monospace"
            }}>BUTTONS</h1>
              <div className="absolute -inset-12 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 blur-3xl -z-10 animate-glow" />
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium tracking-wide">
              Pick wisely. One button leads forward.
            </p>
            <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto">
              3 buttons. 5 rounds. Only one is correct each time.
            </p>
          </div>

          {/* Game Status & Join Form */}
          <div className="max-w-md mx-auto space-y-6">
            {!currentGame && <div className="flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
                <span className="text-lg font-medium italic">No game is live right now</span>
                <span className="text-xs">·</span>
                <Button onClick={() => window.open("https://x.com/WinButtons", "_blank")} variant="ghost" size="sm" className="h-9 px-4 text-sm font-semibold hover:bg-foreground/10 transition-all hover:scale-105">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current mr-2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow us on X
                </Button>
              </div>}

            {currentGame?.status === "finished" && <div className="flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
                <span className="text-lg font-medium italic">No game is live right now</span>
                <span className="text-xs">·</span>
                <Button onClick={() => window.open("https://x.com/WinButtons", "_blank")} variant="ghost" size="sm" className="h-9 px-4 text-sm font-semibold hover:bg-foreground/10 transition-all hover:scale-105">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current mr-2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow us on X
                </Button>
              </div>}

            {currentGame?.status === "waiting" && <p className="text-lg text-muted-foreground animate-pulse-slow">Waiting for game to start...</p>}

            {currentGame?.status === "countdown" && countdown !== null && <div className="space-y-3">
                <p className="text-base text-muted-foreground">Game starts in</p>
                <div className="text-7xl font-black tabular-nums" style={{
              textShadow: "0 0 40px hsl(0 85% 58% / 0.3)"
            }}>
                  {formatCountdown(countdown)}
                </div>
              </div>}

            {currentGame?.status === "active" && <div className="space-y-1">
                <p className="text-xl font-bold">Game in progress</p>
                <p className="text-base text-muted-foreground">
                  Round {currentGame.current_round} / {currentGame.total_rounds}
                </p>
              </div>}

            {/* Join Form */}
            {currentGame && (currentGame.status === "waiting" || currentGame.status === "countdown") && <div className="space-y-4">
                <div className="space-y-2 text-center">
                  {authenticated && wallets.length > 0 && wallets[0]?.address ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Connected: {wallets[0].address.slice(0, 4)}...{wallets[0].address.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {!ready ? "Loading wallet..." : !authenticated ? "Click to connect wallet" : "Wallet not detected"}
                    </p>
                  )}
                </div>
                <Button onClick={handleJoinGame} className="relative w-full h-14 text-lg font-bold rounded-full overflow-hidden group border-2 border-primary/50" style={{
              background: "linear-gradient(135deg, hsl(145 80% 50%), hsl(145 100% 60%))",
              boxShadow: "0 0 40px hsl(145 80% 50% / 0.4), 0 10px 60px -10px hsl(145 80% 50% / 0.6)"
            }}>
                  <span className="relative z-10 text-black font-black tracking-wider">
                    {!authenticated ? "CONNECT WALLET" : "ENTER GAME"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </div>}
          </div>

          {/* Info Grid - Arcade Style */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            {/* How it Works */}
            <div className="relative group p-6 rounded-xl bg-card/40 border-2 border-primary/20 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 border border-primary/30">
                  <span className="text-primary text-xl font-black">?</span>
                </div>
                <h3 className="text-lg font-black text-primary mb-2 uppercase tracking-wide">How it Works</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  5 rounds. Each round shows 3 buttons. Pick one. Only 1 is correct.
                </p>
              </div>
            </div>

            {/* Elimination Rule */}
            <div className="relative group p-6 rounded-xl bg-card/40 border-2 border-accent/20 backdrop-blur-sm hover:border-accent/50 transition-all duration-300">
              <div className="absolute -inset-1 bg-gradient-to-br from-accent/20 via-transparent to-accent/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mb-3 border border-accent/30">
                  <span className="text-accent text-xl font-black">✕</span>
                </div>
                <h3 className="text-lg font-black text-accent mb-2 uppercase tracking-wide">Elimination</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Wrong button or timeout = <span className="text-accent font-bold">eliminated</span>. No second chances.
                </p>
              </div>
            </div>

            {/* Win Condition */}
            <div className="relative group p-6 rounded-xl bg-card/40 border-2 border-primary/20 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 border border-primary/30">
                  <span className="text-primary text-xl font-black">★</span>
                </div>
                <h3 className="text-lg font-black text-primary mb-2 uppercase tracking-wide">Win Condition</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  First <span className="text-primary font-bold">3 players</span> to survive all 5 rounds win.
                </p>
              </div>
            </div>

            {/* Rewards */}
            <div className="relative group p-6 rounded-xl bg-card/40 border-2 border-primary/20 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-3 border border-primary/30">
                  <span className="text-primary text-xl font-black">$</span>
                </div>
                <h3 className="text-lg font-black text-primary mb-2 uppercase tracking-wide">Rewards</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Winners get <span className="text-primary font-bold">80%</span> of rewards. 20% goes to growth.
                </p>
              </div>
            </div>
          </div>

          {/* Prize Rules */}
          <div className="max-w-3xl mx-auto">
            <div className="relative group p-7 rounded-xl bg-card/40 border-2 border-primary/30 backdrop-blur-sm">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl opacity-60 group-hover:opacity-90 blur-xl transition-opacity duration-300" />
              <div className="relative space-y-5">
                <h3 className="text-xl font-black text-primary text-center mb-5 uppercase tracking-wide">Prize Rules</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-background/40 border border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 animate-glow" />
                    <p className="text-muted-foreground leading-relaxed">
                      <span className="text-foreground font-bold">If 0 winners:</span> Funds are gonna be used for buybacks
                    </p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-background/40 border border-accent/20">
                    <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground leading-relaxed">
                      <span className="text-foreground font-bold">If the winner doesn't hold $BUTTONS:</span> 50% of the rewards are given
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Address */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group p-6 rounded-xl bg-card/40 border-2 border-border/30 backdrop-blur-sm hover:border-primary/40 transition-all duration-300">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative space-y-4">
                <h3 className="text-lg font-black text-foreground text-center uppercase tracking-wide">Contract Address</h3>
                <div className="flex gap-3">
                  <Input type="text" value={CONTRACT_ADDRESS} readOnly className="flex-1 h-12 bg-input/60 text-muted-foreground text-xs font-mono border-2 border-border/50 rounded-lg backdrop-blur-sm" />
                  <Button onClick={handleCopyAddress} variant="outline" size="icon" className="h-12 w-12 border-2 border-primary/30 hover:border-primary hover:bg-primary/20 hover:text-primary transition-all rounded-lg">
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="relative w-full border-t-2 border-primary/20 mt-20">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="relative inline-block mb-16 w-full text-center">
            <h2 className="text-6xl font-black text-primary uppercase tracking-tight" style={{
            textShadow: "0 0 60px hsl(145 80% 50% / 0.4)"
          }}>Leaderboard</h2>
            <div className="absolute -inset-8 bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-3xl -z-10 animate-glow" />
          </div>

          {payouts.length === 0 ? <p className="text-center text-muted-foreground">No payouts yet</p> : <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-6 pb-5 border-b-2 border-primary/40 bg-gradient-to-r from-primary/10 to-transparent p-5 rounded-t-xl">
                <div className="text-base font-black text-primary uppercase tracking-wider">Winner Wallet</div>
                <div className="text-base font-black text-primary uppercase tracking-wider">Transaction Hash</div>
                <div className="text-base font-black text-primary text-right uppercase tracking-wider">Amount</div>
              </div>

              {/* Table Rows */}
              {payouts.map((payout, idx) => <div key={payout.id} className="grid grid-cols-3 gap-6 py-5 px-5 border-b border-border/30 hover:bg-card/40 hover:border-primary/20 transition-all group rounded-lg">
                  <div className="text-sm text-muted-foreground font-mono truncate group-hover:text-foreground transition-colors">
                    {payout.winner_wallet}
                  </div>
                  <a href={`https://etherscan.io/tx/${payout.transaction_hash}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary-glow font-mono truncate flex items-center gap-2 transition-colors font-semibold">
                    {payout.transaction_hash.slice(0, 10)}...
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <div className="text-sm text-muted-foreground text-right font-mono group-hover:text-primary transition-colors font-bold">
                    {payout.amount}
                  </div>
                </div>)}
            </div>}
        </div>
      </div>
    </>;
};
export default Landing;