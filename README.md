# VELORA — Secret Spin

A small live multiplayer spin-the-bottle question game. The host creates a room, joins as a player, and privately supplies the questions. Everyone sees the selected player and the same question; answers happen in live chat.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Set an admin password:
   - macOS/Linux: `ADMIN_PASSWORD='your-long-private-password' npm start`
   - Windows PowerShell: `$env:ADMIN_PASSWORD='your-long-private-password'; npm start`
4. Open `http://localhost:3000`.

## Publish a public link (free-tier hosting)
Deploy this folder as a **Node web service** on a host such as Render:
1. Create a new Web Service and connect/upload this project.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variable `ADMIN_PASSWORD` with a long, private password.
5. Deploy. The host gives you a public URL. Open it, enter your nickname and admin password, then choose **Create room as admin + player**.
6. Share the room invite link with the other players. They enter nicknames and the room code/link, leaving the admin password blank.

## Important limitations of this starter
- Room/player/chat state is held in server memory. If the service restarts or sleeps, the room resets. Keep the service running during the game.
- The host must remain connected to keep admin controls. If the host disconnects, create a new room.
- This starter is designed for a small private group, not a public anonymous chat service. Share the room link only with people you trust.
- Questions are stored only in the running server's memory and are not sent to players as a list. Do not add sensitive, humiliating, sexual, or identifying questions. Players can skip any question.
- The admin password is a shared room-creation secret. Change the default and never share it with players.
