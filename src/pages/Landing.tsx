import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

const CONTRACT_ADDRESS = "FFPMq7uQ4J26hDrjwHQHd9DhfdsUJmS6v3L4dzHTpump";
const Landing = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState("");

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
      const { data } = await supabase
        .from("games")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .single();
      setCurrentGame(data);
    };
    fetchGame();

    // Subscribe to game changes
    const channel = supabase
      .channel("games-landing")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setCurrentGame(payload.new);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    // Fetch latest payouts
    const fetchPayouts = async () => {
      const { data } = await supabase
        .from("payouts")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(5);
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
    if (!walletAddress.trim()) {
      toast.error("Please enter your wallet address");
      return;
    }
    if (!currentGame) {
      toast.error("No active game found");
      return;
    }

    // Check if already joined
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", currentGame.id)
      .eq("wallet_address", walletAddress)
      .single();
    if (existingPlayer) {
      navigate(`/game?gameId=${currentGame.id}&wallet=${walletAddress}`);
      return;
    }

    // Join game
    const { error } = await supabase.from("players").insert({
      game_id: currentGame.id,
      wallet_address: walletAddress,
    });
    if (error) {
      toast.error("Failed to join game");
      console.error(error);
      return;
    }
    toast.success("Joined game!");
    navigate(`/game?gameId=${currentGame.id}&wallet=${walletAddress}`);
  };
  return (
    <>
      {/* Hero gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(0_85%_58%_/_0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_3%),hsl(0_20%_6%))]" />

        {/* Animated Red Lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse-slow" />
        <div
          className="absolute top-1/2 right-0 w-1/2 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent"
          style={{ animation: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />
        <div
          className="absolute bottom-1/3 left-1/4 w-1/3 h-px bg-gradient-to-r from-primary/20 via-transparent to-primary/20"
          style={{ animation: "pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />

        {/* Diagonal Lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-primary/10 via-transparent to-primary/10" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-primary/10 to-transparent" />

        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/20" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/20" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/20" />

        {/* Floating Red Glows */}
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          style={{ animation: "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />
      </div>

      {/* Single Screen Layout */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-7xl w-full space-y-10">
          {/* Title */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <h1
                className="text-7xl md:text-8xl font-black tracking-tighter text-foreground uppercase"
                style={{ textShadow: "0 0 60px hsl(0 85% 58% / 0.4)" }}
              >
                DOORZ
              </h1>
              <div className="absolute -inset-8 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 blur-3xl -z-10" />
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              5 rounds. 3 doors. Choose wisely - 2 doors eliminate you, 1 advances you.
            </p>
          </div>

          {/* Game Status & Join Form */}
          <div className="max-w-md mx-auto space-y-6">
            {!currentGame && (
              <div className="flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
                <span className="text-lg font-medium italic">No game is live right now</span>
                <span className="text-xs">·</span>
                <Button
                  onClick={() => window.open("https://x.com/WinDoorz", "_blank")}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-4 text-sm font-semibold hover:bg-foreground/10 transition-all hover:scale-105"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current mr-2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow us on X
                </Button>
              </div>
            )}

            {currentGame?.status === "finished" && (
              <div className="flex items-center justify-center gap-3 text-muted-foreground animate-fade-in">
                <span className="text-lg font-medium italic">No game is live right now</span>
                <span className="text-xs">·</span>
                <Button
                  onClick={() => window.open("https://x.com/WinDoorz", "_blank")}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-4 text-sm font-semibold hover:bg-foreground/10 transition-all hover:scale-105"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current mr-2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow us on X
                </Button>
              </div>
            )}

            {currentGame?.status === "waiting" && (
              <p className="text-lg text-muted-foreground animate-pulse-slow">Waiting for game to start...</p>
            )}

            {currentGame?.status === "countdown" && countdown !== null && (
              <div className="space-y-3">
                <p className="text-base text-muted-foreground">Game starts in</p>
                <div
                  className="text-7xl font-black tabular-nums"
                  style={{ textShadow: "0 0 40px hsl(0 85% 58% / 0.3)" }}
                >
                  {formatCountdown(countdown)}
                </div>
              </div>
            )}

            {currentGame?.status === "active" && (
              <div className="space-y-1">
                <p className="text-xl font-bold">Game in progress</p>
                <p className="text-base text-muted-foreground">
                  Round {currentGame.current_round} / {currentGame.total_rounds}
                </p>
              </div>
            )}

            {/* Join Form */}
            {currentGame && (currentGame.status === "waiting" || currentGame.status === "countdown") && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter your wallet address"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full h-12 text-base bg-input/80 border-border/50 rounded-sm backdrop-blur-sm"
                  />
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    SUBMIT YOUR VALID WALLET ADDRESS, IF YOU WIN THE FEES ARE SENT THERE, IF THE WALLET IS NOT VALID THE
                    WIN DOESN'T COUNT
                  </p>
                </div>
                <Button
                  onClick={handleJoinGame}
                  className="relative w-full h-12 text-base font-bold rounded-sm overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, hsl(0 85% 58%), hsl(0 100% 70%))",
                    boxShadow: "0 10px 60px -10px hsl(0 85% 58% / 0.5)",
                  }}
                >
                  <span className="relative z-10">JOIN GAME</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
              </div>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {/* How to Play */}
            <div className="relative group p-5 rounded-lg bg-card/50 border border-border/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <h3 className="relative text-base font-bold text-foreground mb-2">How to Play</h3>
              <p className="relative text-muted-foreground text-xs leading-relaxed">
                5 rounds. Each round shows 3 doors. Pick one. Only 1 is correct.
              </p>
            </div>

            {/* Elimination Rule */}
            <div className="relative group p-5 rounded-lg bg-card/50 border border-border/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <h3 className="relative text-base font-bold text-foreground mb-2">Elimination</h3>
              <p className="relative text-muted-foreground text-xs leading-relaxed">
                Wrong door or timeout = <span className="text-primary font-semibold">eliminated</span>. No second
                chances.
              </p>
            </div>

            {/* Win Condition */}
            <div className="relative group p-5 rounded-lg bg-card/50 border border-border/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <h3 className="relative text-base font-bold text-foreground mb-2">Win Condition</h3>
              <p className="relative text-muted-foreground text-xs leading-relaxed">
                First <span className="text-primary font-semibold">3 players</span> to survive all 5 rounds win.
              </p>
            </div>

            {/* Rewards */}
            <div className="relative group p-5 rounded-lg bg-card/50 border border-border/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <h3 className="relative text-base font-bold text-foreground mb-2">Rewards</h3>
              <p className="relative text-muted-foreground text-xs leading-relaxed">
                Winners get <span className="text-primary font-semibold">80%</span> of rewards. 20% goes to growth.
              </p>
            </div>
          </div>

          {/* Prize Rules */}
          <div className="max-w-3xl mx-auto">
            <div className="relative group p-6 rounded-lg bg-card/50 border border-primary/30 backdrop-blur-sm">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 rounded-lg opacity-50 group-hover:opacity-75 blur transition-opacity duration-300" />
              <div className="relative space-y-4">
                <h3 className="text-lg font-bold text-foreground text-center mb-4">Important Prize Rules</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded bg-background/30 border border-border/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground leading-relaxed">
                      <span className="text-foreground font-semibold">If 0 winners:</span> Funds are gonna be used for
                      buybacks
                    </p>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded bg-background/30 border border-border/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground leading-relaxed">
                      <span className="text-foreground font-semibold">If the winner doesn't hold $DOORZ:</span> 50% of
                      the rewards are given
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Address */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group p-5 rounded-lg bg-card/50 border border-border/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/20 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <div className="relative space-y-3">
                <h3 className="text-base font-bold text-foreground text-center">Contract Address</h3>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={CONTRACT_ADDRESS}
                    readOnly
                    className="flex-1 h-10 bg-input/50 text-muted-foreground text-xs font-mono border border-border/50 rounded-sm backdrop-blur-sm"
                  />
                  <Button
                    onClick={handleCopyAddress}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 border-border/50 hover:border-primary hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="relative w-full border-t border-border/30">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="relative inline-block mb-12 w-full text-center">
            <h2 className="text-5xl font-black text-foreground uppercase tracking-tight">Leaderboard</h2>
            <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-2xl -z-10" />
          </div>

          {payouts.length === 0 ? (
            <p className="text-center text-muted-foreground">No payouts yet</p>
          ) : (
            <div className="space-y-6">
              {/* Table Header */}
              <div className="grid grid-cols-3 gap-6 pb-4 border-b border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-t-lg">
                <div className="text-sm font-bold text-foreground uppercase tracking-wide">Winner Wallet</div>
                <div className="text-sm font-bold text-foreground uppercase tracking-wide">Transaction Hash</div>
                <div className="text-sm font-bold text-foreground text-right uppercase tracking-wide">Amount</div>
              </div>

              {/* Table Rows */}
              {payouts.map((payout, idx) => (
                <div
                  key={payout.id}
                  className="grid grid-cols-3 gap-6 py-4 px-4 border-b border-border/20 hover:bg-card/30 transition-colors group"
                >
                  <div className="text-sm text-muted-foreground font-mono truncate group-hover:text-foreground transition-colors">
                    {payout.winner_wallet}
                  </div>
                  <a
                    href={`https://etherscan.io/tx/${payout.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary-glow font-mono truncate flex items-center gap-1 transition-colors"
                  >
                    {payout.transaction_hash.slice(0, 10)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-sm text-muted-foreground text-right font-mono group-hover:text-primary transition-colors font-semibold">
                    {payout.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export default Landing;
