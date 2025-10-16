import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { PublicKey } from "@solana/web3.js";

const CONTRACT_ADDRESS = "FFPMq7uQ4J26hDrjwHQHd9DhfdsUJmS6v3L4dzHTpump";
const Landing = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(false);

  const validateSolanaAddress = (address: string): boolean => {
    if (!address || address.trim() === "") return false;
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

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
    if (!isValidAddress) {
      toast.error("Please enter a valid Solana wallet address");
      return;
    }

    if (!currentGame) {
      toast.error("No active game");
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
  return <>
      {/* Retro Arcade Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-background">
        {/* CRT Screen Effect */}
        <div className="absolute inset-0 scanlines opacity-20" />
        
        {/* Pixel Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(hsl(145 80% 50% / 0.05) 2px, transparent 2px), linear-gradient(90deg, hsl(145 80% 50% / 0.05) 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Neon Glows */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-glow" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/10 rounded-full blur-[120px]" style={{
          animation: "glow 3s ease-in-out infinite"
        }} />
        
        {/* Arcade Frame */}
        <div className="absolute top-4 left-4 right-4 bottom-4 border-4 border-primary/20 rounded-3xl pointer-events-none">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-primary/30 rounded-full blur-sm" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-accent/30 rounded-full blur-sm" />
        </div>
      </div>

      {/* Single Screen Layout */}
      <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-7xl w-full space-y-10">
          {/* Arcade Title */}
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute -inset-8 bg-primary/20 blur-3xl animate-glow rounded-full" />
              <h1 
                className="text-7xl md:text-9xl font-black tracking-wider text-foreground uppercase relative"
                style={{
                  textShadow: `
                    0 0 10px hsl(145 80% 50%),
                    0 0 20px hsl(145 80% 50%),
                    0 0 40px hsl(145 80% 50%),
                    0 0 80px hsl(145 80% 50%),
                    4px 4px 0px hsl(145 80% 50% / 0.5)
                  `,
                  fontFamily: "'Press Start 2P', 'Orbitron', monospace",
                  letterSpacing: '0.1em'
                }}
              >
                BUTTONS
              </h1>
            </div>
            <div className="flex items-center justify-center gap-3 text-primary font-bold text-lg">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <p className="font-mono uppercase tracking-widest">Press Start to Begin</p>
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
            </div>
          </div>

          {/* Arcade Console */}
          <div className="max-w-xl mx-auto">
            <div className="relative p-8 rounded-2xl border-4 border-primary/40 bg-gradient-to-b from-card/60 to-card/80 backdrop-blur-xl" style={{
              boxShadow: `
                0 0 40px hsl(145 80% 50% / 0.3),
                inset 0 0 60px hsl(145 80% 50% / 0.05)
              `
            }}>
              {/* Screen Display */}
              <div className="space-y-6">
                {/* Status Display */}
                {!currentGame && (
                  <div className="text-center space-y-4 py-8">
                    <div className="text-accent text-6xl font-black animate-pulse">404</div>
                    <p className="text-muted-foreground font-mono uppercase tracking-wider">
                      No Game Active
                    </p>
                    <Button 
                      onClick={() => window.open("https://x.com/GuessButtons", "_blank")} 
                      variant="outline" 
                      className="border-2 border-primary/40 hover:border-primary hover:bg-primary/20 font-mono uppercase tracking-wider"
                    >
                      Follow @GuessButtons
                    </Button>
                  </div>
                )}

                {currentGame?.status === "finished" && (
                  <div className="text-center space-y-4 py-8">
                    <div className="text-primary text-5xl font-black">GAME OVER</div>
                    <p className="text-muted-foreground font-mono">Insert coin for next game</p>
                    <Button 
                      onClick={() => window.open("https://x.com/GuessButtons", "_blank")} 
                      variant="outline"
                      className="border-2 border-primary/40 hover:border-primary hover:bg-primary/20 font-mono uppercase"
                    >
                      Follow @GuessButtons
                    </Button>
                  </div>
                )}

                {currentGame?.status === "waiting" && (
                  <div className="text-center py-8">
                    <div className="text-primary text-4xl font-black mb-4 animate-pulse">
                      LOADING...
                    </div>
                    <div className="flex justify-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {currentGame?.status === "countdown" && countdown !== null && (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground font-mono uppercase tracking-wider text-sm">
                      Starting In
                    </p>
                    <div 
                      className="text-8xl font-black tabular-nums text-primary"
                      style={{
                        textShadow: `
                          0 0 20px hsl(145 80% 50%),
                          0 0 40px hsl(145 80% 50%)
                        `
                      }}
                    >
                      {formatCountdown(countdown)}
                    </div>
                  </div>
                )}

                {currentGame?.status === "active" && (
                  <div className="text-center py-8 space-y-3">
                    <div className="text-accent text-5xl font-black animate-pulse">
                      LIVE
                    </div>
                    <p className="text-foreground font-mono text-xl">
                      Round {currentGame.current_round} / {currentGame.total_rounds}
                    </p>
                  </div>
                )}

                {/* Join Controls */}
                {currentGame && (currentGame.status === "waiting" || currentGame.status === "countdown") && (
                  <div className="space-y-4 border-t-2 border-primary/20 pt-6">
                    <div className="space-y-3">
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Enter Wallet Address
                      </label>
                      <Input
                        type="text"
                        placeholder="Your Solana wallet address"
                        value={walletAddress}
                        onChange={(e) => {
                          const value = e.target.value;
                          setWalletAddress(value);
                          setIsValidAddress(validateSolanaAddress(value));
                        }}
                        className={`h-12 bg-input/80 border-2 ${
                          walletAddress && !isValidAddress
                            ? "border-red-500/50 focus:border-red-500"
                            : "border-border/50 focus:border-primary"
                        } font-mono text-sm`}
                      />
                      {walletAddress && !isValidAddress && (
                        <p className="text-xs text-red-500 font-mono">Invalid Solana wallet address</p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleJoinGame}
                      disabled={!isValidAddress}
                      className="w-full h-14 text-lg font-black rounded-xl border-4 border-primary/50 uppercase tracking-wider relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, hsl(145 80% 50%), hsl(145 100% 60%))",
                        boxShadow: "0 0 40px hsl(145 80% 50% / 0.5)",
                        color: "hsl(0 0% 0%)"
                      }}
                    >
                      <span className="relative z-10">INSERT COIN</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pixel Info Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[
              { icon: "►", title: "HOW TO PLAY", text: "5 rounds × 3 buttons. Pick right. Survive.", color: "primary" },
              { icon: "✕", title: "ELIMINATION", text: "Wrong choice or timeout = GAME OVER", color: "accent" },
              { icon: "★", title: "VICTORY", text: "First 3 survivors split the prize", color: "primary" },
              { icon: "$", title: "REWARDS", text: "80% to winners • 20% to treasury", color: "primary" }
            ].map((card, i) => (
              <div 
                key={i}
                className="relative p-5 rounded-lg border-4 bg-card/60 backdrop-blur-sm hover:scale-105 transition-transform"
                style={{
                  borderColor: card.color === "accent" ? "hsl(0 85% 58% / 0.4)" : "hsl(145 80% 50% / 0.4)",
                  boxShadow: `0 0 20px ${card.color === "accent" ? "hsl(0 85% 58% / 0.2)" : "hsl(145 80% 50% / 0.2)"}`
                }}
              >
                <div 
                  className="text-4xl font-black mb-2"
                  style={{ color: card.color === "accent" ? "hsl(0 85% 58%)" : "hsl(145 80% 50%)" }}
                >
                  {card.icon}
                </div>
                <h3 
                  className="text-sm font-black mb-2 uppercase tracking-wider font-mono"
                  style={{ color: card.color === "accent" ? "hsl(0 85% 58%)" : "hsl(145 80% 50%)" }}
                >
                  {card.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                  {card.text}
                </p>
              </div>
            ))}
          </div>

          {/* Special Rules */}
          <div className="max-w-2xl mx-auto">
            <div className="p-6 rounded-xl border-4 border-primary/30 bg-card/60 backdrop-blur-sm" style={{
              boxShadow: "0 0 30px hsl(145 80% 50% / 0.2)"
            }}>
              <h3 className="text-2xl font-black text-primary text-center mb-6 uppercase font-mono">
                ⚠ SPECIAL RULES ⚠
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3 p-4 rounded-lg bg-background/50 border-2 border-primary/20">
                  <span className="text-primary text-xl">●</span>
                  <p className="text-sm text-muted-foreground font-mono">
                    <span className="text-foreground font-bold">NO WINNERS:</span> Treasury buyback initiated
                  </p>
                </div>
                <div className="flex gap-3 p-4 rounded-lg bg-background/50 border-2 border-accent/20">
                  <span className="text-accent text-xl">●</span>
                  <p className="text-sm text-muted-foreground font-mono">
                    <span className="text-foreground font-bold">NON-HOLDER WINS:</span> 50% reward penalty applied
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Token Contract */}
          <div className="max-w-2xl mx-auto">
            <div className="p-5 rounded-xl border-4 border-primary/30 bg-card/60 backdrop-blur-sm" style={{
              boxShadow: "0 0 30px hsl(145 80% 50% / 0.2)"
            }}>
              <h3 className="text-base font-black text-primary text-center mb-4 uppercase font-mono tracking-wider">
                $BUTTONS TOKEN
              </h3>
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  value={CONTRACT_ADDRESS} 
                  readOnly 
                  className="flex-1 h-11 bg-input/80 text-foreground text-xs font-mono border-2 border-primary/30 focus:border-primary"
                />
                <Button 
                  onClick={handleCopyAddress}
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 border-2 border-primary/40 hover:border-primary hover:bg-primary/20 hover:scale-110 transition-all"
                >
                  <Copy className="h-4 w-4 text-primary" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hall of Fame */}
      <div className="relative w-full border-t-4 border-primary/30 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 
              className="text-5xl font-black text-primary uppercase tracking-wider font-mono inline-block"
              style={{
                textShadow: `
                  0 0 20px hsl(145 80% 50%),
                  0 0 40px hsl(145 80% 50%)
                `
              }}
            >
              ★ HALL OF FAME ★
            </h2>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-muted-foreground font-mono uppercase tracking-wider">
                No winners yet. Be the first!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-3 gap-4 p-4 border-4 border-primary/40 bg-primary/10 rounded-lg">
                <div className="text-sm font-black text-primary uppercase tracking-wider font-mono">WINNER</div>
                <div className="text-sm font-black text-primary uppercase tracking-wider font-mono">TX HASH</div>
                <div className="text-sm font-black text-primary text-right uppercase tracking-wider font-mono">PRIZE</div>
              </div>

              {/* Entries */}
              {payouts.map((payout) => (
                <div 
                  key={payout.id} 
                  className="grid grid-cols-3 gap-4 p-4 border-2 border-border/40 bg-card/40 hover:border-primary/40 hover:bg-card/60 transition-all rounded-lg group"
                >
                  <div className="text-xs text-muted-foreground font-mono truncate group-hover:text-primary transition-colors">
                    {payout.winner_wallet}
                  </div>
                  <a 
                    href={`https://etherscan.io/tx/${payout.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:text-primary-glow font-mono truncate flex items-center gap-2 font-bold"
                  >
                    {payout.transaction_hash.slice(0, 12)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-xs text-foreground text-right font-mono font-black group-hover:text-primary transition-colors">
                    {payout.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>;
};
export default Landing;