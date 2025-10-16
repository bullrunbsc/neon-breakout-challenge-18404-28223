import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

type GameState = "waiting" | "countdown" | "in_round" | "break" | "eliminated" | "winner";

const Game = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameId = searchParams.get("gameId");
  const wallet = searchParams.get("wallet");

  const [gameState, setGameState] = useState<GameState>("waiting");
  const [game, setGame] = useState<any>(null);
  const [player, setPlayer] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedButton, setSelectedButton] = useState<number | null>(null);
  const [winners, setWinners] = useState<any[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<"correct" | "wrong" | null>(null);
  const [breakTimeLeft, setBreakTimeLeft] = useState<number>(30);
  const [breakEndTime, setBreakEndTime] = useState<Date | null>(null);
  const [countdownTime, setCountdownTime] = useState<number>(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [activePlayers, setActivePlayers] = useState(0);
  const [pulse, setPulse] = useState(false);
  
  // Use ref to track submission status for realtime subscriptions
  const hasSubmittedRef = useRef(false);
  
  // Sync ref with state
  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchPlayerCounts = async () => {
    if (!gameId) return;
    
    // Get total players count using public view
    const { count: total } = await supabase
      .from("players_public")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId);
    
    // Get active players count using public view
    const { count: active } = await supabase
      .from("players_public")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("status", "active");
    
    setTotalPlayers(total || 0);
    setActivePlayers(active || 0);
    
    // Trigger pulse animation
    setPulse(true);
    setTimeout(() => setPulse(false), 500);
  };

  useEffect(() => {
    if (!gameId || !wallet) {
      navigate("/");
      return;
    }

    fetchGameData();
    subscribeToChanges();

    // Refresh game data when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Tab became visible, refreshing game data");
        fetchGameData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Only auto-refresh when not submitted and not a winner
    let refreshInterval: NodeJS.Timeout | null = null;
    let progressionInterval: NodeJS.Timeout | null = null;
    
    if (!hasSubmitted && gameState !== "winner") {
      refreshInterval = setInterval(() => {
        if (gameState !== "in_round") {
          fetchGameData();
        }
      }, 3000);
      
      // Trigger game progression check every 3 seconds
      progressionInterval = setInterval(async () => {
        try {
          await supabase.functions.invoke('game-progression');
        } catch (error) {
          console.error("Error triggering game progression:", error);
        }
      }, 3000);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (refreshInterval) clearInterval(refreshInterval);
      if (progressionInterval) clearInterval(progressionInterval);
    };
  }, [gameId, wallet, hasSubmitted, gameState]);

  // Auto-redirect eliminated players to home after 3 seconds
  useEffect(() => {
    if (gameState === "eliminated" && player?.status === "eliminated") {
      console.log("Player eliminated, redirecting to home in 3 seconds...");
      const timer = setTimeout(() => {
        navigate("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, player?.status, navigate]);

  // Periodic game progression check via edge function
  useEffect(() => {
    if (!gameId) return;

    const checkProgression = async () => {
      try {
        await supabase.functions.invoke('game-progression');
      } catch (error) {
        console.error('Error checking game progression:', error);
      }
    };

    // Check immediately
    checkProgression();

    // Then check every 3 seconds
    const interval = setInterval(checkProgression, 3000);

    return () => clearInterval(interval);
  }, [gameId]);

  const fetchGameData = async () => {
    // Don't fetch if player is already a winner or eliminated - prevents glitching
    if (gameState === "winner" || player?.status === "winner" || gameState === "eliminated" || player?.status === "eliminated") {
      console.log("Player is winner/eliminated, skipping fetch to prevent glitching");
      return;
    }
    
    // Fetch player counts
    await fetchPlayerCounts();
    
    // Fetch game
    const { data: gameData } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameData) {
      setGame(gameData);
      
      // Handle different game statuses
      if (gameData.status === "finished") {
        // Fetch all winners
        const { data: allWinners } = await supabase
          .from("players")
          .select("*")
          .eq("game_id", gameId)
          .eq("status", "winner")
          .order("winner_rank", { ascending: true });
        
        if (allWinners && allWinners.length > 0) {
          setWinners(allWinners);
          setGameState("winner");
        } else {
          setGameState("eliminated");
        }
      } else if (gameData.status === "countdown") {
        setGameState("countdown");
      } else if (gameData.status === "break") {
        setGameState("break");
        if (gameData.break_ends_at) {
          setBreakEndTime(new Date(gameData.break_ends_at));
          const breakEnd = new Date(gameData.break_ends_at).getTime();
          const now = new Date().getTime();
          const timeLeft = Math.max(0, Math.floor((breakEnd - now) / 1000));
          setBreakTimeLeft(timeLeft);
        }
      }
    }

    // Fetch player
    const { data: playerData } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .eq("wallet_address", wallet)
      .single();

    if (playerData) {
      setPlayer(playerData);
      
      if (playerData.status === "eliminated") {
        setGameState("eliminated");
      } else if (playerData.status === "winner") {
        setGameState("winner");
        // Fetch all winners
        const { data: allWinners } = await supabase
          .from("players")
          .select("*")
          .eq("game_id", gameId)
          .eq("status", "winner")
          .order("winner_rank", { ascending: true });
        setWinners(allWinners || []);
      }
    }

    // Fetch current round if game is active
    if (gameData?.status === "active" && gameData.current_round > 0) {
      console.log("Fetching round for game:", gameId, "round:", gameData.current_round);
      
      const { data: roundData, error: roundError } = await supabase
        .rpc("get_round_safe", {
          p_game_id: gameId,
          p_round_number: gameData.current_round,
        });

      console.log("Round data received:", roundData, "Error:", roundError);

      if (roundError) {
        console.error("Error fetching round:", roundError);
      }

      if (roundData && Array.isArray(roundData) && roundData.length > 0) {
        const round = roundData[0];
        console.log("Setting current round:", round);
        
        // Check if already submitted for this specific round
        const { data: existingAnswer } = await supabase
          .from("answers")
          .select("*")
          .eq("round_id", round.id)
          .eq("player_id", playerData?.id)
          .maybeSingle();
        
        // Only update state if this is a new round or we need to refresh
        setCurrentRound(round);
        setGameState("in_round");
        
        // Reset submission state for new round, or restore if already submitted
        if (existingAnswer) {
          console.log("Found existing answer for round", round.round_number);
          setHasSubmitted(true);
          setSubmissionResult(existingAnswer.is_correct ? "correct" : "wrong");
        } else {
          console.log("No existing answer for round", round.round_number, "- enabling submission");
          setHasSubmitted(false);
          setSubmissionResult(null);
          setSelectedButton(null);
        }
      }
    }
  };

  const subscribeToChanges = () => {
    const gamesChannel = supabase
      .channel("games-player")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          // Skip all updates if player is a winner
          if (player?.status === "winner") {
            console.log("Skipping game update - player is winner");
            return;
          }
          
          // Skip all updates if player has submitted
          if (hasSubmittedRef.current) {
            console.log("Skipping game update - player already submitted");
            return;
          }
          
          const newGame = payload.new as any;
          setGame(newGame);
          
          // Handle game finished status
          if (newGame?.status === "finished") {
            console.log("Game finished, fetching final winners");
            
            // Fetch all winners
            const { data: allWinners } = await supabase
              .from("players")
              .select("*")
              .eq("game_id", gameId)
              .eq("status", "winner")
              .order("winner_rank", { ascending: true });
            
            if (allWinners && allWinners.length > 0) {
              setWinners(allWinners);
              setGameState("winner");
            } else {
              // No winners, show eliminated screen
              setGameState("eliminated");
            }
            return;
          }
          
          // If game goes to break status
          if (newGame?.status === "break") {
            setGameState("break");
            // Use the break_ends_at timestamp from the game
            if (newGame.break_ends_at) {
              setBreakEndTime(new Date(newGame.break_ends_at));
              const breakEnd = new Date(newGame.break_ends_at).getTime();
              const now = new Date().getTime();
              const timeLeft = Math.max(0, Math.floor((breakEnd - now) / 1000));
              setBreakTimeLeft(timeLeft);
            }
          }
          
          // If game becomes active, fetch the full game data
          if (newGame?.status === "active") {
            console.log("Game became active, fetching full data...");
            
            // Check player status from database to avoid race conditions
            const { data: currentPlayer } = await supabase
              .from("players")
              .select("status")
              .eq("game_id", gameId)
              .eq("wallet_address", wallet)
              .single();
            
            // Don't show new rounds to eliminated or winner players
            if (currentPlayer?.status === "eliminated" || currentPlayer?.status === "winner") {
              console.log("Player is eliminated/winner, not showing new round");
              return;
            }
            
            // Don't refresh if player already submitted (prevents glitching)
            if (hasSubmittedRef.current) {
              console.log("Player already submitted, skipping refresh to prevent glitching");
              return;
            }
            
            // Force a full refresh to get the round
            await fetchGameData();
          }
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel("players-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          const updatedPlayer = payload.new as any;
          
          // If current player was updated
          if (updatedPlayer.wallet_address === wallet) {
            setPlayer(updatedPlayer);
            
            // Handle elimination of current player
            if (updatedPlayer.status === "eliminated") {
              console.log("Current player eliminated");
              setGameState("eliminated");
            }
            
            // Handle current player becoming a winner
            if (updatedPlayer.status === "winner") {
              console.log("Current player is a winner!");
              // Fetch all winners to display on winners page
              const { data: allWinners } = await supabase
                .from("players")
                .select("*")
                .eq("game_id", gameId)
                .eq("status", "winner")
                .order("winner_rank", { ascending: true });
              
              setWinners(allWinners || []);
              setGameState("winner");
            }
          }
          
          // If ANY player becomes a winner, fetch the updated winner list
          // This ensures all clients see the latest winners
          if (updatedPlayer.status === "winner") {
            console.log("A player became a winner, refreshing winner list");
            const { data: allWinners } = await supabase
              .from("players")
              .select("*")
              .eq("game_id", gameId)
              .eq("status", "winner")
              .order("winner_rank", { ascending: true });
            
            setWinners(allWinners || []);
            
            // If current player is already a winner, make sure we stay on winner screen
            if (player?.status === "winner") {
              setGameState("winner");
            }
          }
        }
      )
      .subscribe();

    const roundsChannel = supabase
      .channel("rounds-current")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rounds",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          // Don't process round updates if player is a winner
          if (player?.status === "winner") {
            console.log("Skipping round update - player is winner");
            return;
          }
          
          if (payload.new.round_number === game?.current_round) {
            setCurrentRound(payload.new);
            setGameState("in_round");
            setHasSubmitted(false);
            setSubmissionResult(null);
            setSelectedButton(null);
          }
        }
      )
      .subscribe();

    const playerCountChannel = supabase
      .channel("player-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchPlayerCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(roundsChannel);
      supabase.removeChannel(playerCountChannel);
    };
  };

  useEffect(() => {
    if (!currentRound) return;

    const interval = setInterval(() => {
      // Don't fetch if player is already a winner to prevent glitching
      if (gameState === "winner") {
        return;
      }
      
      const now = Date.now();
      const start = new Date(currentRound.starts_at).getTime();
      const end = new Date(currentRound.ends_at).getTime();
      
      // If we're before the round starts, show countdown to start
      if (now < start) {
        const diff = Math.max(0, Math.ceil((start - now) / 1000));
        setTimeLeft(diff);
      } else {
        // Round has started, show countdown to end
        const diff = Math.max(0, Math.ceil((end - now) / 1000));
        setTimeLeft(diff);
        
        // When time reaches 0, fetch fresh game data to transition smoothly
        if (diff === 0) {
          console.log("Round timer reached 0, fetching game update...");
          fetchGameData();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound, gameState]);

  useEffect(() => {
    if (gameState !== "break" || !breakEndTime) return;

    // Update countdown every 1 second based on the exact break end time from database
    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.ceil((breakEndTime.getTime() - now) / 1000));
      setBreakTimeLeft(timeLeft);
      
      // When break ends, fetch fresh game data to transition smoothly
      if (timeLeft === 0) {
        console.log("Break timer reached 0, fetching game update...");
        fetchGameData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, breakEndTime]);

  // Timer for countdown
  useEffect(() => {
    if (!game || game.status !== "countdown" || !game.started_at) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const start = new Date(game.started_at).getTime();
      const diff = Math.max(0, Math.floor((start - now) / 1000));
      setCountdownTime(diff);
      
      // Poll for game status change when countdown is at 0
      if (diff === 0) {
        console.log("Countdown reached 0, polling for game update...");
        fetchGameData();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game]);

  const handleSubmitAnswer = async () => {
    console.log("Submit clicked. Selected button:", selectedButton, "Current round:", currentRound, "Player:", player);
    
    if (!selectedButton) {
      toast.error("Please select a button");
      return;
    }

    if (!currentRound || !player) {
      console.log("Missing data - currentRound:", currentRound, "player:", player);
      return;
    }
    
    if (hasSubmitted) {
      toast.error("You already submitted an answer for this round");
      return;
    }

    // Call secure server-side function to validate answer
    // This prevents cheating by never exposing the correct answer to the client
    const { data: validationResult, error: validationError } = await supabase
      .rpc("validate_answer", {
        p_round_id: currentRound.id,
        p_player_id: player.id,
        p_selected_door: selectedButton,
      });

    if (validationError) {
      toast.error("Failed to validate answer");
      console.error(validationError);
      return;
    }

    const result = validationResult?.[0];
    
    if (result?.already_submitted) {
      toast.error("You already submitted an answer for this round");
      return;
    }

    const isCorrect = result?.is_correct || false;

    if (isCorrect) {
      // For correct answers, insert with is_correct = true
      const { error } = await supabase
        .from("answers")
        .insert({
          round_id: currentRound.id,
          player_id: player.id,
          selected_door: selectedButton,
          is_correct: true,
        });

      if (error) {
        toast.error("Failed to submit answer");
        console.error(error);
        return;
      }

      // Special logic for final round (round 5): Mark top 3 as winners
      if (currentRound.round_number === 5) {
        // Check how many winners already exist
        const { data: existingWinners } = await supabase
          .from("players")
          .select("*")
          .eq("game_id", game.id)
          .eq("status", "winner")
          .order("winner_rank", { ascending: true });

        const winnerCount = existingWinners?.length || 0;

        if (winnerCount < 3) {
          // Assign next rank (1, 2, or 3)
          const nextRank = winnerCount + 1;
          
          await supabase
            .from("players")
            .update({
              status: "winner",
              winner_rank: nextRank,
            })
            .eq("id", player.id);

          setHasSubmitted(true);
          setSubmissionResult("correct");
          setGameState("winner");
          toast.success(`🏆 You are winner #${nextRank}!`);

          // If this is the 3rd winner, eliminate all other active players and end game
          if (nextRank === 3) {
            const { data: activePlayers } = await supabase
              .from("players")
              .select("*")
              .eq("game_id", game.id)
              .eq("status", "active");

            if (activePlayers && activePlayers.length > 0) {
              for (const activePlayer of activePlayers) {
                await supabase
                  .from("players")
                  .update({
                    status: "eliminated",
                    eliminated_at: new Date().toISOString(),
                  })
                  .eq("id", activePlayer.id);
              }
            }

            // End the game
            await supabase
              .from("games")
              .update({
                status: "finished",
                ended_at: new Date().toISOString(),
              })
              .eq("id", game.id);
          }
        } else {
          // 3 winners already exist, eliminate this player
          await supabase
            .from("players")
            .update({
              status: "eliminated",
              eliminated_at: new Date().toISOString(),
            })
            .eq("id", player.id);

          setHasSubmitted(true);
          setSubmissionResult("correct");
          setGameState("eliminated");
          toast.info("3 winners already found. You've been eliminated.");
        }
      } else {
        // Rounds 1-4: Just mark as correct
        setHasSubmitted(true);
        setSubmissionResult("correct");
        toast.success("✓ Correct! Waiting for round to end...");
      }
    } else {
      // For wrong answers, immediately eliminate the player
      const { error: answerError } = await supabase
        .from("answers")
        .insert({
          round_id: currentRound.id,
          player_id: player.id,
          selected_door: selectedButton,
          is_correct: false,
        });

      if (answerError) {
        toast.error("Failed to submit answer");
        console.error(answerError);
        return;
      }

      // Immediately eliminate player
      const { error: playerError } = await supabase
        .from("players")
        .update({
          status: "eliminated",
          eliminated_at: new Date().toISOString(),
        })
        .eq("id", player.id);

      if (playerError) {
        console.error("Failed to update player status:", playerError);
      }

      setHasSubmitted(true);
      setSubmissionResult("wrong");
      setGameState("eliminated");
      toast.error("✗ Wrong answer! You've been eliminated.");
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  };

  if (gameState === "eliminated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/20 via-background to-background relative overflow-hidden">
        {/* Arcade Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 scanlines opacity-20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[150px] animate-pulse" />
        </div>
        
        <div className="text-center space-y-8 relative z-10 px-4">
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-wider" style={{
            color: "hsl(0 85% 58%)",
            textShadow: `
              0 0 20px hsl(0 85% 58%),
              0 0 40px hsl(0 85% 58%),
              0 0 80px hsl(0 85% 58%),
              4px 4px 0px hsl(0 85% 58% / 0.5)
            `,
            fontFamily: "'Press Start 2P', 'Orbitron', monospace"
          }}>
            GAME OVER
          </h1>
          
          <div className="space-y-4">
            <p className="text-3xl font-bold text-foreground font-mono uppercase tracking-wider">
              You Have Been Eliminated
            </p>
            
            <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <p className="text-lg animate-pulse">
                Redirecting to home...
              </p>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "winner") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-blue-950 to-black relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent animate-pulse" />
        
        <div className="text-center space-y-8 relative z-10 px-4 max-w-4xl mx-auto">
          {/* Large glowing trophy with pulse animation */}
          <div className="relative inline-block">
            <div className="absolute inset-0 blur-3xl bg-yellow-500/30 animate-pulse" />
            <div className="text-9xl animate-pulse relative drop-shadow-[0_0_40px_rgba(250,204,21,0.6)]">
              🏆
            </div>
          </div>
          
          {/* Winner text with neon glow */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-pulse">
                Final Winners
              </span>
            </h1>
            <p className="text-xl md:text-2xl font-medium bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 bg-clip-text text-transparent">
              Congratulations! You cracked the final code.
            </p>
          </div>

          {/* Winners List */}
          <div className="space-y-4 mt-8">
            {winners.map((winner, index) => (
              <div 
                key={winner.id}
                className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-2xl font-bold text-yellow-400">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} {index + 1}{index === 0 ? "st" : index === 1 ? "nd" : "rd"}
                  </span>
                  <span className="text-lg md:text-xl font-mono text-white/90 break-all flex-1 text-left">
                    {winner.wallet_address}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Back to Home button with neon styling */}
          <div className="pt-8">
            <Button
              onClick={() => navigate("/")}
              size="lg"
              className="w-full max-w-md h-16 text-xl font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:via-blue-400 hover:to-cyan-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:shadow-[0_0_50px_rgba(34,211,238,0.8)] transition-all duration-300 border-0"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      {/* Live Player Counter */}
      <div className="fixed top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
        <span className={pulse ? "animate-pulse font-bold" : ""}>
          Players: {activePlayers} / {totalPlayers}
        </span>
      </div>
      
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black neon-glow">GUESS</h1>
          <p className="text-muted-foreground">Player: {wallet}</p>
        </div>

        {/* Game Status */}
        {game?.status === "waiting" && (
          <div className="relative neon-border rounded-2xl p-12 bg-card text-center space-y-6 overflow-hidden">
            {/* Arcade Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 scanlines opacity-20" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="text-5xl font-black text-primary animate-pulse uppercase tracking-wider" style={{
                fontFamily: "'Press Start 2P', 'Orbitron', monospace",
                textShadow: "0 0 20px hsl(145 80% 50%), 0 0 40px hsl(145 80% 50%)"
              }}>
                LOADING
              </div>
              
              <div className="flex justify-center gap-3">
                <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              
              <p className="text-lg text-muted-foreground font-mono uppercase tracking-wider">
                Admin will start game soon
              </p>
              
              <Button
                onClick={fetchGameData}
                variant="outline"
                className="border-2 border-primary/40 hover:border-primary hover:bg-primary/20 font-mono uppercase tracking-wider"
              >
                ► Refresh Status
              </Button>
            </div>
          </div>
        )}

        {game?.status === "countdown" && (
          <div className="relative neon-border rounded-2xl p-12 bg-card text-center space-y-6 overflow-hidden">
            {/* Arcade Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 scanlines opacity-20" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <p className="text-2xl text-muted-foreground font-mono uppercase tracking-wider">Game Starts In</p>
              <p className="text-9xl font-black tabular-nums" style={{
                color: "hsl(145 80% 50%)",
                textShadow: `
                  0 0 20px hsl(145 80% 50%),
                  0 0 40px hsl(145 80% 50%),
                  0 0 80px hsl(145 80% 50%)
                `
              }}>
                {formatCountdown(countdownTime)}
              </p>
              <p className="text-4xl text-primary animate-pulse font-black uppercase tracking-wider" style={{
                fontFamily: "'Press Start 2P', 'Orbitron', monospace"
              }}>
                GET READY
              </p>
            </div>
          </div>
        )}

        {game?.status === "break" && (
          <div className="relative neon-border rounded-2xl p-12 bg-card text-center space-y-6 overflow-hidden">
            {/* Arcade Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 scanlines opacity-20" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-pulse" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="text-4xl font-black uppercase tracking-wider" style={{
                color: "hsl(145 80% 50%)",
                textShadow: "0 0 20px hsl(145 80% 50%)"
              }}>
                ✓ Round {game.current_round} Complete!
              </div>
              
              <div className="text-9xl font-black tabular-nums animate-pulse" style={{
                color: "hsl(145 80% 50%)",
                textShadow: `
                  0 0 30px hsl(145 80% 50%),
                  0 0 60px hsl(145 80% 50%)
                `
              }}>
                {breakTimeLeft}
              </div>
              
              <p className="text-3xl text-primary font-bold uppercase tracking-wider" style={{
                fontFamily: "'Press Start 2P', 'Orbitron', monospace"
              }}>
                Next Round Soon
              </p>
            </div>
          </div>
        )}

        {game?.status === "active" && currentRound && gameState === "in_round" && (
          <div className="space-y-8">
            {/* Big Round Number */}
            <div className="text-center">
              <div className="text-9xl font-black neon-glow leading-none">
                {game.current_round}
              </div>
              <div className="text-2xl text-muted-foreground mt-4">
                Round {game.current_round} of {game.total_rounds}
              </div>
            </div>

            {/* Timer */}
            <div className="neon-border rounded-2xl p-6 bg-card">
              <div className="text-center space-y-4">
                {Date.now() < new Date(currentRound.starts_at).getTime() ? (
                  <>
                    <div className="text-6xl font-black neon-glow">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </div>
                    <div className="text-xl text-primary animate-pulse">GET READY</div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl font-black neon-glow">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(() => {
                            const totalMs = new Date(currentRound.ends_at).getTime() - new Date(currentRound.starts_at).getTime();
                            const leftMs = Math.max(0, new Date(currentRound.ends_at).getTime() - Date.now());
                            return (leftMs / totalMs) * 100;
                          })()}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Button Selection */}
            <div className="neon-border rounded-2xl p-8 bg-card space-y-6">
              {!hasSubmitted ? (
                <>
                  {Date.now() < new Date(currentRound.starts_at).getTime() ? (
                    <div className="text-center space-y-4">
                      <div className="text-3xl font-bold text-primary animate-pulse">
                        Round starting soon...
                      </div>
                      <p className="text-lg text-muted-foreground">
                        Pick wisely. One button leads forward.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <div className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
                          Choose Your Button
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        {[1, 2, 3].map((button) => (
                          <button
                            key={button}
                            type="button"
                            onClick={() => {
                              console.log("Button clicked:", button);
                              setSelectedButton(button);
                              toast.info(`Button ${button} selected`);
                            }}
                            className={`relative aspect-square rounded-full border-4 transition-all duration-300 cursor-pointer ${
                              selectedButton === button
                                ? "border-primary bg-primary/20 scale-110 shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse"
                                : "border-border hover:border-primary/50 hover:scale-105 bg-card/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                            }`}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-6xl font-black neon-glow">{button}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedButton || hasSubmitted}
                        className="w-full h-16 text-2xl font-bold bg-primary hover:bg-primary/90 neon-border disabled:opacity-50 disabled:cursor-not-allowed"
                        size="lg"
                      >
                        CONFIRM BUTTON {selectedButton || '?'}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* Show all 3 buttons with results */}
                  <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map((button) => {
                      const isSelected = selectedButton === button;
                      const isCorrect = submissionResult === "correct" && isSelected;
                      const isWrong = !isCorrect;
                      
                      return (
                        <div
                          key={button}
                          className={`relative aspect-square rounded-full border-4 transition-all duration-500 ${
                            isCorrect
                              ? "border-green-500 bg-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.8)] scale-110"
                              : isWrong
                              ? "border-red-500 bg-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.8)]"
                              : "border-border bg-card/50"
                          }`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`text-6xl font-black ${
                              isCorrect ? "text-green-400" : isWrong ? "text-red-400" : "text-muted"
                            }`}>
                              {button}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 text-3xl">
                              {isCorrect ? "✓" : "✗"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="text-center space-y-4">
                    {submissionResult === "correct" ? (
                      <>
                        <div className="text-6xl font-black text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
                          ✓ CORRECT
                        </div>
                        <p className="text-xl text-muted-foreground">
                          Waiting for round to end...
                        </p>
                        {timeLeft === 0 && (
                          <p className="text-lg text-primary animate-pulse">
                            Admin will start next round soon
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-6xl font-black text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
                          ✗ ELIMINATED
                        </div>
                        <p className="text-xl text-muted-foreground">
                          You will be eliminated when the round ends
                        </p>
                    </>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
