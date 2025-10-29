const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { logger } = require("../../utils/logger");
const config = require("../../config");
const MusicHistory = require("../../schemas/MusicHistory");

// Helper function to normalize avatar URL
function normalizeAvatarUrl(avatarUrl) {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `https://cdn.discordapp.com${avatarUrl}`;
}

// Helper function to save track to history
async function saveToHistory(guildId, track, requester) {
    try {
        const trackDuration = track.info.isStream ? "LIVE" : 
            (track.info.length ? Math.floor(track.info.length / 1000 / 60) + ':' + String(Math.floor((track.info.length / 1000) % 60)).padStart(2, '0') : 'Unknown');
        
        const userAvatar = normalizeAvatarUrl(requester.displayAvatarURL?.() || requester.avatar);
        
        await MusicHistory.create({
            GuildId: guildId,
            trackTitle: track.info.title || "Unknown Title",
            trackAuthor: track.info.author || "Unknown Artist",
            trackUri: track.info.uri || null,
            trackThumbnail: track.info.artworkUrl || track.info.thumbnail || null,
            trackDuration: trackDuration,
            addedBy: requester.id || requester.user?.id,
            addedByUsername: requester.user?.tag || requester.tag || "Discord User",
            addedByDisplayName: requester.displayName || requester.user?.displayName || requester.user?.username || "Discord User",
            addedByAvatar: userAvatar,
            addedAt: new Date()
        });
        
        logger(`[HISTORY] Saved track to history: ${track.info.title} by ${requester.user?.tag || requester.tag}`);
    } catch (error) {
        logger(`[HISTORY ERROR] Failed to save track to history: ${error.message}`);
    }
}


module.exports = {
        data: new SlashCommandBuilder()
                .setName("play")
                .setDescription("Play a track/playlist")
                .setDMPermission(false)
                .addStringOption(option => 
                        option.setName("query")
                        .setDescription("The song name/url")
                        .setAutocomplete(true)
                        .setRequired(true)
                ),

        run: async ({ interaction, client }) => {
                if (!interaction.guild.members.me.permissionsIn(interaction.channel).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
                        return interaction.reply({ content: "\`❌\` | Bot can\'t access the channel your currently in\n\`⚠️\` | Please check Bot\`s permission on this server", ephemeral: true })
                }
                if (!interaction.guild.members.me.permissionsIn(interaction.member.voice.channel.id).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])) {
                        return interaction.reply({ content: "\`❌\` | Bot can\'t connect to the voice channel your currently in\n\`⚠️\` | Please check Bot\`s permission on this server", ephemeral: true })
                }

                await interaction.deferReply();

                const embed = new EmbedBuilder().setColor("#6e0b14");

                const query = interaction.options.getString("query");
                
                let player = client.riffy.players.get(interaction.guildId);
                
                if (!player) {
                        player = client.riffy.createConnection({
                                defaultVolume: 50,
                                guildId: interaction.guildId,
                                voiceChannel: interaction.member.voice.channelId,
                                textChannel: interaction.channelId,
                                deaf: true
                        });
                }

                const resolve = await client.riffy.resolve({ query: query, requester: interaction.member });
                const { loadType, tracks, playlistInfo } = resolve;

                if (loadType === "playlist") {
                        for (const track of resolve.tracks) {
                                track.info.requester = interaction.member;
                                player.queue.add(track);
                                
                                // Save each track to history
                                await saveToHistory(interaction.guildId, track, interaction.member);
                        }

                        // Emit queue update to dashboard
                        if (client.dashboardIO) {
                                const getGuildState = () => ({
                                        guildId: interaction.guildId,
                                        current: player.current || null,
                                        queue: player.queue || [],
                                        volume: player.volume || 100,
                                        paused: player.paused || false,
                                        loop: player.loop || 'none',
                                        autoplay: player.autoplay || false,
                                        position: player.position || 0,
                                        textChannelId: player.textChannel || null,
                                        voiceChannelId: player.voiceChannel || null,
                                        connected: player.connected || false
                                });
                                client.dashboardIO.to(`guild-${interaction.guildId}`).emit('queueUpdate', getGuildState());
                        }

                        await interaction.editReply({ embeds: [embed.setDescription(`\`➕\` | **[${playlistInfo.name}](${query})** • ${tracks.length} Track(s) • ${interaction.member}`)] });
                        if (!player.playing && !player.paused) return player.play();

                } else if (loadType === "search" || loadType === "track") {
                        const track = tracks.shift();
                                
                        track.info.requester = interaction.member;
                        player.queue.add(track);
                        
                        // Save track to history
                        await saveToHistory(interaction.guildId, track, interaction.member);

                        // Emit queue update to dashboard
                        if (client.dashboardIO) {
                                const getGuildState = () => ({
                                        guildId: interaction.guildId,
                                        current: player.current || null,
                                        queue: player.queue || [],
                                        volume: player.volume || 100,
                                        paused: player.paused || false,
                                        loop: player.loop || 'none',
                                        autoplay: player.autoplay || false,
                                        position: player.position || 0,
                                        textChannelId: player.textChannel || null,
                                        voiceChannelId: player.voiceChannel || null,
                                        connected: player.connected || false
                                });
                                client.dashboardIO.to(`guild-${interaction.guildId}`).emit('queueUpdate', getGuildState());
                        }

                        await interaction.editReply({ embeds: [embed.setDescription(`\`➕\` | **[${track.info.title}](${track.info.uri})** • ${interaction.member}`)] });
                        if (!player.playing && !player.paused) return player.play();

                } else {
                        return interaction.editReply({ embeds: [embed.setDescription("\`❌\` | There were no results found for your query.")] });
                }
        },

        autocomplete: async ({ interaction, client }) => {
                const focusedValue = interaction.options.getFocused();
                if (focusedValue.length <= 2) return;

                let spotifyChoices = [];
                try {
                        const spotifyResults = await client.spotify.searchTracks(focusedValue, { limit: 15 });
                        spotifyChoices = spotifyResults.body.tracks.items.map(track => ({
                                name: `${track.name} - ${track.artists.map(artist => artist.name).join(', ')}`,
                                value: track.external_urls.spotify
                        }));
                        
                } catch (err) {
                        logger(`Error fetching Spotify results: ${err}`);
                }

                return interaction.respond(spotifyChoices.slice(0, 15)).catch(() => {});

                /** 
                 * I've switched the autocomplete result from youtube-sr to spotify-web-api-node
                 * You can still use this if you want

                const yt = require("youtube-sr").default;
                
                const focusedValue = interaction.options.getFocused();
        
                if (/^(http|https):\/\//.test(focusedValue.toLocaleLowerCase())) {
                        return interaction.respond([{ name: "URL", value: focusedValue }]);
                  }
                const random = "ytsearch"[Math.floor(Math.random() * "ytsearch".length)];
                const results = await yt.search(focusedValue || random, { safeSearch: false, limit: 15 });
        
                const choices = [];
                for (const video of results) {
                        choices.push({ name: video.title, value: video.url });
                }
        
                const filteredChoices = choices.filter((m) =>
                        m.name.toLocaleLowerCase().includes(focusedValue.toLocaleLowerCase())
                );
        
                const result = filteredChoices.map((choice) =>{
                        return {
                                name: choice.name,
                                value: choice.value
                        }
                });
                interaction.respond(result.slice(0, 15)).catch(() => {});
                */
        },
        options: {
                inVoice: true,
                sameVoice: true,
        }
};