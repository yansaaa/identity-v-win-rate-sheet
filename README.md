# Identity V Win Rate Sheet

A personal win-rate tracking and statistics dashboard for Identity V.

## Features

✨ **Track Your Matches**
- Log each match with date, character, map, role, and result
- Add match duration and notes for better analysis

📊 **Real-time Statistics**
- Overall win rate percentage
- Total wins, losses, and matches played
- Average match duration

🎮 **Character Performance**
- Win rate breakdown by character
- Identify your strongest and weakest characters

🗺️ **Map Statistics**
- Win rate by map
- See which maps you perform best on

📝 **Match History**
- Complete table of all logged matches
- Sorted by most recent first

## How to Use

1. Open `index.html` in your web browser
2. Fill in the "Log New Match" form with:
   - Date of the match
   - Character you played
   - Map you played on
   - Your role (Survivor/Hunter)
   - Match result (Win/Loss)
   - Match duration in minutes
   - Optional notes

3. Click "Add Match" to log it
4. View your statistics update in real-time

## Data Storage

All data is saved in your browser's localStorage. It persists across browser sessions but is local to your device.

To backup your data:
- Right-click in browser DevTools → Application → Local Storage → Copy the `identityVMatches` value

To clear all data:
- Open DevTools → Application → Local Storage → Delete `identityVMatches`

## Tips

- Log matches consistently for accurate statistics
- Use the notes field to track important details (good strategies, team performance, etc.)
- Review character and map stats regularly to identify improvement areas

Enjoy tracking your Identity V journey! 🔍