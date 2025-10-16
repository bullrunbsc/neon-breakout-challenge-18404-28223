import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignupMode, setIsSignupMode] = useState(false);

  // Game state
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [correctDoors, setCorrectDoors] = useState<number[]>([1, 1, 1, 1, 1]); // Which door is correct for each round (1, 2, or 3)
  const [countdownMinutes, setCountdownMinutes] = useState<number>(1); // Initial countdown before game starts

  // Check authentication and admin status on mount
  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        verifyAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await verifyAdminStatus(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const verifyAdminStatus = async (userId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase.rpc("is_admin", { check_user_id: userId });
      if (error) {
        throw error;
      }
      setIsAdmin(data === true);
      if (data !== true) {
        toast.error("Access denied: You are not an admin");
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error checking admin status:", error);

      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        console.log(`Retrying admin verification in ${delay}ms... (attempt ${retryCount + 1}/2)`);
        setTimeout(() => verifyAdminStatus(userId, retryCount + 1), delay);
      } else {
        toast.error("Connection timeout - please refresh the page");
        setIsAdmin(false);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    fetchGameData();
    subscribeToChanges();
  }, [isAdmin]); // Removed correctDoors dependency and checkForExpiredRounds - now handled by backend

  const checkForExpiredRounds = async () => {
    // Get the current game (any status) - fetch fresh data, don't rely on state
    const { data: gameData } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!gameData) {
      console.log("No game found");
      return;
    }

    console.log("Checking game status:", gameData.status, "Round:", gameData.current_round);

    const now = new Date();

    // Handle "countdown" status - check if countdown has expired
    if (gameData.status === "countdown") {
      if (gameData.started_at) {
        const countdownEndTime = new Date(gameData.started_at);

        console.log("In countdown. Countdown ends at:", countdownEndTime, "Now:", now);

        if (now > countdownEndTime) {
          console.log("Countdown ended, starting round 1");

          // Check if round 1 already exists (recovery from failed state)
          const { data: existingRound } = await supabase.rpc("admin_get_round", {
            p_game_id: gameData.id,
            p_round_number: 1,
          });

          if (existingRound && existingRound.length > 0) {
            console.log("Round 1 already exists, just updating game status to active");
            await supabase
              .from("games")
              .update({
                status: "active",
                current_round: 1,
              })
              .eq("id", gameData.id);
            toast.success("Round 1 started!");
            return;
          }

          const correctDoor = correctDoors[0];

          await startNextRoundDirect(gameData, 1, correctDoor);
        }
      }
      return;
    }

    // Handle "break" status - check if break time has ended
    if (gameData.status === "break") {
      if (gameData.break_ends_at) {
        const breakEndTime = new Date(gameData.break_ends_at);

        console.log("In break. Break ends at:", breakEndTime, "Now:", now);

        if (now > breakEndTime) {
          console.log("Break period ended, starting next round");

          const nextRound = gameData.current_round + 1;
          if (nextRound > 5) {
            console.log("Game should be finished after 5 rounds");
            return;
          }

          const correctDoor = correctDoors[nextRound - 1];

          await startNextRoundDirect(gameData, nextRound, correctDoor);
        }
      }
      return;
    }

    // Handle "active" status - check if round has expired
    if (gameData.status === "active" && gameData.current_round > 0) {
      const { data: currentRoundData } = await supabase.rpc("admin_get_round", {
        p_game_id: gameData.id,
        p_round_number: gameData.current_round,
      });

      if (!currentRoundData || currentRoundData.length === 0) {
        console.log("No round data found");
        return;
      }

      const endTime = new Date(currentRoundData[0].ends_at);

      console.log(
        "Round ends at:",
        endTime,
        "Now:",
        now,
        "Diff:",
        (endTime.getTime() - now.getTime()) / 1000,
        "seconds",
      );

      if (now > endTime) {
        console.log("Processing expired round:", currentRoundData[0].round_number);
        await checkAnswersAndEliminate(currentRoundData[0].id, currentRoundData[0].round_number, gameData);
      }
    }
  };

  const fetchGameData = async () => {
    const { data: gameData } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (gameData) {
      setCurrentGame(gameData);

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", gameData.id)
        .order("joined_at", { ascending: true });

      setPlayers(playersData || []);
    }
  };

  const subscribeToChanges = () => {
    // debounce so we don't spam refreshes
    const debounce = (fn: Function, delay: number) => {
      let timer: ReturnType<typeof setTimeout>;
      return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    };

    const debouncedFetch = debounce(fetchGameData, 800);

    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, (payload) => {
        console.log("🔄 Game table change:", payload.eventType);
        debouncedFetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, (payload) => {
        console.log("👤 Player update:", payload.new?.wallet_address, "→", payload.new?.status);
        debouncedFetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSignup = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      toast.error(`Signup failed: ${error.message}`);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Add user to admin_users table
      const { error: adminError } = await supabase.from("admin_users").insert({ user_id: data.user.id });

      if (adminError) {
        console.error("Failed to add admin user:", adminError);
        toast.error("Account created but failed to set admin privileges. Please contact support.");
      } else {
        toast.success("Admin account created successfully!");
        await verifyAdminStatus(data.user.id);
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(`Login failed: ${error.message}`);
      setLoading(false);
      return;
    }

    if (data.user) {
      await verifyAdminStatus(data.user.id);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    toast.success("Logged out");
    navigate("/");
  };

  const handleCreateGame = async () => {
    // Build round config from correctDoors state
    const roundConfig: any = {};
    for (let i = 0; i < 5; i++) {
      roundConfig[`round_${i + 1}`] = correctDoors[i];
    }

    const { error } = await supabase.from("games").insert({
      status: "waiting",
      current_round: 0,
      round_config: roundConfig,
    });

    if (error) {
      toast.error("Failed to create game");
      console.error(error);
      return;
    }

    toast.success("Game created!");
    fetchGameData();
  };

  const handleStartCountdown = async () => {
    if (!currentGame) return;

    // Build round config from correctDoors state
    const roundConfig: any = {};
    for (let i = 0; i < 5; i++) {
      roundConfig[`round_${i + 1}`] = correctDoors[i];
    }

    // Set started_at to current time - countdown logic will be handled by checking elapsed time
    const startTime = new Date();

    const { error } = await supabase
      .from("games")
      .update({
        status: "countdown",
        started_at: startTime.toISOString(),
        round_config: roundConfig,
        countdown_minutes: countdownMinutes,
      })
      .eq("id", currentGame.id);

    if (error) {
      toast.error("Failed to start countdown");
      return;
    }

    toast.success(`Countdown started! Game will auto-start in ${countdownMinutes} minute(s)`);
  };

  const startNextRoundDirect = async (gameData: any, nextRound: number, correctDoor: number) => {
    console.log("Starting round", nextRound, "correct door:", correctDoor);

    const roundStart = new Date();
    const roundEnd = new Date(roundStart.getTime() + 15000); // 15 seconds

    // Create round
    const { data: roundData, error: roundError } = await supabase.rpc("admin_create_round", {
      p_game_id: gameData.id,
      p_round_number: nextRound,
      p_correct_door: correctDoor,
      p_starts_at: roundStart.toISOString(),
      p_ends_at: roundEnd.toISOString(),
    });

    if (roundError) {
      toast.error("Failed to create round");
      console.error(roundError);
      return;
    }

    // Update game
    const { error: gameError } = await supabase
      .from("games")
      .update({
        status: "active",
        current_round: nextRound,
      })
      .eq("id", gameData.id);

    if (gameError) {
      console.error("Failed to update game:", gameError);
      toast.error("Failed to update game status");
      return;
    }

    console.log(`Round ${nextRound} started successfully! Game status updated to active.`);
    toast.success(`Round ${nextRound} started!`);
  };

  const startNextRound = async () => {
    if (!currentGame) return;

    const nextRound = currentGame.current_round + 1;

    if (nextRound > 5) {
      // Game finished, determine winner
      await determineWinner();
      return;
    }

    const correctDoor = correctDoors[nextRound - 1];

    const roundStart = new Date();
    const roundEnd = new Date(roundStart.getTime() + 15000); // 15 seconds

    // Create round
    const { data: roundData, error: roundError } = await supabase.rpc("admin_create_round", {
      p_game_id: currentGame.id,
      p_round_number: nextRound,
      p_correct_door: correctDoor,
      p_starts_at: roundStart.toISOString(),
      p_ends_at: roundEnd.toISOString(),
    });

    if (roundError) {
      toast.error("Failed to create round");
      console.error(roundError);
      return;
    }

    // Update game
    const { error: gameError } = await supabase
      .from("games")
      .update({
        status: "active",
        current_round: nextRound,
      })
      .eq("id", currentGame.id);

    if (gameError) {
      toast.error("Failed to update game");
      return;
    }

    toast.success(`Round ${nextRound} started!`);
  };

  const checkAnswersAndEliminate = async (roundId: string, roundNumber: number, gameData: any) => {
    console.log("Checking answers and eliminating for round:", roundNumber);

    // Get all active players
    const { data: activePlayers } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameData.id)
      .eq("status", "active");

    if (!activePlayers) return;

    console.log("Active players before elimination:", activePlayers.length);

    // Get answers for this round
    const { data: answers } = await supabase.from("answers").select("*").eq("round_id", roundId);

    console.log("Answers submitted:", answers?.length || 0);

    const answeredPlayerIds = new Set(answers?.map((a) => a.player_id) || []);
    const correctPlayerIds = new Set(answers?.filter((a) => a.is_correct).map((a) => a.player_id) || []);

    console.log("Correct answers:", correctPlayerIds.size);

    // Eliminate players who didn't answer or answered wrong
    for (const player of activePlayers) {
      if (player.status !== "active") continue;

      if (!answeredPlayerIds.has(player.id) || !correctPlayerIds.has(player.id)) {
        console.log("Eliminating player at round end:", player.wallet_address);
        await supabase
          .from("players")
          .update({
            status: "eliminated",
            eliminated_at: new Date().toISOString(),
          })
          .eq("id", player.id);
      }
    }

    // Check if game should end - refresh the remaining players after elimination
    const { data: remainingPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameData.id)
      .eq("status", "active");

    console.log("Remaining players after elimination:", remainingPlayers?.length || 0);

    if (!remainingPlayers || remainingPlayers.length === 0) {
      // No winners
      console.log("No remaining players - ending game");
      await supabase
        .from("games")
        .update({ status: "finished", ended_at: new Date().toISOString() })
        .eq("id", gameData.id);
      toast.info("Game ended - no winners");
    } else if (roundNumber >= 5) {
      // Round 5 or later: Mark remaining active players as winners first
      const { data: existingWinners } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", gameData.id)
        .eq("status", "winner")
        .order("winner_rank", { ascending: true });

      let currentWinnerCount = existingWinners?.length || 0;

      // Mark remaining active players who survived round 5 as winners
      if (remainingPlayers.length > 0) {
        console.log(`Marking ${remainingPlayers.length} remaining players as winners`);

        for (const player of remainingPlayers) {
          // Check if this player answered correctly
          const playerAnswer = answers?.find((a) => a.player_id === player.id);
          if (playerAnswer && playerAnswer.is_correct) {
            currentWinnerCount++;
            await supabase
              .from("players")
              .update({
                status: "winner",
                winner_rank: currentWinnerCount,
              })
              .eq("id", player.id);
            console.log(`Player ${player.wallet_address} marked as winner #${currentWinnerCount}`);
          }
        }
      }

      // Now check final winner count
      if (currentWinnerCount >= 3) {
        console.log(`Game finished with ${currentWinnerCount} winners!`);
        toast.success(`🏆 Game finished! ${currentWinnerCount} winners!`);
      } else {
        console.log(`Game finished with ${currentWinnerCount} winner(s)`);
        toast.info(`Game ended with ${currentWinnerCount} winner(s)`);
      }

      // End the game
      await supabase
        .from("games")
        .update({ status: "finished", ended_at: new Date().toISOString() })
        .eq("id", gameData.id);
    } else if (roundNumber < 5) {
      // Continue to next round after 10 second break
      console.log(`Setting break status after round ${roundNumber}`);
      toast.info(`Round ${roundNumber} complete - Next round in 10 seconds`);

      // Calculate break end time from NOW (not from round end)
      const breakEndsAt = new Date(Date.now() + 10000);

      console.log(`Break starts now. Will end at: ${breakEndsAt.toISOString()}`);

      // Set game to break status with explicit break end time
      const { data: updateResult, error: updateError } = await supabase
        .from("games")
        .update({
          status: "break",
          break_ends_at: breakEndsAt.toISOString(),
        })
        .eq("id", gameData.id)
        .select();

      if (updateError) {
        console.error("Failed to set break status:", updateError);
      } else {
        console.log(`Break status set successfully:`, updateResult);
      }
    }
  };

  const determineWinner = async () => {
    // Implementation for determining winner if multiple players remain
    toast.info("Game finished!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black neon-glow">ADMIN</h1>
            <p className="text-muted-foreground">
              {isSignupMode ? "Create your admin account" : "Sign in with your admin credentials"}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (isSignupMode ? handleSignup() : handleLogin())}
                className="h-12"
                disabled={loading}
              />
            </div>
            <Button
              onClick={isSignupMode ? handleSignup : handleLogin}
              className="w-full h-12"
              size="lg"
              disabled={loading}
            >
              {loading
                ? isSignupMode
                  ? "CREATING ACCOUNT..."
                  : "SIGNING IN..."
                : isSignupMode
                  ? "CREATE ADMIN ACCOUNT"
                  : "SIGN IN"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsSignupMode(!isSignupMode)}
              className="w-full"
              disabled={loading}
            >
              {isSignupMode ? "Already have an account? Sign in" : "Need to create first admin? Sign up"}
            </Button>
          </div>
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-5xl font-black neon-glow">ADMIN PANEL</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Logged in as: <span className="font-medium text-foreground">{user?.email}</span>
            </p>
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Game Controls */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Game Controls</h2>

          {currentGame?.status === "active" && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-500 font-medium">
                ⏰ Round in progress - will automatically advance in 10 seconds
              </p>
            </div>
          )}

          {currentGame?.status === "break" && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
              <p className="text-blue-500 font-medium">⏸️ Break - Next round will start automatically in 30 seconds</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs space-y-2">
                <label className="text-sm font-medium">Countdown Duration (minutes)</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={countdownMinutes}
                  onChange={(e) => setCountdownMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="Minutes"
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleCreateGame} disabled={currentGame?.status !== "finished" && currentGame}>
                Create New Game
              </Button>
              <Button
                onClick={handleStartCountdown}
                disabled={!currentGame || currentGame.status !== "waiting"}
                className="bg-primary hover:bg-primary/90"
              >
                Start Countdown ({countdownMinutes}min)
              </Button>
              <Button
                onClick={async () => {
                  if (!currentGame) return;
                  const correctDoor = correctDoors[0];
                  await startNextRoundDirect(currentGame, 1, correctDoor);
                }}
                disabled={!currentGame || (currentGame.status !== "countdown" && currentGame.status !== "waiting")}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                🚀 FORCE START NOW
              </Button>
              <Button
                onClick={startNextRound}
                disabled={!currentGame || currentGame.status !== "active"}
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                {currentGame?.current_round === 0 ? "Start Round 1" : "Force Next Round / Check Answers"}
              </Button>
              <Button
                onClick={async () => {
                  if (!currentGame) return;
                  await supabase
                    .from("games")
                    .update({ status: "finished", ended_at: new Date().toISOString() })
                    .eq("id", currentGame.id);
                  toast.success("Game ended");
                }}
                disabled={!currentGame || currentGame.status === "finished"}
                variant="destructive"
              >
                End Game
              </Button>
            </div>
          </div>
          {currentGame && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Status:</strong> {currentGame.status}
              </p>
              <p className="text-sm">
                <strong>Round:</strong> {currentGame.current_round} / {currentGame.total_rounds}
              </p>
            </div>
          )}
        </Card>

        {/* Round Questions & Answers */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Round Questions & Answers</h2>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((round) => (
              <div key={round} className="space-y-3 p-4 bg-muted rounded-lg">
                <h3 className="font-bold text-lg">Round {round}</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Correct Door (1, 2, or 3)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((door) => (
                      <Button
                        key={door}
                        type="button"
                        variant={correctDoors[round - 1] === door ? "default" : "outline"}
                        onClick={() => {
                          const newDoors = [...correctDoors];
                          newDoors[round - 1] = door;
                          setCorrectDoors(newDoors);
                        }}
                        className="flex-1"
                      >
                        Door {door}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Player List */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">Players ({players.length})</h2>
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="flex justify-between items-center p-3 bg-muted rounded-lg gap-4">
                <span className="font-mono flex-1">{player.wallet_address}</span>
                <div className="flex items-center gap-2">
                  {player.winner_rank && (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-500">
                      {player.winner_rank === 1 ? "🥇 1st" : player.winner_rank === 2 ? "🥈 2nd" : "🥉 3rd"}
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      player.status === "active"
                        ? "bg-primary/20 text-primary"
                        : player.status === "eliminated"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    {player.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
