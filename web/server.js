const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const fetch = require('node-fetch');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { default_color } = require('../config');
const capital = require('node-capitalize');

// YouTube and SoundCloud native search libraries
const ytSearch = require('youtube-search-api');
const scdl = require('soundcloud-downloader').default;

// MongoDB schemas
const MusicHistory = require('../schemas/MusicHistory');
const UserSettings = require('../schemas/UserSettings');
const UserPlaylists = require('../schemas/UserPlaylists');
const UserFavorites = require('../schemas/UserFavorites');

// Function to update Discord embed buttons when controls are used from dashboard
async function updateDiscordButtons(player, isPaused) {
    if (!player || !player.message) return;

    try {
        // Create button builders similar to trackStart.js
        let bPause;
        if (isPaused) {
            // Show play button when paused
            bPause = new ButtonBuilder()
                .setCustomId("pause")
                .setEmoji("1418956176628121600") // Play emoji
                .setStyle(ButtonStyle.Secondary);
        } else {
            // Show pause button when playing
            bPause = new ButtonBuilder()
                .setCustomId("pause")
                .setEmoji("1276835192295915623") // Pause emoji
                .setStyle(ButtonStyle.Secondary);
        }

        const bReplay = new ButtonBuilder()
            .setCustomId("replay")
            .setEmoji("1276835198893559961")
            .setStyle(ButtonStyle.Secondary);
        const bSkip = new ButtonBuilder()
            .setCustomId("skip")
            .setEmoji("1276835203146449031")
            .setStyle(ButtonStyle.Secondary);
        const bVDown = new ButtonBuilder()
            .setCustomId("voldown")
            .setEmoji("1276835205377949737")
            .setStyle(ButtonStyle.Secondary);
        const bStop = new ButtonBuilder()
            .setCustomId("stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Danger);
        const bVUp = new ButtonBuilder()
            .setCustomId("volup")
            .setEmoji("1276835207345078293")
            .setStyle(ButtonStyle.Secondary);

        let bAuto = new ButtonBuilder()
            .setCustomId("autoplay")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("1286677681882136576");
        if (player.isAutoplay)
            bAuto = new ButtonBuilder()
                .setCustomId("autoplay")
                .setEmoji("1286677681882136576")
                .setStyle(ButtonStyle.Primary);

        let bLoop = new ButtonBuilder()
            .setCustomId("loop")
            .setEmoji("1276835185849143367")
            .setStyle(ButtonStyle.Secondary);
        if (player.loop === "track")
            bLoop = new ButtonBuilder()
                .setCustomId("loop")
                .setEmoji("1276835185849143367")
                .setStyle(ButtonStyle.Success);
        if (player.loop === "queue")
            bLoop = new ButtonBuilder()
                .setCustomId("loop")
                .setEmoji("1276835185849143367")
                .setStyle(ButtonStyle.Primary);

        // Ajouter les boutons Dashboard et Lyrics pour qu'ils ne disparaissent pas
        const bDashboard = new ButtonBuilder()
            .setCustomId("dashboard")
            .setEmoji("1418991076198580304")
            .setStyle(ButtonStyle.Secondary);

        const bLyrics = new ButtonBuilder()
            .setCustomId("lyrics")
            .setEmoji("1418986055604109443")
            .setStyle(ButtonStyle.Secondary);

        const row1 = new ActionRowBuilder().addComponents(
            bPause,
            bReplay,
            bSkip,
            bLoop,
            bDashboard,
        );
        const row2 = new ActionRowBuilder().addComponents(
            bStop,
            bVDown,
            bVUp,
            bAuto,
            bLyrics,
        );

        // Edit the Discord message with updated buttons
        await player.message.edit({
            components: [row1, row2],
        });

        console.log(`[DASHBOARD] Updated Discord buttons - ${isPaused ? 'Paused' : 'Playing'} state`);
    } catch (error) {
        console.error('[DASHBOARD] Error updating Discord buttons:', error);
    }
}

// Function to send notification when track is added via dashboard
async function notifyTrackAdded(client, guildId, trackTitle, trackAuthor, trackDuration, trackThumbnail, trackUri, userId = null, userDisplayName = 'Dashboard User', userAvatar = null) {
    try {
        const player = client.riffy.players.get(guildId);
        if (!player || !player.textChannel) return;

        const channel = client.channels.cache.get(player.textChannel);
        if (!channel) return;

        // Tronquer le titre et l'auteur si trop longs
        const titles = trackTitle.length > 20 ? trackTitle.substr(0, 20) + "..." : trackTitle;
        const authors = trackAuthor.length > 20 ? trackAuthor.substr(0, 20) + "..." : trackAuthor;
        
        // Utiliser l'avatar et le pseudo de l'utilisateur
        const authorIcon = userAvatar || "https://cdn.discordapp.com/attachments/1391089229177557187/1418991076198580304/icons8-dashboard-100.png";
        
        const dashboardEmbed = new EmbedBuilder()
            .setAuthor({
                name: `Ajouté par ${userDisplayName}`,
                iconURL: authorIcon,
            })
            .setColor("#6e0b14")
            .setTitle(trackTitle)
            .setThumbnail(trackThumbnail || client.user.displayAvatarURL()) 
            .setURL(trackUri || null)
            .addFields(
                {
                    name: "<:microdphone2:1419029652596330668>Artiste :",
                    value: `${authors}`,
                    inline: true,
                },
                {
                    name: "<:xs:1419030455449157856>Durée:",
                    value: `\`${trackDuration || 'Unknown'}\``,
                    inline: true,
                },
                {
                    name: "<:loupe1:1419030687603753000>Ajouté via:",
                    value: `Dashboard`,
                    inline: true,
                },
            )
            .setFooter({
                text: ` Playlist: ${player.queue.length} sons en attente | by Akira avec ❤️`,
                iconURL: "https://cdn.discordapp.com/attachments/1391089229177557187/1418928476823752816/icons8-add-to-list-64.png?ex=68cfe79f&is=68ce961f&hm=f273ffee07cd1c12407e1799d6e8aa5418c520bcd722dd50d178a9c2bc35cf09&",
            })
            .setImage("https://cdn.discordapp.com/attachments/1391089229177557187/1419063863508340756/standard_5.gif?ex=68d065b5&is=68cf1435&hm=66853e25004a1363f1d3e821825b27c0a677e4013877eceea006fd4d80b0bc0c&")
            .setTimestamp();

        await channel.send({ embeds: [dashboardEmbed] });
        console.log(`[DASHBOARD] Sent track added notification for: ${trackTitle} by ${userDisplayName}`);
    } catch (error) {
        console.error('[DASHBOARD] Error sending track notification:', error);
    }
}

function createWebServer(client) {
    const app = express();
    const server = http.createServer(app);
    // Configure CORS avec les URLs configurées
    const allowedOrigins = [
        'http://localhost:5000',
        'http://0.0.0.0:5000',
        'http://217.160.125.126:14323',
        'https://wispbyte.com',
        'https://www.wispbyte.com'
    ];
    
    // Add Replit domain if available
    const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
    if (replitDomain) {
        allowedOrigins.push(`https://${replitDomain}`);
        console.log(`[CORS] Added Replit domain: https://${replitDomain}`);
    }
    
    console.log('[CORS] Allowed origins:', allowedOrigins);
    
    const io = socketIo(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Expose IO to Discord client for real-time updates
    client.dashboardIO = io;

    // Middleware with secure CORS
    app.use(cors({
        origin: allowedOrigins,
        credentials: true,
        optionsSuccessStatus: 200
    }));
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));
    
    // Configure session for OAuth2
    const config = require('../config');
    app.use(session({
        secret: config.session_secret || process.env.SESSION_SECRET || 'aria_melody_session_secret_change_in_production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        }
    }));
    
    // Add cache control headers for Replit
    app.use((req, res, next) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next();
    });

    // Auth middleware for API routes
    const authenticateToken = (req, res, next) => {
        // Priority 1: Check if user is authenticated via Discord OAuth2 session
        if (req.session && req.session.user) {
            console.log(`[AUTH] ✅ Discord OAuth2 authenticated: ${req.session.user.username} (${req.session.user.id})`);
            req.authenticatedUser = req.session.user; // Attach user to request
            next();
            return;
        }
        
        // Priority 2: Check for token-based authentication (fallback for development)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const { dashboard_token } = require('../config');
        
        // If CLIENT_SECRET is configured, require Discord OAuth2 authentication
        if (DISCORD_CLIENT_SECRET) {
            console.log('[AUTH] ❌ OAuth2 is configured - Discord authentication required');
            return res.status(401).json({ 
                error: 'Discord authentication required',
                redirectTo: '/auth/discord'
            });
        }
        
        // Fallback to token-based auth if OAuth2 is not configured
        if (!dashboard_token) {
            console.log('[AUTH] ⚠️ Development mode - No authentication configured, allowing access');
            next();
            return;
        }
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Authentication required',
                message: 'Please provide an access token or login with Discord'
            });
        }
        
        if (token !== dashboard_token) {
            return res.status(403).json({ error: 'Invalid access token' });
        }
        
        console.log('[AUTH] ✅ Token-based authentication successful');
        next();
    };

    // Helper function to normalize requester data with avatar URL
    const normalizeRequester = (requester) => {
        if (!requester) return null;
        
        // Si le requester a déjà un avatar URL (depuis le dashboard), on le garde
        if (requester.avatar && requester.avatar.startsWith('http')) {
            return requester;
        }
        
        // Si le requester est un User/GuildMember Discord avec displayAvatarURL
        if (typeof requester === 'object' && requester.displayAvatarURL) {
            return {
                tag: requester.tag || requester.username || 'Unknown',
                displayName: requester.displayName || requester.tag || requester.username || 'Unknown',
                id: requester.id,
                avatar: requester.displayAvatarURL({ size: 256 })
            };
        }
        
        // Si c'est un objet simple avec un id et avatar hash
        if (requester.id && requester.avatar && !requester.avatar.startsWith('http')) {
            return {
                ...requester,
                avatar: `https://cdn.discordapp.com/avatars/${requester.id}/${requester.avatar}.png?size=256`
            };
        }
        
        // Sinon retourner tel quel
        return requester;
    };

    // Helper function to normalize track data
    const normalizeTrack = (track) => {
        if (!track || !track.info) return track;
        
        return {
            ...track,
            info: {
                ...track.info,
                requester: normalizeRequester(track.info.requester)
            }
        };
    };

    // Helper function to get guild state
    const getGuildState = (guildId) => {
        const player = client.riffy.players.get(guildId);
        const guild = client.guilds.cache.get(guildId);
        
        // Return structured state even without player
        if (!player) {
            console.log(`[DASHBOARD] No active player for guild ${guildId}, returning idle state`);
            return {
                guildId: guildId,
                guildName: guild?.name || 'Unknown Server',
                hasPlayer: false,
                current: null,
                queue: [],
                volume: 100,
                paused: false,
                loop: 'none',
                autoplay: false,
                position: 0,
                textChannelId: null,
                voiceChannelId: null,
                connected: false
            };
        }

        return {
            guildId: guildId,
            guildName: guild?.name || 'Unknown Server',
            hasPlayer: true,
            current: normalizeTrack(player.current),
            queue: (player.queue || []).map(normalizeTrack),
            volume: player.volume || 100,
            paused: player.paused || false,
            loop: player.loop || 'none',
            autoplay: player.autoplay || false,
            position: player.position || 0,
            textChannelId: player.textChannel || null,
            voiceChannelId: player.voiceChannel || null,
            connected: player.connected || false
        };
    };

    // Discord OAuth2 Configuration
    const DISCORD_CLIENT_ID = config.client_id || process.env.CLIENT_ID;
    const DISCORD_CLIENT_SECRET = config.client_secret || process.env.CLIENT_SECRET;
    
    // Build redirect URI based on environment
    let baseUrl;
    if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',');
        baseUrl = `https://${domains[0]}`;
    } else {
        baseUrl = 'http://localhost:5000';
    }
    
    const DISCORD_REDIRECT_URI = config.oauth_redirect_uri || process.env.OAUTH_REDIRECT_URI || `${baseUrl}/auth/callback`;
    
    console.log('[OAuth2] Configuration:');
    console.log(`  - Client ID: ${DISCORD_CLIENT_ID}`);
    console.log(`  - Client Secret: ${DISCORD_CLIENT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`  - Redirect URI: ${DISCORD_REDIRECT_URI}`);
    
    // Routes
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // OAuth2 Routes
    app.get('/auth/discord', (req, res) => {
        if (!DISCORD_CLIENT_SECRET) {
            return res.status(500).send('OAuth2 not configured. Please set CLIENT_SECRET environment variable.');
        }
        
        const params = new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            redirect_uri: DISCORD_REDIRECT_URI,
            response_type: 'code',
            scope: 'identify guilds'
        });
        
        res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
    });

    app.get('/auth/callback', async (req, res) => {
        const { code } = req.query;
        
        if (!code) {
            return res.redirect('/?error=no_code');
        }
        
        if (!DISCORD_CLIENT_SECRET) {
            return res.redirect('/?error=oauth_not_configured');
        }

        try {
            // Exchange code for access token
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: DISCORD_REDIRECT_URI
                })
            });

            const tokenData = await tokenResponse.json();
            
            if (!tokenData.access_token) {
                console.error('[OAuth2] Failed to get access token:', tokenData);
                return res.redirect('/?error=token_failed');
            }

            // Fetch user information
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`
                }
            });

            const userData = await userResponse.json();
            
            // Store user in session
            req.session.user = {
                id: userData.id,
                username: userData.username,
                global_name: userData.global_name || userData.username,
                discriminator: userData.discriminator,
                avatar: userData.avatar,
                accessToken: tokenData.access_token
            };
            
            console.log(`[OAuth2] User ${userData.username} authenticated successfully`);
            res.redirect('/?auth=success');
        } catch (error) {
            console.error('[OAuth2] Error during authentication:', error);
            res.redirect('/?error=auth_failed');
        }
    });

    app.get('/auth/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('[OAuth2] Error destroying session:', err);
            }
            res.redirect('/');
        });
    });

    app.get('/api/me', (req, res) => {
        if (req.session && req.session.user) {
            res.json({
                authenticated: true,
                user: {
                    id: req.session.user.id,
                    username: req.session.user.username,
                    global_name: req.session.user.global_name,
                    discriminator: req.session.user.discriminator,
                    avatar: req.session.user.avatar
                }
            });
        } else {
            res.json({ authenticated: false });
        }
    });

    // API Routes
    app.get('/api/guilds', authenticateToken, (req, res) => {
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            hasPlayer: client.riffy.players.has(guild.id),
            // Ajouter l'icône du serveur
            icon: guild.iconURL({ dynamic: true, size: 256 }) || null
        }));
        res.json(guilds);
    });

    // History endpoint - Get music history for a guild
    app.get('/api/history/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            
            // Récupérer l'historique depuis MongoDB, trié par date décroissante
            const history = await MusicHistory.find({ GuildId: guildId })
                .sort({ addedAt: -1 })
                .limit(limit)
                .lean();
            
            console.log(`[HISTORY] Retrieved ${history.length} tracks from history for guild ${guildId}`);
            res.json({ tracks: history });
        } catch (error) {
            console.error('[HISTORY] Error fetching history:', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    });

    app.get('/api/state/:guildId', authenticateToken, (req, res) => {
        const { guildId } = req.params;
        const state = getGuildState(guildId);
        
        // State is always returned, even without player
        res.json(state);
    });

    // YouTube Native Search Endpoint
    app.post('/api/youtube-native-search', authenticateToken, async (req, res) => {
        try {
            const { query, maxResults = 50 } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }

            console.log(`[YOUTUBE NATIVE] Searching for: ${query}`);

            const results = await ytSearch.GetListByKeyword(query, false, maxResults);
            
            if (!results || !results.items || results.items.length === 0) {
                console.log(`[YOUTUBE NATIVE] No results found for: ${query}`);
                return res.json({ tracks: [] });
            }

            const tracks = results.items.map((video, index) => {
                const videoId = video.id;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                
                return {
                    title: video.title || 'Unknown Title',
                    author: video.channelTitle || 'Unknown Artist',
                    uri: videoUrl,
                    duration: video.length ? video.length.simpleText : '0:00',
                    thumbnail: video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url || null,
                    encoded: null,
                    platform: 'YouTube',
                    source: 'YouTube',
                    sourceName: 'youtube',
                    quality: 'native',
                    searchRank: index + 1,
                    videoId: videoId
                };
            });

            console.log(`[YOUTUBE NATIVE] Found ${tracks.length} videos`);
            res.json({ tracks });
        } catch (error) {
            console.error('[YOUTUBE NATIVE] Search error:', error);
            res.status(500).json({ error: 'YouTube search failed', message: error.message });
        }
    });

    // SoundCloud Native Search Endpoint
    app.post('/api/soundcloud-native-search', authenticateToken, async (req, res) => {
        try {
            const { query, maxResults = 50 } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }

            console.log(`[SOUNDCLOUD NATIVE] Searching for: ${query}`);

            const searchResults = await scdl.search({
                query: query,
                limit: maxResults,
                offset: 0,
                resourceType: 'tracks'
            });

            if (!searchResults || !searchResults.collection || searchResults.collection.length === 0) {
                console.log(`[SOUNDCLOUD NATIVE] No results found for: ${query}`);
                return res.json({ tracks: [] });
            }

            const tracks = searchResults.collection.map((track, index) => {
                const durationMs = track.duration || 0;
                
                return {
                    title: track.title || 'Unknown Title',
                    author: track.user?.username || 'Unknown Artist',
                    uri: track.permalink_url,
                    duration: durationMs,
                    thumbnail: track.artwork_url?.replace('-large', '-t500x500') || track.user?.avatar_url || null,
                    encoded: null,
                    platform: 'SoundCloud',
                    source: 'SoundCloud',
                    sourceName: 'soundcloud',
                    quality: 'native',
                    searchRank: index + 1,
                    genre: track.genre || null,
                    playCount: track.playback_count || 0
                };
            });

            console.log(`[SOUNDCLOUD NATIVE] Found ${tracks.length} tracks`);
            res.json({ tracks });
        } catch (error) {
            console.error('[SOUNDCLOUD NATIVE] Search error:', error);
            res.status(500).json({ error: 'SoundCloud search failed', message: error.message });
        }
    });

    // Spotify Native Search endpoint
    app.post('/api/spotify-native-search', authenticateToken, async (req, res) => {
        try {
            const { query, maxResults = 50 } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }

            console.log(`[SPOTIFY NATIVE] Searching for: ${query}`);

            const searchResults = await client.spotify.searchTracks(query, { limit: maxResults });
            
            if (!searchResults || !searchResults.body || !searchResults.body.tracks || !searchResults.body.tracks.items) {
                console.log(`[SPOTIFY NATIVE] No results found for: ${query}`);
                return res.json({ tracks: [] });
            }

            const tracks = searchResults.body.tracks.items.map((track, index) => {
                const durationMs = track.duration_ms || 0;
                const albumImage = track.album?.images?.[0]?.url || null;
                const artists = track.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist';
                
                return {
                    title: track.name || 'Unknown Title',
                    author: artists,
                    uri: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
                    duration: durationMs,
                    thumbnail: albumImage,
                    encoded: null,
                    platform: 'Spotify',
                    source: 'Spotify',
                    sourceName: 'spotify',
                    quality: 'native',
                    searchRank: index + 1,
                    trackId: track.id,
                    isrc: track.external_ids?.isrc || null,
                    popularity: track.popularity || 0
                };
            });

            console.log(`[SPOTIFY NATIVE] Found ${tracks.length} tracks`);
            res.json({ tracks });
        } catch (error) {
            console.error('[SPOTIFY NATIVE] Search error:', error);
            res.status(500).json({ error: 'Spotify search failed', message: error.message });
        }
    });

    app.post('/api/search', authenticateToken, async (req, res) => {
        try {
            const { query, platform = 'ytsearch', isDirectLink = false } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }

            // Construire la requête avec le préfixe de plateforme
            let searchQuery = query;
            if (!isDirectLink && !query.startsWith('http')) {
                // Ajouter le préfixe de plateforme si ce n'est pas un lien direct
                searchQuery = `${platform}:${query}`;
            }

            console.log(`[SEARCH] Platform: ${platform}, Original Query: ${query}, Search Query: ${searchQuery}, DirectLink: ${isDirectLink}`);

            const resolve = await client.riffy.resolve({ query: searchQuery, requester: null });
            
            if (!resolve || !resolve.tracks) {
                console.log(`[SEARCH] No tracks found for query: ${query}`);
                return res.json({ tracks: [] });
            }

            console.log(`[SEARCH] Found ${resolve.tracks.length} tracks`);

            // Determine how many results to return based on platform and query type
            let maxResults = 20; // Default
            if (isDirectLink) {
                maxResults = resolve.tracks.length; // Return all for direct links
            } else if (query.includes('ytsearch50:') || query.includes('spsearch50:')) {
                maxResults = 50; // More results for enhanced searches
            } else if (query.includes('scsearch15:')) {
                maxResults = 15;
            }

            // Return enhanced results with better platform detection
            const tracks = resolve.tracks.slice(0, maxResults).map((track, index) => {
                // Enhanced platform detection
                let detectedPlatform = platform;
                let sourceName = 'Unknown';
                
                if (track.info.uri) {
                    if (track.info.uri.includes('youtube.com') || track.info.uri.includes('youtu.be')) {
                        detectedPlatform = 'YouTube';
                        sourceName = 'YouTube';
                    } else if (track.info.uri.includes('spotify.com')) {
                        detectedPlatform = 'Spotify';
                        sourceName = 'Spotify';
                    } else if (track.info.uri.includes('soundcloud.com')) {
                        detectedPlatform = 'SoundCloud';
                        sourceName = 'SoundCloud';
                    }
                } else {
                    // Fallback to query-based detection
                    if (query.includes('ytsearch')) sourceName = 'YouTube';
                    else if (query.includes('spsearch')) sourceName = 'Spotify';
                    else if (query.includes('scsearch')) sourceName = 'SoundCloud';
                }

                // Enhanced track info
                return {
                    title: track.info.title || `Track ${index + 1}`,
                    author: track.info.author || 'Unknown Artist',
                    uri: track.info.uri,
                    duration: track.info.length || 0,
                    thumbnail: track.info.artworkUrl || track.info.thumbnail || track.thumbnail || null,
                    encoded: track.encoded,
                    platform: detectedPlatform,
                    source: sourceName,
                    // Additional metadata for better sorting/display
                    isrc: track.info.isrc || null,
                    sourceName: track.info.sourceName || sourceName.toLowerCase(),
                    quality: isDirectLink ? 'direct' : 'search',
                    searchRank: index + 1
                };
            });

            console.log(`[SEARCH] Returning ${tracks.length} processed tracks`);
            res.json({ tracks });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    });

    app.post('/api/queue/:guildId/add', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { encoded, title, author, thumbnail, duration, uri, isPlaylist, isRadio, radioName } = req.body;
            
            // Récupérer l'utilisateur OAuth2 de la session
            const authenticatedUser = req.authenticatedUser || req.session?.user;
            const userId = authenticatedUser?.id;
            const userTag = authenticatedUser?.username || 'Dashboard User';
            const userDisplayName = authenticatedUser?.global_name || authenticatedUser?.username || 'Dashboard User';
            const userAvatar = authenticatedUser?.avatar 
                ? `https://cdn.discordapp.com/avatars/${userId}/${authenticatedUser.avatar}.png?size=256`
                : null;
            const userMention = userId ? `<@${userId}>` : 'Dashboard User';
            
            console.log(`[DASHBOARD] User adding track: ${userTag} (ID: ${userId || 'N/A'})`);
            console.log(`[DASHBOARD] User info - DisplayName: ${userDisplayName}, Avatar: ${userAvatar || 'No avatar'}`);
            
            let player = client.riffy.players.get(guildId);
            
            // If no player exists, create one
            if (!player) {
                console.log(`[DASHBOARD] No player exists for guild ${guildId}, attempting to create one`);
                const guild = client.guilds.cache.get(guildId);
                
                if (!guild) {
                    return res.status(404).json({ error: 'Guild not found' });
                }
                
                // Find the bot's voice channel or a suitable voice channel
                const botMember = guild.members.cache.get(client.user.id);
                let voiceChannel = botMember?.voice?.channel;
                
                // If bot is not in a voice channel, find one with members
                if (!voiceChannel) {
                    const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2 && ch.members.size > 0);
                    voiceChannel = voiceChannels.first();
                    
                    // If no voice channel with members, get the first available
                    if (!voiceChannel) {
                        const anyVoiceChannel = guild.channels.cache.filter(ch => ch.type === 2).first();
                        voiceChannel = anyVoiceChannel;
                    }
                }
                
                if (!voiceChannel) {
                    return res.status(400).json({ error: 'Aucun canal vocal trouvé. Veuillez d\'abord faire rejoindre le bot dans un canal vocal depuis Discord.' });
                }
                
                // Find a text channel for notifications
                const textChannel = guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(botMember).has('SendMessages'));
                
                console.log(`[DASHBOARD] Creating player in voice channel: ${voiceChannel.name}`);
                
                // Create the player
                player = client.riffy.create({
                    guild: guildId,
                    voiceChannel: voiceChannel.id,
                    textChannel: textChannel?.id || null,
                    deaf: true
                });
                
                // Connect to voice channel
                player.connect();
                console.log(`[DASHBOARD] Player created and connected to ${voiceChannel.name}`);
            }

            // Handle playlist addition
            if (isPlaylist && uri) {
                const resolve = await client.riffy.resolve({ 
                    query: uri, 
                    requester: { tag: userTag, id: userId } 
                });
                
                if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                    return res.status(400).json({ error: 'Could not resolve playlist' });
                }

                // Add all tracks from playlist
                for (const track of resolve.tracks) {
                    track.info.requester = { tag: userTag, displayName: userDisplayName, id: userId, avatar: userAvatar };
                    player.queue.add(track);
                }

                if (!player.playing && !player.paused) {
                    player.play();
                }

                // Simulate /play command for playlist by sending play-style embed
                if (player.textChannel) {
                    const channel = client.channels.cache.get(player.textChannel);
                    if (channel) {
                        const playlistEmbed = new EmbedBuilder()
                            .setColor("#6e0b14")
                            .setDescription(`\`➕\` | **[${resolve.playlistInfo?.name || 'Playlist'}](${uri})** • ${resolve.tracks.length} Track(s) • ${userDisplayName}`);
                        
                        await channel.send({ embeds: [playlistEmbed] });
                        console.log(`[DASHBOARD] Sent playlist play-style embed: ${resolve.tracks.length} tracks`);
                    }
                }

                // Emit update to connected clients
                io.to(`guild-${guildId}`).emit('queueUpdate', getGuildState(guildId));
                
                return res.json({ 
                    success: true, 
                    message: `Playlist ajoutée avec ${resolve.tracks.length} morceaux` 
                });
            }

            // Handle single track addition
            const resolveQuery = uri || `${title} ${author}`;
            const resolve = await client.riffy.resolve({ 
                query: resolveQuery, 
                requester: { tag: userTag, id: userId } 
            });
            
            if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                return res.status(400).json({ error: 'Could not resolve track' });
            }

            // Get the first track from the resolved results
            const track = resolve.tracks[0];
            track.info.requester = { tag: userTag, displayName: userDisplayName, id: userId, avatar: userAvatar };

            // Pour les radios, forcer l'utilisation du logo fourni
            if (isRadio && thumbnail) {
                track.info.thumbnail = thumbnail;
                track.info.artworkUrl = thumbnail;
                if (radioName) {
                    track.info.title = radioName;
                }
                console.log(`[DASHBOARD] Radio track with custom thumbnail: ${thumbnail}`);
            }

            player.queue.add(track);
            
            if (!player.playing && !player.paused) {
                player.play();
            }

            // Simulate /play command by sending play-style embed
            if (player.textChannel) {
                const channel = client.channels.cache.get(player.textChannel);
                if (channel) {
                    const playEmbed = new EmbedBuilder()
                        .setColor("#6e0b14")
                        .setDescription(`\`➕\` | **[${track.info.title}](${track.info.uri})** • ${userDisplayName}`);
                    
                    await channel.send({ embeds: [playEmbed] });
                    console.log(`[DASHBOARD] Sent play-style embed for: ${track.info.title}`);
                }
            }

            // Sauvegarder dans l'historique MongoDB
            const trackDuration = track.info.isStream ? "LIVE" : (track.info.length ? Math.floor(track.info.length / 1000 / 60) + ':' + String(Math.floor((track.info.length / 1000) % 60)).padStart(2, '0') : 'Unknown');
            const finalThumbnail = (isRadio && thumbnail) ? thumbnail : (track.info.thumbnail || track.info.artworkUrl);
            try {
                await MusicHistory.create({
                    GuildId: guildId,
                    trackTitle: track.info.title,
                    trackAuthor: track.info.author,
                    trackUri: track.info.uri,
                    trackThumbnail: finalThumbnail,
                    trackDuration: trackDuration,
                    addedBy: userId,
                    addedByUsername: userTag,
                    addedByDisplayName: userDisplayName,
                    addedByAvatar: userAvatar,
                    addedAt: new Date()
                });
                console.log(`[HISTORY] Saved track to history: ${track.info.title} by ${userTag}`);
                
                // Émettre un événement pour actualiser l'historique en temps réel
                io.to(`guild-${guildId}`).emit('historyUpdate');
            } catch (historyError) {
                console.error('[HISTORY] Error saving to history:', historyError);
            }

            // Also send detailed notification
            await notifyTrackAdded(client, guildId, track.info.title, track.info.author, trackDuration, finalThumbnail, track.info.uri, userId, userDisplayName, userAvatar);

            // Emit update to connected clients
            io.to(`guild-${guildId}`).emit('queueUpdate', getGuildState(guildId));
            
            res.json({ success: true, message: 'Track added to queue' });
        } catch (error) {
            console.error('Add to queue error:', error);
            res.status(500).json({ error: 'Failed to add track to queue' });
        }
    });

    app.post('/api/controls/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { action, value } = req.body;
            
            const player = client.riffy.players.get(guildId);
            if (!player) {
                return res.status(404).json({ error: 'No active player in this guild' });
            }

            switch (action) {
                case 'pause':
                    player.pause(true);
                    // Update Discord embed buttons
                    await updateDiscordButtons(player, true);
                    break;
                case 'resume':
                    player.pause(false);
                    // Update Discord embed buttons
                    await updateDiscordButtons(player, false);
                    break;
                case 'skip':
                    player.stop();
                    break;
                case 'stop':
                    player.stop();
                    player.queue.clear();
                    break;
                case 'volume':
                    if (value >= 0 && value <= 100) {
                        player.setVolume(value);
                    }
                    break;
                case 'loop':
                    player.setLoop(value);
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid action' });
            }

            // Emit update to connected clients
            io.to(`guild-${guildId}`).emit('stateUpdate', getGuildState(guildId));
            
            res.json({ success: true });
        } catch (error) {
            console.error('Control error:', error);
            res.status(500).json({ error: 'Control action failed' });
        }
    });

    app.post('/api/queue/:guildId/remove', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { index } = req.body;
            
            const player = client.riffy.players.get(guildId);
            if (!player) {
                return res.status(404).json({ error: 'No active player in this guild' });
            }

            if (index < 0 || index >= player.queue.length) {
                return res.status(400).json({ error: 'Invalid queue index' });
            }

            // Remove track from queue
            const removedTrack = player.queue.remove(index);
            
            // Emit update to connected clients
            io.to(`guild-${guildId}`).emit('queueUpdate', getGuildState(guildId));
            
            res.json({ 
                success: true, 
                message: 'Track removed from queue',
                removed: removedTrack?.info?.title || 'Unknown track'
            });
        } catch (error) {
            console.error('Remove from queue error:', error);
            res.status(500).json({ error: 'Failed to remove track from queue' });
        }
    });

    app.post('/api/queue/:guildId/move', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { fromIndex, toIndex } = req.body;
            
            const player = client.riffy.players.get(guildId);
            if (!player) {
                return res.status(404).json({ error: 'No active player in this guild' });
            }

            if (fromIndex < 0 || fromIndex >= player.queue.length || 
                toIndex < 0 || toIndex >= player.queue.length) {
                return res.status(400).json({ error: 'Invalid queue indices' });
            }

            if (fromIndex === toIndex) {
                return res.json({ success: true, message: 'No change needed' });
            }

            // Move track in queue using a simpler approach
            // Get all tracks as an array first
            const allTracks = [];
            while (player.queue.length > 0) {
                allTracks.push(player.queue.remove(0));
            }
            
            // Move the track in the array
            const trackToMove = allTracks[fromIndex];
            allTracks.splice(fromIndex, 1);  // Remove from current position
            allTracks.splice(toIndex, 0, trackToMove);  // Insert at new position
            
            // Add all tracks back to the queue in the new order
            allTracks.forEach(track => {
                player.queue.add(track);
            });
            
            // Emit update to connected clients
            io.to(`guild-${guildId}`).emit('queueUpdate', getGuildState(guildId));
            
            res.json({ 
                success: true, 
                message: 'Track moved in queue',
                track: trackToMove?.info?.title || 'Unknown track'
            });
        } catch (error) {
            console.error('Move track error:', error);
            res.status(500).json({ error: 'Failed to move track in queue' });
        }
    });

    // Socket.IO handling
    io.on('connection', (socket) => {
        console.log('Dashboard client connected');
        let currentGuildId = null;

        // Auto-authenticate all connections
        socket.emit('authenticated', true);
        console.log('Dashboard client auto-authenticated');

        socket.on('joinGuild', (guildId) => {
            console.log(`[SOCKET] Dashboard joining guild: ${guildId}`);
            
            // Leave previous room
            if (currentGuildId) {
                socket.leave(`guild-${currentGuildId}`);
                console.log(`[SOCKET] Left previous guild room: ${currentGuildId}`);
            }
            
            // Join new room
            currentGuildId = guildId;
            socket.join(`guild-${guildId}`);
            console.log(`[SOCKET] Joined guild room: ${guildId}`);
            
            // Send current state
            const state = getGuildState(guildId);
            console.log(`[SOCKET] Sending state to dashboard - hasPlayer: ${state?.hasPlayer || false}, current: ${state?.current?.info?.title || 'none'}`);
            socket.emit('stateUpdate', state);
            socket.emit('queueUpdate', state);
        });

        socket.on('disconnect', () => {
            console.log('Dashboard client disconnected');
            if (currentGuildId) {
                socket.leave(`guild-${currentGuildId}`);
            }
        });
    });

    // Wire up Riffy events to Socket.IO for real-time sync
    client.riffy.on('trackStart', (player, track) => {
        console.log(`[RIFFY] trackStart event - Guild: ${player.guildId}, Track: ${track?.info?.title || 'unknown'}`);
        const state = getGuildState(player.guildId);
        console.log(`[RIFFY] Emitting stateUpdate to guild-${player.guildId} - hasPlayer: ${state.hasPlayer}, current: ${state.current?.info?.title || 'none'}`);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
        io.to(`guild-${player.guildId}`).emit('queueUpdate', state);
    });

    client.riffy.on('trackEnd', (player, track) => {
        const state = getGuildState(player.guildId);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
        io.to(`guild-${player.guildId}`).emit('queueUpdate', state);
    });

    client.riffy.on('queueEnd', (player) => {
        const state = getGuildState(player.guildId);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
        io.to(`guild-${player.guildId}`).emit('queueUpdate', state);
    });

    client.riffy.on('playerCreate', (player) => {
        console.log(`[RIFFY] playerCreate event - Guild: ${player.guildId}`);
        const state = getGuildState(player.guildId);
        console.log(`[RIFFY] Emitting stateUpdate after playerCreate - hasPlayer: ${state.hasPlayer}`);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
        io.to(`guild-${player.guildId}`).emit('queueUpdate', state);
    });

    client.riffy.on('playerDestroy', (player) => {
        io.to(`guild-${player.guildId}`).emit('playerDestroyed');
    });

    // Additional Riffy events for better sync
    client.riffy.on('playerUpdate', (player, track) => {
        const state = getGuildState(player.guildId);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
    });

    client.riffy.on('trackStuck', (player, track) => {
        const state = getGuildState(player.guildId);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
    });

    client.riffy.on('trackError', (player, track) => {
        const state = getGuildState(player.guildId);
        io.to(`guild-${player.guildId}`).emit('stateUpdate', state);
    });

    // Send position updates every 250ms for smooth progress bar
    setInterval(() => {
        client.riffy.players.forEach((player) => {
            if (player.playing && !player.paused && player.current) {
                io.to(`guild-${player.guildId}`).emit('positionUpdate', {
                    position: player.position,
                    duration: player.current?.info?.length || 0,
                    playing: true,
                    paused: false
                });
            }
        });
    }, 250);

    // Restart bot endpoint
    app.post('/api/restart', authenticateToken, async (req, res) => {
        try {
            console.log('[DASHBOARD] Bot restart requested');
            
            // Send success response first
            res.json({ 
                success: true, 
                message: 'Bot restart initiated successfully' 
            });
            
            // Delay restart to allow response to be sent
            setTimeout(() => {
                console.log('[DASHBOARD] Restarting bot process...');
                process.exit(0); // Replit will automatically restart the process
            }, 1000);
            
        } catch (error) {
            console.error('[DASHBOARD] Restart error:', error);
            res.status(500).json({ error: 'Restart failed' });
        }
    });

    // ==================== USER SETTINGS API ====================
    
    // Get user settings
    app.get('/api/settings', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            let settings = await UserSettings.findOne({ userId });
            
            // Create default settings if they don't exist
            if (!settings) {
                settings = new UserSettings({
                    userId,
                    username: req.session.user.username
                });
                await settings.save();
                console.log(`[SETTINGS] Created default settings for user ${userId}`);
            }
            
            res.json({ settings });
        } catch (error) {
            console.error('[SETTINGS] Error fetching settings:', error);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    });

    // Update user settings
    app.post('/api/settings', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const updates = req.body;
            
            let settings = await UserSettings.findOne({ userId });
            
            if (!settings) {
                settings = new UserSettings({
                    userId,
                    username: req.session.user.username,
                    ...updates
                });
            } else {
                // Update only provided fields
                Object.keys(updates).forEach(key => {
                    if (settings.schema.paths[key]) {
                        settings[key] = updates[key];
                    }
                });
            }
            
            await settings.save();
            console.log(`[SETTINGS] Updated settings for user ${userId}`);
            
            res.json({ success: true, settings });
        } catch (error) {
            console.error('[SETTINGS] Error updating settings:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    });

    // ==================== USER PLAYLISTS API ====================
    
    // Get all playlists for a user
    app.get('/api/playlists', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const playlists = await UserPlaylists.find({ userId }).sort({ createdAt: -1 });
            
            res.json({ playlists });
        } catch (error) {
            console.error('[PLAYLISTS] Error fetching playlists:', error);
            res.status(500).json({ error: 'Failed to fetch playlists' });
        }
    });

    // Create a new playlist
    app.post('/api/playlists/create', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const { name, description } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'Playlist name is required' });
            }

            const playlist = new UserPlaylists({
                userId,
                name,
                description: description || '',
                tracks: []
            });
            
            await playlist.save();
            console.log(`[PLAYLISTS] Created new playlist "${name}" for user ${userId}`);
            
            res.json({ success: true, playlist });
        } catch (error) {
            console.error('[PLAYLISTS] Error creating playlist:', error);
            res.status(500).json({ error: 'Failed to create playlist' });
        }
    });

    // Add track to playlist
    app.post('/api/playlists/:playlistId/add-track', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const { playlistId } = req.params;
            const { title, author, uri, thumbnail, duration } = req.body;
            
            const playlist = await UserPlaylists.findOne({ _id: playlistId, userId });
            
            if (!playlist) {
                return res.status(404).json({ error: 'Playlist not found' });
            }

            playlist.tracks.push({
                title,
                author: author || 'Unknown Artist',
                uri,
                thumbnail,
                duration: duration || 'Unknown'
            });
            
            await playlist.save();
            console.log(`[PLAYLISTS] Added track "${title}" to playlist ${playlistId}`);
            
            res.json({ success: true, playlist });
        } catch (error) {
            console.error('[PLAYLISTS] Error adding track:', error);
            res.status(500).json({ error: 'Failed to add track' });
        }
    });

    // Remove track from playlist
    app.post('/api/playlists/:playlistId/remove-track', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const { playlistId } = req.params;
            const { trackIndex } = req.body;
            
            const playlist = await UserPlaylists.findOne({ _id: playlistId, userId });
            
            if (!playlist) {
                return res.status(404).json({ error: 'Playlist not found' });
            }

            if (trackIndex >= 0 && trackIndex < playlist.tracks.length) {
                playlist.tracks.splice(trackIndex, 1);
                await playlist.save();
                console.log(`[PLAYLISTS] Removed track at index ${trackIndex} from playlist ${playlistId}`);
            }
            
            res.json({ success: true, playlist });
        } catch (error) {
            console.error('[PLAYLISTS] Error removing track:', error);
            res.status(500).json({ error: 'Failed to remove track' });
        }
    });

    // Delete playlist
    app.delete('/api/playlists/:playlistId', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const { playlistId } = req.params;
            
            const result = await UserPlaylists.deleteOne({ _id: playlistId, userId });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Playlist not found' });
            }

            console.log(`[PLAYLISTS] Deleted playlist ${playlistId}`);
            res.json({ success: true });
        } catch (error) {
            console.error('[PLAYLISTS] Error deleting playlist:', error);
            res.status(500).json({ error: 'Failed to delete playlist' });
        }
    });

    // ==================== USER FAVORITES API ====================
    
    // Get all favorites for a user
    app.get('/api/favorites', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const favorites = await UserFavorites.find({ userId }).sort({ addedAt: -1 });
            
            res.json({ favorites });
        } catch (error) {
            console.error('[FAVORITES] Error fetching favorites:', error);
            res.status(500).json({ error: 'Failed to fetch favorites' });
        }
    });

    // Add track to favorites
    app.post('/api/favorites/add', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const { trackTitle, trackAuthor, trackUri, trackThumbnail, trackDuration } = req.body;
            
            // Check if already in favorites
            const existing = await UserFavorites.findOne({ userId, trackUri });
            if (existing) {
                return res.status(400).json({ error: 'Track already in favorites' });
            }

            const favorite = new UserFavorites({
                userId,
                trackTitle,
                trackAuthor: trackAuthor || 'Unknown Artist',
                trackUri,
                trackThumbnail,
                trackDuration: trackDuration || 'Unknown'
            });
            
            await favorite.save();
            console.log(`[FAVORITES] Added "${trackTitle}" to favorites for user ${userId}`);
            
            res.json({ success: true, favorite });
        } catch (error) {
            console.error('[FAVORITES] Error adding favorite:', error);
            res.status(500).json({ error: 'Failed to add favorite' });
        }
    });

    // Remove track from favorites
    app.post('/api/favorites/remove', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const { trackUri } = req.body;
            
            const result = await UserFavorites.deleteOne({ userId, trackUri });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Favorite not found' });
            }

            console.log(`[FAVORITES] Removed favorite for user ${userId}`);
            res.json({ success: true });
        } catch (error) {
            console.error('[FAVORITES] Error removing favorite:', error);
            res.status(500).json({ error: 'Failed to remove favorite' });
        }
    });

    // Check if track is in favorites
    app.get('/api/favorites/check/:trackUri', authenticateToken, async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const userId = req.session.user.id;
            const trackUri = decodeURIComponent(req.params.trackUri);
            
            const favorite = await UserFavorites.findOne({ userId, trackUri });
            
            res.json({ isFavorite: !!favorite });
        } catch (error) {
            console.error('[FAVORITES] Error checking favorite:', error);
            res.status(500).json({ error: 'Failed to check favorite' });
        }
    });

    // ==================== STATISTICS API ====================
    
    // Get top tracks (from history)
    app.get('/api/stats/top-tracks/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            
            // Aggregate track play counts from history by guild
            const topTracks = await MusicHistory.aggregate([
                { $match: { GuildId: guildId } },
                {
                    $group: {
                        _id: '$trackUri',
                        title: { $first: '$trackTitle' },
                        author: { $first: '$trackAuthor' },
                        thumbnail: { $first: '$trackThumbnail' },
                        duration: { $first: '$trackDuration' },
                        playCount: { $sum: 1 },
                        lastPlayed: { $max: '$addedAt' }
                    }
                },
                { $sort: { playCount: -1 } },
                { $limit: limit }
            ]);
            
            res.json({ topTracks });
        } catch (error) {
            console.error('[STATS] Error fetching top tracks:', error);
            res.status(500).json({ error: 'Failed to fetch top tracks' });
        }
    });

    // Get top artists (from history)
    app.get('/api/stats/top-artists/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            
            const topArtists = await MusicHistory.aggregate([
                { $match: { GuildId: guildId } },
                {
                    $group: {
                        _id: '$trackAuthor',
                        playCount: { $sum: 1 },
                        lastPlayed: { $max: '$addedAt' }
                    }
                },
                { $sort: { playCount: -1 } },
                { $limit: limit }
            ]);
            
            res.json({ topArtists });
        } catch (error) {
            console.error('[STATS] Error fetching top artists:', error);
            res.status(500).json({ error: 'Failed to fetch top artists' });
        }
    });

    // Get listening statistics
    app.get('/api/stats/listening-time/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            
            // Get total tracks played in this guild
            const totalTracks = await MusicHistory.countDocuments({ GuildId: guildId });
            
            // Get tracks per day for last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const dailyStats = await MusicHistory.aggregate([
                { 
                    $match: { 
                        GuildId: guildId,
                        addedAt: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$addedAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            
            res.json({ 
                totalTracks,
                dailyStats
            });
        } catch (error) {
            console.error('[STATS] Error fetching listening stats:', error);
            res.status(500).json({ error: 'Failed to fetch listening stats' });
        }
    });

    // Join voice channel endpoint
    app.post('/api/join/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { voiceChannelId } = req.body;
            
            // Check if bot is already in a voice channel in this guild
            const existingPlayer = client.riffy.players.get(guildId);
            if (existingPlayer) {
                return res.status(400).json({ 
                    error: 'ZG Music est dejà connecté à un salon vocal',
                });
            }

            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Guild not found' });
            }

            let channelId = voiceChannelId;
            
            // If no specific channel provided, find voice channel with most members
            if (!channelId) {
                const voiceChannels = guild.channels.cache.filter(
                    channel => channel.type === 2 && channel.members.size > 0 // Voice channels with members
                );
                
                if (voiceChannels.size === 0) {
                    // Try first voice channel even if empty
                    const anyVoiceChannel = guild.channels.cache.find(channel => channel.type === 2);
                    if (!anyVoiceChannel) {
                        return res.status(404).json({ error: 'Aucun canal vocal trouvé sur ce serveur' });
                    }
                    channelId = anyVoiceChannel.id;
                } else {
                    // Find voice channel with most members
                    const mostPopulatedChannel = voiceChannels.reduce((prev, current) => {
                        return (prev.members.size > current.members.size) ? prev : current;
                    });
                    channelId = mostPopulatedChannel.id;
                }
            }

            // Find the best text channel for player updates
            const selectedVoiceChannel = guild.channels.cache.get(channelId);
            let textChannel = null;
            
            // Priority 1: Text channel in the same category as the voice channel
            if (selectedVoiceChannel && selectedVoiceChannel.parentId) {
                textChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && channel.parentId === selectedVoiceChannel.parentId
                );
            }
            
            // Priority 2: Text channel with similar name to voice channel
            if (!textChannel && selectedVoiceChannel) {
                const voiceName = selectedVoiceChannel.name.toLowerCase();
                textChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && (
                        channel.name.toLowerCase().includes(voiceName) ||
                        voiceName.includes(channel.name.toLowerCase())
                    )
                );
            }
            
            // Priority 3: Text channel with 'music' in the name
            if (!textChannel) {
                textChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && channel.name.toLowerCase().includes('music')
                );
            }
            
            // Priority 4: Text channel with 'général', 'general' or 'bot' in name
            if (!textChannel) {
                textChannel = guild.channels.cache.find(
                    channel => channel.type === 0 && (
                        channel.name.toLowerCase().includes('général') ||
                        channel.name.toLowerCase().includes('general') ||
                        channel.name.toLowerCase().includes('bot')
                    )
                );
            }
            
            // Priority 5: First available text channel
            if (!textChannel) {
                textChannel = guild.channels.cache.find(channel => channel.type === 0);
            }

            // Create riffy connection
            await client.riffy.createConnection({
                defaultVolume: 50,
                guildId: guildId,
                voiceChannel: channelId,
                textChannel: textChannel?.id,
                deaf: true
            });

            // Send join confirmation embed to text channel
            if (textChannel) {
                const joinEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: `Connexion depuis le Dashboard`,
                        iconURL: "https://cdn.discordapp.com/attachments/1391089229177557187/1418991076198580304/icons8-dashboard-100.png",
                    })
                    .setColor("#6e0b14")
                    .setTitle("🎵 ZG Music connecté !")
                    .setDescription(`J'ai rejoint le canal vocal **${selectedVoiceChannel?.name || 'vocal'}** depuis le dashboard web !`)
                    .addFields(
                        {
                            name: "<:voice:1419035000000000000>Canal vocal :",
                            value: `${selectedVoiceChannel?.name || 'Unknown'}`,
                            inline: true,
                        },
                        {
                            name: "<:members:1419035000000000001>Membres :",
                            value: `${selectedVoiceChannel?.members?.size || 0} connectés`,
                            inline: true,
                        },
                        {
                            name: "<:dashboard:1418991076198580304>Source :",
                            value: `Dashboard Web`,
                            inline: true,
                        },
                    )
                    .setFooter({
                        text: ` Prêt pour la musique ! | by Akira avec ❤️`,
                        iconURL: "https://cdn.discordapp.com/attachments/1391089229177557187/1418928476823752816/icons8-add-to-list-64.png?ex=68cfe79f&is=68ce961f&hm=f273ffee07cd1c12407e1799d6e8aa5418c520bcd722dd50d178a9c2bc35cf09&",
                    })
                    .setImage("https://cdn.discordapp.com/attachments/1391089229177557187/1419063863508340756/standard_5.gif?ex=68d065b5&is=68cf1435&hm=66853e25004a1363f1d3e821825b27c0a677e4013877eceea006fd4d80b0bc0c&")
                    .setTimestamp();

                await textChannel.send({ embeds: [joinEmbed] });
                console.log(`[DASHBOARD] Sent join confirmation to ${textChannel.name}`);
            }

            res.json({ 
                success: true, 
                message: `Bot connecté au canal vocal: ${selectedVoiceChannel?.name || channelId}`,
                voiceChannel: {
                    id: channelId,
                    name: selectedVoiceChannel?.name || 'Unknown'
                },
                textChannel: {
                    id: textChannel?.id,
                    name: textChannel?.name || 'Unknown'
                }
            });
            
        } catch (error) {
            console.error('Join voice channel error:', error);
            res.status(500).json({ error: 'Échec de la connexion au canal vocal' });
        }
    });

    // Get available voice channels endpoint
    app.get('/api/voice-channels/:guildId', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ error: 'Guild not found' });
            }

            const voiceChannels = guild.channels.cache
                .filter(channel => channel.type === 2) // Voice channels
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    memberCount: channel.members?.size || 0
                }));

            res.json({ voiceChannels });
            
        } catch (error) {
            console.error('Get voice channels error:', error);
            res.status(500).json({ error: 'Failed to get voice channels' });
        }
    });

    // Get SoundCloud Playlist - Top 100 Music Videos France
    app.get('/api/youtube-trending', authenticateToken, async (req, res) => {
        try {
            console.log('[SOUNDCLOUD PLAYLIST] Fetching Top 100 Music Videos France from SoundCloud...');
            
            // URL de la playlist SoundCloud
            const playlistUrl = 'https://soundcloud.com/scandium-playlist/sets/top-100-music-videos-france';
            
            // Récupérer les informations de la playlist
            const playlistInfo = await scdl.getSetInfo(playlistUrl);
            
            if (!playlistInfo || !playlistInfo.tracks || playlistInfo.tracks.length === 0) {
                throw new Error('Unable to fetch SoundCloud playlist');
            }
            
            // Extraire et formater les 20 premières tracks
            const tracks = playlistInfo.tracks.slice(0, 20).map((track, index) => {
                const durationMs = track.duration || 0;
                
                return {
                    title: track.title || 'Unknown Title',
                    author: track.user?.username || 'Unknown Artist',
                    uri: track.permalink_url,
                    thumbnail: track.artwork_url?.replace('-large', '-t500x500') || track.user?.avatar_url || null,
                    duration: durationMs,
                    platform: 'soundcloud',
                    rank: index + 1
                };
            });
            
            console.log(`[SOUNDCLOUD PLAYLIST] Successfully fetched ${tracks.length} tracks from playlist`);
            res.json({ tracks });
            
        } catch (error) {
            console.error('[SOUNDCLOUD PLAYLIST] Error:', error);
            res.status(500).json({ error: 'Failed to fetch SoundCloud playlist', message: error.message });
        }
    });

    // Get Spotify Top 10 Global endpoint (kept for compatibility)
    app.get('/api/spotify-top-10', authenticateToken, async (req, res) => {
        try {
            console.log('[SPOTIFY TOP 10] Fetching top 10 global tracks from Spotify...');
            
            // Rechercher les chansons populaires du moment
            // On utilise une recherche pour "top hits 2025" pour récupérer les musiques tendances
            const searchResults = await client.spotify.searchTracks('top hits 2025', { limit: 10 });
            
            if (!searchResults || !searchResults.body || !searchResults.body.tracks || !searchResults.body.tracks.items) {
                throw new Error('Unable to fetch Spotify top tracks');
            }
            
            // Extraire les 10 premières chansons
            const tracks = searchResults.body.tracks.items.map((track, index) => {
                return {
                    title: track.name,
                    author: track.artists.map(artist => artist.name).join(', '),
                    uri: track.external_urls.spotify,
                    thumbnail: track.album.images[0]?.url || null,
                    duration: track.duration_ms,
                    platform: 'spotify',
                    rank: index + 1
                };
            });
            
            console.log(`[SPOTIFY TOP 10] Successfully fetched ${tracks.length} tracks`);
            res.json({ tracks });
            
        } catch (error) {
            console.error('[SPOTIFY TOP 10] Error:', error);
            res.status(500).json({ error: 'Failed to fetch Spotify top 10', message: error.message });
        }
    });

    // Clear queue endpoint
    app.post('/api/queue/:guildId/clear', authenticateToken, async (req, res) => {
        try {
            const { guildId } = req.params;
            
            const player = client.riffy.players.get(guildId);
            if (!player) {
                return res.status(404).json({ error: 'No active player in this guild' });
            }

            // Stop current track and clear queue
            player.stop();
            player.queue.clear();
            
            // Emit update to connected clients
            io.to(`guild-${guildId}`).emit('queueUpdate', getGuildState(guildId));
            io.to(`guild-${guildId}`).emit('stateUpdate', getGuildState(guildId));
            
            res.json({ 
                success: true, 
                message: 'Queue cleared successfully' 
            });
        } catch (error) {
            console.error('Clear queue error:', error);
            res.status(500).json({ error: 'Failed to clear queue' });
        }
    });

    // Start server
    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
        console.log(`🌐 Dashboard server running on port ${port}`);
    });

    return server;
}

module.exports = createWebServer;