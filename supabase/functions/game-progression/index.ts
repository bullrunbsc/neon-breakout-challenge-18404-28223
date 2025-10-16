import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log("Checking for game progression...");

    // Get the current game
    const { data: gameData, error: gameError } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      console.error("Error fetching game:", gameError);
      throw gameError;
    }

    if (!gameData) {
      console.log("No game found");
      return new Response(
        JSON.stringify({ message: "No active game" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Game status:", gameData.status, "Round:", gameData.current_round);

    const now = new Date();
    let action = "none";

    // Handle countdown status
    if (gameData.status === "countdown" && gameData.started_at) {
      const countdownEndTime = new Date(gameData.started_at);
      
      if (now > countdownEndTime) {
        console.log("Countdown ended, starting round 1");
        
        // Get correct door from game round_config
        const correctDoor = gameData.round_config?.round_1 || 1;
        
        await startRound(supabase, gameData.id, 1, correctDoor);
        action = "started_round_1";
      }
    }

    // Handle break status
    if (gameData.status === "break" && gameData.break_ends_at) {
      const breakEndTime = new Date(gameData.break_ends_at);
      
      if (now > breakEndTime) {
        console.log("Break ended, starting next round");
        
        const nextRound = gameData.current_round + 1;
        if (nextRound > gameData.total_rounds) {
          console.log("Game should be finished");
          return new Response(
            JSON.stringify({ message: "Game already finished" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get correct door from game round_config
        const correctDoor = gameData.round_config?.[`round_${nextRound}`] || 1;
        
        await startRound(supabase, gameData.id, nextRound, correctDoor);
        action = `started_round_${nextRound}`;
      }
    }

    // Handle active round - check if expired
    if (gameData.status === "active" && gameData.current_round > 0) {
      const { data: currentRoundData } = await supabase
        .from("rounds")
        .select("*")
        .eq("game_id", gameData.id)
        .eq("round_number", gameData.current_round)
        .single();

      if (currentRoundData) {
        const endTime = new Date(currentRoundData.ends_at);
        
        if (now > endTime) {
          console.log("Round expired, processing eliminations");
          await checkAnswersAndEliminate(supabase, currentRoundData.id, currentRoundData.round_number, gameData);
          action = `processed_round_${currentRoundData.round_number}`;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Game progression checked", action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function startRound(supabase: any, gameId: string, roundNumber: number, correctDoor: number) {
  const roundStart = new Date();
  const roundEnd = new Date(roundStart.getTime() + 15000); // 15 seconds

  // Create round directly using service role
  const { error: roundError } = await supabase
    .from("rounds")
    .insert({
      game_id: gameId,
      round_number: roundNumber,
      correct_door: correctDoor,
      starts_at: roundStart.toISOString(),
      ends_at: roundEnd.toISOString(),
    });

  if (roundError) {
    console.error("Failed to create round:", roundError);
    throw roundError;
  }

  // Update game status
  const { error: gameError } = await supabase
    .from("games")
    .update({
      status: "active",
      current_round: roundNumber,
    })
    .eq("id", gameId);

  if (gameError) {
    console.error("Failed to update game:", gameError);
    throw gameError;
  }

  console.log(`Round ${roundNumber} started successfully`);
}

async function checkAnswersAndEliminate(supabase: any, roundId: string, roundNumber: number, gameData: any) {
  console.log("Checking answers for round:", roundNumber);

  // Get all active players
  const { data: activePlayers } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameData.id)
    .eq("status", "active");

  if (!activePlayers || activePlayers.length === 0) {
    console.log("No active players");
    return;
  }

  console.log("Active players:", activePlayers.length);

  // Get answers for this round
  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("round_id", roundId);

  console.log("Answers submitted:", answers?.length || 0);

  const answeredPlayerIds = new Set(answers?.map((a: any) => a.player_id) || []);
  const correctPlayerIds = new Set(
    answers?.filter((a: any) => a.is_correct).map((a: any) => a.player_id) || []
  );

  // Eliminate players who didn't answer or answered wrong
  for (const player of activePlayers) {
    if (!answeredPlayerIds.has(player.id) || !correctPlayerIds.has(player.id)) {
      console.log("Eliminating player:", player.wallet_address);
      await supabase
        .from("players")
        .update({
          status: "eliminated",
          eliminated_at: new Date().toISOString(),
        })
        .eq("id", player.id);
    }
  }

  // Get remaining active players
  const { data: remainingPlayers } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", gameData.id)
    .eq("status", "active");

  console.log("Remaining players:", remainingPlayers?.length || 0);

  // Check if game should end
  if (!remainingPlayers || remainingPlayers.length === 0) {
    console.log("No players left, ending game");
    await supabase
      .from("games")
      .update({ status: "finished", ended_at: new Date().toISOString() })
      .eq("id", gameData.id);
    return;
  }

  if (remainingPlayers.length <= 3 || roundNumber >= gameData.total_rounds) {
    console.log("Determining winners");
    await determineWinner(supabase, gameData.id, remainingPlayers);
    return;
  }

  // Start break period before next round
  console.log("Starting break period");
  const breakEnd = new Date(Date.now() + 30000); // 30 seconds
  
  await supabase
    .from("games")
    .update({
      status: "break",
      break_ends_at: breakEnd.toISOString(),
    })
    .eq("id", gameData.id);
}

async function determineWinner(supabase: any, gameId: string, remainingPlayers: any[]) {
  console.log("Setting winners:", remainingPlayers.length);
  
  for (let i = 0; i < remainingPlayers.length; i++) {
    await supabase
      .from("players")
      .update({
        status: "winner",
        winner_rank: i + 1,
      })
      .eq("id", remainingPlayers[i].id);
  }

  await supabase
    .from("games")
    .update({
      status: "finished",
      ended_at: new Date().toISOString(),
    })
    .eq("id", gameId);

  console.log("Game finished with winners");
}
