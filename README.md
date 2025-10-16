# BREAKR - Realtime Elimination Game

A dark, cinematic realtime elimination game where players compete through 5 intense rounds. Wrong answer = eliminated. Only the strongest survive.

## 🎮 Game Rules

- **5 Rounds Total**: Each game consists of 5 elimination rounds
- **2 Minutes Per Round**: Players must submit the correct code before time expires
- **Wrong Answer = Elimination**: Submit wrong code or no answer, you're out
- **One Winner**: Last player standing wins, or first correct answer in final round if multiple remain
- **Real-time Updates**: No page refresh needed, all updates are instant via websockets

## 🚀 Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
  - PostgreSQL database with real-time subscriptions
  - Row Level Security (RLS) policies
  - Automatic scaling and deployment
- **Styling**: Dark cinematic theme with neon cyan accents
- **Real-time**: Supabase Realtime for instant game state updates

## 📁 Project Structure

```
src/
├── pages/
│   ├── Landing.tsx    # Landing page with countdown
│   ├── Game.tsx       # Player game interface
│   ├── Admin.tsx      # Admin control panel
│   └── NotFound.tsx   # 404 page
├── components/ui/     # Shadcn UI components
├── integrations/      # Supabase integration (auto-generated)
├── index.css          # Design system & theme
└── App.tsx            # Main app with routing
```

## 🎯 Features

### Landing Page (`/`)
- Live countdown to next game
- Join game with wallet address
- Real-time game status updates
- Dark cinematic design with neon effects

### Game Page (`/game`)
- Real-time round questions
- Live countdown timer (2 minutes)
- Answer submission
- Automatic elimination on wrong/no answer
- Winner announcement with trophy animation
- "Game Over" screen for eliminated players

### Admin Panel (`/admin`)
- Password protected (default: `BREAKR2025`)
- Create new games
- Start countdown (10 seconds before game begins)
- Set answers for all 5 rounds
- Force next round (skip timer)
- View live player list with statuses
- Real-time player count

## 🗄️ Database Schema

### Tables

**games**
- `id` (uuid, primary key)
- `status` (enum: waiting, countdown, active, finished)
- `current_round` (integer, 0-5)
- `total_rounds` (integer, default 5)
- `started_at`, `ended_at`, `created_at`, `updated_at`

**players**
- `id` (uuid, primary key)
- `game_id` (uuid, references games)
- `wallet_address` (text, unique per game)
- `status` (enum: active, eliminated, winner)
- `joined_at`, `eliminated_at`

**rounds**
- `id` (uuid, primary key)
- `game_id` (uuid, references games)
- `round_number` (integer, 1-5)
- `question` (text)
- `correct_code` (text)
- `starts_at`, `ends_at`

**answers**
- `id` (uuid, primary key)
- `round_id` (uuid, references rounds)
- `player_id` (uuid, references players)
- `submitted_code` (text)
- `is_correct` (boolean)
- `submitted_at`

All tables have:
- Row Level Security (RLS) enabled
- Public read access (it's a public game)
- Real-time subscriptions enabled
- Proper foreign key constraints

## 🏃 Running Locally

This is a Lovable project with built-in backend. To run:

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd breakr
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

The app will start on `http://localhost:8080`

**Note**: The backend (Lovable Cloud) is already configured and connected. You don't need to set up Supabase separately.

## 🎮 How to Play

### For Players:

1. Visit the landing page
2. Wait for admin to create/start a game
3. Enter your wallet address (acts as username)
4. Click "JOIN GAME"
5. When countdown finishes, round 1 begins
6. Read the question and submit the correct code
7. Submit before the 2-minute timer expires
8. Advance to next round if correct
9. Get eliminated if wrong or no answer
10. Win if you're the last one standing after round 5!

### For Admin:

1. Navigate to `/admin`
2. Enter password: `BREAKR2025`
3. Set answers for all 5 rounds first
4. Click "Create New Game"
5. Wait for players to join
6. Click "Start Countdown" when ready (10 second countdown)
7. Game auto-advances through rounds
8. Use "Force Next Round" to skip timers if needed
9. Monitor player statuses in real-time

## 🚀 Deployment

### Frontend (Recommended: Lovable)

This project is built in Lovable and can be deployed directly:

1. Click "Publish" in Lovable editor
2. Your app will be live at `yourapp.lovable.app`
3. Optionally connect a custom domain in Settings

### Backend (Automatic)

Lovable Cloud handles all backend infrastructure:
- ✅ Database automatically provisioned
- ✅ Real-time subscriptions enabled
- ✅ API endpoints created
- ✅ Auto-scaling included
- ✅ No separate deployment needed

## 🎨 Design System

The app uses a dark cinematic theme with:

- **Background**: Pure black (#000000) to dark gray
- **Primary Accent**: Neon cyan (`hsl(189 94% 58%)`)
- **Text**: High-contrast white on dark
- **Effects**: 
  - Neon glow on titles and borders
  - Smooth transitions and animations
  - Pulse effects on countdowns
  - Trophy animation for winners
  - Red glow for "Game Over"

All colors use HSL format and are defined as CSS variables in `src/index.css`.

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Public read access (it's a public game show)
- Admin panel password protected
- Input validation on all forms
- Server-authoritative timers (no client manipulation)
- Secure database functions with search_path set

## ⚠️ Important Notes

### Admin Password
The admin password is hardcoded as `BREAKR2025` in `src/pages/Admin.tsx`. For production, you should:
1. Store it as an environment variable
2. Use proper authentication
3. Or use Supabase Auth for admin users

### Game Flow
- Games must be created by admin before players can join
- Answers for all rounds should be set before starting
- Timer is server-authoritative (uses absolute timestamps)
- Players can rejoin using same wallet address
- Eliminated players see "Game Over" screen immediately
- Winner announcement appears to all players

### Real-time Features
All game state is synchronized in real-time:
- Game status changes
- Round transitions
- Player eliminations
- Winner announcements
- Countdown timers

## 🛠️ Customization

### Changing Round Count
Update `total_rounds` default in database schema and adjust UI accordingly.

### Adjusting Round Duration
Change the 120000ms (2 minutes) in `Admin.tsx` where rounds are created.

### Modifying Theme
Edit colors in `src/index.css` - all colors use HSL format.

### Admin Password
Change `ADMIN_PASSWORD` constant in `src/pages/Admin.tsx`.

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (optimal experience)
- Tablets
- Mobile phones

## 🐛 Troubleshooting

**Players not seeing updates?**
- Check browser console for websocket errors
- Ensure Lovable Cloud is active

**Timer not accurate?**
- Timers use server timestamps, not client time
- Check system clock if issues persist

**Admin panel not loading?**
- Verify password is correct
- Check browser console for errors

## 📄 License

Built with Lovable - The fastest way to build beautiful web apps.

---

**Ready to BREAKR?** 🏆

Visit the app, join a game, and prove you're the strongest player!
