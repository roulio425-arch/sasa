# Aria Melody Discord Bot

## Overview
Aria Melody is a Discord music bot built with Discord.js and Riffy for Lavalink integration, offering music playback from YouTube, Spotify, and SoundCloud. It features a comprehensive web dashboard for real-time control and queue management, aiming to provide a seamless and visually rich music experience for Discord communities. The project prioritizes robust Spotify integration, dynamic UI/UX, and secure authentication to deliver a modern and engaging platform.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture
The bot's architecture centers around `Aria.js` as the main entry point and `config.js` for centralized settings. It uses a command-event-driven structure for Discord interactions, with commands organized in `/commands/` and events in `/events/`.

**UI/UX Decisions:**
- **Dynamic Theming:** Interactive theme selector (Red/Blue) affecting background, buttons, boxes, borders, particles, and scrollbars, with theme persistence via localStorage.
- **Enhanced Now Playing:** Rich display with colored platform icons (YouTube red, Spotify green, SoundCloud orange), neon-animated requester avatars, full title display, and thematic visual effects.
- **Grouped History:** Music history groups identical tracks, showing up to 3 requester avatars and usernames with neon effects, and a "+X others" indicator.
- **Mobile Optimization:** Responsive design for all components, including search bars, album art (60px mobile, 80px desktop), tactile buttons, and optimized scrolling performance.
- **Modern Design Elements:** Cards with hover effects, luminous borders, fluid animations, and a dark dashboard background for improved contrast.
- **Volume Control:** Redesigned circular volume indicator (0-150%) with dynamic icons (mute, low, medium, high) and smooth animations.

**Technical Implementations:**
- **Music System:** Riffy package with Lavalink nodes for efficient audio processing and multi-source support.
- **Database:** MongoDB with Mongoose for persistent data storage, including user favorites.
- **Web Dashboard:**
    - Express server with a clean frontend interface located in the `/web/` directory.
    - Real-time queue visualization and music control.
    - Search functionality with native Spotify, YouTube, and SoundCloud integration.
    - Socket.IO for live updates between Discord and the web interface.
    - Secure Discord OAuth2 authentication with session management and alternative access code for development.
    - Avatar normalization system for consistent display across the dashboard and Discord embeds.

**Feature Specifications:**
- **Advanced Search:** Native Spotify API integration (`/api/spotify-native-search`) returning up to 50 authentic results, alongside native YouTube and SoundCloud search.
- **Trending Music:** Enhanced "+" button with elegant validation animation (spinner, checkmark, position number) for all platforms.
- **Favorites System:** Functional "Heart" button for adding/removing favorites with real-time verification, heartbeat animation, visual notifications, and persistent MongoDB storage.
- **Smart Voice/Text Channel Selection:** Bot intelligently joins the voice channel with the most members and selects the most appropriate text channel based on category or name.

## External Dependencies
- **Discord.js:** Discord API wrapper for bot functionality.
- **Riffy (Lavalink):** Music playback and audio processing.
- **MongoDB:** Database for persistent data storage (e.g., user favorites, configurations).
- **Spotify Web API:** For searching tracks, retrieving metadata, and authentic Spotify results.
- **Socket.IO:** Real-time, bidirectional event-based communication between the web dashboard and the bot.
- **Express.js:** Web framework for the dashboard server.
- **Discord OAuth2:** For secure user authentication on the web dashboard.