const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require("discord.js");
const { default_color, custom_emoji_id } = require("../../../config");
const formatDuration = require("../../../utils/formatDuration");
const capital = require("node-capitalize");
const client = require("../../../Aria");

client.riffy.on("trackStart", async (player, track) => {
    const bPause = new ButtonBuilder()
        .setCustomId("pause")
        .setEmoji("1418956176628121600")
        .setStyle(ButtonStyle.Secondary);
    const bReplay = new ButtonBuilder()
        .setCustomId("replay")
        .setEmoji("1418989816917266583")
        .setStyle(ButtonStyle.Secondary);
    const bSkip = new ButtonBuilder()
        .setCustomId("skip")
        .setEmoji("1418953635546660914")
        .setStyle(ButtonStyle.Secondary);
    const bVDown = new ButtonBuilder()
        .setCustomId("voldown")
        .setEmoji("1418984038324113499")
        .setStyle(ButtonStyle.Secondary);
    const bStop = new ButtonBuilder()
        .setCustomId("stop")
        .setEmoji("1418958064479899780")
        .setStyle(ButtonStyle.Danger);
    const bVUp = new ButtonBuilder()
        .setCustomId("volup")
        .setEmoji("1418984343916773477")
        .setStyle(ButtonStyle.Secondary);

    let bAuto = new ButtonBuilder()
        .setCustomId("autoplay")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("1418984681331884062");
    if (player.isAutoplay)
        bAuto = new ButtonBuilder()
            .setCustomId("autoplay")
            .setEmoji("1418984681331884062")
            .setStyle(ButtonStyle.Secondary);

    let bLoop = new ButtonBuilder()
        .setCustomId("loop")
        .setEmoji("1418955631842300014")
        .setStyle(ButtonStyle.Secondary);
    if (player.loop === "track")
        bLoop = new ButtonBuilder()
            .setCustomId("loop")
            .setEmoji("1418955631842300014")
            .setStyle(ButtonStyle.Success);
    if (player.loop === "queue")
        bLoop = new ButtonBuilder()
            .setCustomId("loop")
            .setEmoji("1418955631842300014")
            .setStyle(ButtonStyle.Primary);

    // Nouveaux boutons Dashboard et Lyrics
    const bDashboard = new ButtonBuilder()
        .setCustomId("dashboard")
        .setEmoji("1418991076198580304")
        .setStyle(ButtonStyle.Secondary);

    const bLyrics = new ButtonBuilder()
        .setCustomId("lyrics")
        .setEmoji("1418986055604109443")
        .setStyle(ButtonStyle.Secondary);

    const startrow1 = new ActionRowBuilder().addComponents(
        bPause,
        bReplay,
        bSkip,
        bLoop,
        bDashboard,
    );
    const startrow2 = new ActionRowBuilder().addComponents(
        bStop,
        bVDown,
        bVUp,
        bAuto,
        bLyrics,
    );

    const channel = client.channels.cache.get(player.textChannel);
    const trackDuration = track.info.isStream
        ? "LIVE"
        : formatDuration(track.info.length);
    const trackAuthor = track.info.author || "Artiste inconnu";
    const trackTitle = track.info.title || "Titre inconnu";
    const trackThumbnail = track.info.thumbnail
        ? track.info.thumbnail
        : client.user.displayAvatarURL;

    // Détecter la plateforme d'origine
    let platformEmoji = '';
    let platformName = '';
    const uri = track.info.uri || '';
    const sourceName = track.info.sourceName || '';
    
    if (uri.includes('youtube') || sourceName.toLowerCase().includes('youtube')) {
        platformEmoji = '🎥';
        platformName = 'YouTube';
    } else if (uri.includes('spotify') || sourceName.toLowerCase().includes('spotify')) {
        platformEmoji = '🎵';
        platformName = 'Spotify';
    } else if (uri.includes('soundcloud') || sourceName.toLowerCase().includes('soundcloud')) {
        platformEmoji = '☁️';
        platformName = 'SoundCloud';
    } else {
        platformEmoji = '🎶';
        platformName = 'Musique';
    }

    // Récupérer les informations du requester
    const requester = track.info.requester;
    let requesterName = 'Utilisateur Discord';
    let requesterAvatar = "https://cdn.pixabay.com/animation/2023/12/21/01/38/01-38-37-823_512.gif";
    
    if (requester) {
        if (typeof requester === 'string') {
            // Si c'est juste une string, l'utiliser comme nom
            requesterName = requester;
        } else if (typeof requester === 'object') {
            // Extraire le nom
            requesterName = requester.displayName || requester.tag || requester.username || 'Utilisateur Discord';
            
            // Priorité 1: Avatar URL déjà fourni (depuis le dashboard ou normalisé)
            if (requester.avatar && requester.avatar.startsWith('http')) {
                requesterAvatar = requester.avatar;
            }
            // Priorité 2: User/GuildMember Discord avec displayAvatarURL
            else if (requester.displayAvatarURL) {
                requesterAvatar = requester.displayAvatarURL({ size: 512 });
            }
            // Sinon: garder le fallback par défaut
        }
    }

    const startembed = new EmbedBuilder()
        .setAuthor({
            name: requesterName,
            iconURL: requesterAvatar,
        })
        .setColor("#6e0b14")
        .setTitle(trackTitle)
        .setThumbnail(trackThumbnail)
        .setURL(track.info.uri)
        .addFields(
            {
                name: "<:microdphone2:1419029652596330668> Artiste",
                value: `${trackAuthor}`,
                inline: true,
            },
            {
                name: "<:xs:1419030455449157856> Durée",
                value: `\`${trackDuration}\``,
                inline: true,
            },
            {
                name: `${platformEmoji} Plateforme`,
                value: `${platformName}`,
                inline: true,
            },
        )
        .setFooter({
            text: ` Playlist: ${player.queue.length} sons en attente | by Akira avec ❤️`,
            iconURL:
                "https://cdn.discordapp.com/attachments/1391089229177557187/1418928476823752816/icons8-add-to-list-64.png?ex=68cfe79f&is=68ce961f&hm=f273ffee07cd1c12407e1799d6e8aa5418c520bcd722dd50d178a9c2bc35cf09&",
        })
        .setImage(
            "https://cdn.discordapp.com/attachments/1391089229177557187/1418922126601097276/standard_4.gif?ex=68cfe1b5&is=68ce9035&hm=caac80ed5361674b3bf5800eeb4d70a2ad10f456ec57e29f8069e63b4f723857&",
        );

    const msg = await channel
        .send({ embeds: [startembed], components: [startrow1, startrow2] })
        .then((x) => (player.message = x));

    const filter = (message) => {
        if (
            message.guild.members.me.voice.channel &&
            message.guild.members.me.voice.channelId ===
                message.member.voice.channelId
        )
            return true;
        else {
            message.reply({
                content: `\`❌\` | You must be on the same voice channel as mine to use this button.`,
                ephemeral: true,
            });
        }
    };

    const collector = msg.createMessageComponentCollector({
        filter,
        time: track.info.length * 15,
    });

    collector.on("collect", async (message) => {
        if (message.customId === "loop") {
            if (!player) {
                collector.stop();
            } else if (player.loop === "none") {
                await player.setLoop("track");

                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`✔️\` | Mode boucle réglé sur : \`${player.loop}\``,
                    )
                    .setColor("#6e0b14");

                message.reply({ embeds: [embed], ephemeral: true });

                bLoop = new ButtonBuilder()
                    .setCustomId("loop")
                    .setEmoji("1276835185849143367")
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

                return msg.edit({
                    components: [row1, row2],
                });
            } else if (player.loop === "track") {
                await player.setLoop("queue");

                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`✔️\` | Mode boucle réglé sur : \`${player.loop}\``,
                    )
                    .setColor("#6e0b14");

                message.reply({ embeds: [embed], ephemeral: true });

                bLoop = new ButtonBuilder()
                    .setCustomId("loop")
                    .setEmoji("1276835185849143367")
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

                return msg.edit({
                    components: [row1, row2],
                });
            } else if (player.loop === "queue") {
                await player.setLoop("none");
                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`✔️\` | Mode boucle réglé sur : \`${player.loop}\``,
                    )
                    .setColor("#6e0b14");
                message.reply({ embeds: [embed], ephemeral: true });

                bLoop = new ButtonBuilder()
                    .setCustomId("loop")
                    .setEmoji("1276835185849143367")
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

                return msg.edit({
                    components: [row1, row2],
                });
            }
        } else if (message.customId === "replay") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else {
                await player.seek(0);
                const embed = new EmbedBuilder()
                    .setDescription(
                        "\`✔️\` | Ok chef, je rejoue le morceau ! 🔁",
                    )
                    .setColor("#6e0b14");
                return message.reply({
                    embeds: [embed],
                    ephemeral: false,
                });
            }
        } else if (message.customId === "stop") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else {
                player.destroy();
                if (player.message) await player.message.delete();
            }
        } else if (message.customId === "pause") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else if (!player.paused) {
                message.deferUpdate();

                await player.pause(true);

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("pause")
                        .setEmoji("1419004426991042602") // MÊME emoji que celui du début
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("replay")
                        .setEmoji("1418989816917266583") // MÊME emoji que celui du début
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("skip")
                        .setEmoji("1418953635546660914") // MÊME emoji que celui du début
                        .setStyle(ButtonStyle.Secondary),
                    bLoop,
                    bDashboard,
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("stop")
                        .setEmoji("1418958064479899780") // MÊME emoji que celui du début
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("voldown")
                        .setEmoji("1418984038324113499") // MÊME emoji que celui du début
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("volup")
                        .setEmoji("1418984343916773477") // MÊME emoji que celui du début
                        .setStyle(ButtonStyle.Secondary),
                    bAuto,
                    bLyrics,
                );

                return msg.edit({
                    components: [row1, row2],
                });
            } else if (player.paused) {
                message.deferUpdate();

                await player.pause(false);
                return msg.edit({
                    components: [startrow1, startrow2],
                });
            }
        } else if (message.customId === "skip") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else if (!player || player.queue.length == 0) {
                const embed = new EmbedBuilder()
                    .setDescription(`\`❌\` | Playlist est : \`Vide\``)
                    .setColor("#6e0b14");

                return message.reply({ embeds: [embed], ephemeral: true });
            } else {
                await player.stop();
            }
        } else if (message.customId === "voldown") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else if (player.volume < 20) {
                await player.setVolume(10);

                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`❌\` | Volume can't be lower than: \`10%\``,
                    )
                    .setColor("#6e0b14");

                return message.reply({
                    embeds: [embed],
                    ephemeral: true,
                });
            } else {
                await player.setVolume(player.volume - 10);

                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `\`✔️\` | Ok Arhy,  **on diminue le son à :** \`${player.volume}%\``,
                            )
                            .setColor("#6e0b14"),
                    ],
                    ephemeral: true,
                });
            }
        } else if (message.customId === "volup") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else if (player.volume > 140) {
                await player.setVolume(150);

                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`❌\` | Volume can't be higher than: \`150%\``,
                    )
                    .setColor("#6e0b14");

                return message.reply({
                    embeds: [embed],
                    ephemeral: true,
                });
            } else {
                await player.setVolume(player.volume + 10);

                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(
                                `\`✔️\` | Ok Arhy, **on augmente le son à :** \`${player.volume}%\``,
                            )
                            .setColor("#6e0b14"),
                    ],
                    ephemeral: true,
                });
            }
        } else if (message.customId === "autoplay") {
            if (!player) {
                message.reply({
                    content: `\`❌\` | The player doesn't exist`,
                    ephemeral: true,
                });
                collector.stop();
            } else if (!player.isAutoplay) {
                player.isAutoplay = true;

                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`♾\` |  La lecture automatique est maintenant \`activée\``,
                    )
                    .setColor("#6e0b14");

                bAuto = new ButtonBuilder()
                    .setCustomId("autoplay")
                    .setEmoji("1418984681331884062")
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

                await message.reply({
                    embeds: [embed],
                    ephemeral: true,
                });

                return msg.edit({
                    components: [row1, row2],
                });
            } else {
                player.isAutoplay = false;

                const embed = new EmbedBuilder()
                    .setDescription(
                        `\`♾\` |   La lecture automatique est maintenant \`desactivée\``,
                    )
                    .setColor("#6e0b14");

                bAuto = new ButtonBuilder()
                    .setCustomId("autoplay")
                    .setEmoji("1418984681331884062")
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

                await message.reply({
                    embeds: [embed],
                    ephemeral: true,
                });

                return msg.edit({
                    components: [row1, row2],
                });
            }
        } else if (message.customId === "dashboard") {
            // Handler pour le bouton Dashboard
            const dashboardUrl = process.env.REPLIT_DEV_DOMAIN
                ? `https://${process.env.REPLIT_DEV_DOMAIN}`
                : "http://localhost:5000";

            const embed = new EmbedBuilder()
                .setTitle("🏠 Dashboard ZG MUSIC")
                .setDescription(
                    `[Cliquez ici pour accéder au Dashboard](<${dashboardUrl}>)`,
                )
                .setColor("#6e0b14")
                .setThumbnail(
                    "https://share.creavite.co/68cc47298705a76c771aa774.gif",
                )
                .addFields({
                    name: "✨ Fonctionnalités",
                    value: "• Contrôle de la musique en temps réel\n• Recherche avancée\n• Gestion de la playlist",
                    inline: false,
                })
                .setImage("https://cdn.discordapp.com/attachments/1391089229177557187/1419063863508340756/standard_5.gif?ex=68d065b5&is=68cf1435&hm=66853e25004a1363f1d3e821825b27c0a677e4013877eceea006fd4d80b0bc0c&");

            return message.reply({
                embeds: [embed],
                ephemeral: true,
            });
        } else if (message.customId === "lyrics") {
            // Handler pour le bouton Lyrics avec API lrclib
            message.deferReply({ ephemeral: true });

            try {
                // Nettoyer le titre et l'artiste pour l'API lrclib
                const cleanTitle = track.info.title
                    .replace(/\(.*?\)/g, "")
                    .replace(/\[.*?\]/g, "")
                    .replace(/ft\..*|feat\..*|featuring.*/gi, "")
                    .trim();
                const cleanArtist = track.info.author
                    .replace(/\(.*?\)/g, "")
                    .replace(/\[.*?\]/g, "")
                    .trim();

                const fetch = require("node-fetch");
                let lyricsFound = false;
                let lyrics = "";
                let syncedLyrics = "";
                let lyricsData = null;

                console.log(
                    `[LRCLIB] Recherche de paroles pour: "${cleanTitle}" par "${cleanArtist}"`,
                );

                // Essayer d'abord avec l'endpoint /get si on a des informations précises
                try {
                    // Convertir la durée en secondes (track.info.length est en millisecondes)
                    const durationInSeconds = Math.floor(
                        track.info.length / 1000,
                    );

                    // Essayer d'extraire le nom de l'album s'il est disponible
                    let albumName = "";
                    if (track.info.artworkUrl || track.info.uri) {
                        // Pour les tracks Spotify, essayer de deviner l'album depuis les métadonnées
                        albumName = ""; // On peut laisser vide pour lrclib
                    }

                    // API lrclib - endpoint /get (plus précis)
                    let apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
                    if (durationInSeconds && durationInSeconds > 0) {
                        apiUrl += `&duration=${durationInSeconds}`;
                    }
                    if (albumName) {
                        apiUrl += `&album_name=${encodeURIComponent(albumName)}`;
                    }

                    console.log(`[LRCLIB] Tentative avec /get: ${apiUrl}`);
                    const response1 = await fetch(apiUrl, {
                        timeout: 8000,
                        headers: {
                            "User-Agent": "ZG-Music-Bot/1.0.0",
                        },
                    });

                    if (response1.ok) {
                        lyricsData = await response1.json();
                        if (
                            lyricsData &&
                            (lyricsData.plainLyrics || lyricsData.syncedLyrics)
                        ) {
                            lyrics = lyricsData.plainLyrics || "";
                            syncedLyrics = lyricsData.syncedLyrics || "";
                            lyricsFound = true;
                            console.log(`[LRCLIB] Paroles trouvées avec /get`);
                        }
                    }
                } catch (e) {
                    console.log(
                        `[LRCLIB] /get a échoué, tentative avec /search...`,
                    );
                }

                // Si /get n'a pas fonctionné, essayer avec /search
                if (!lyricsFound) {
                    try {
                        const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
                        console.log(
                            `[LRCLIB] Tentative avec /search: ${searchUrl}`,
                        );

                        const response2 = await fetch(searchUrl, {
                            timeout: 8000,
                            headers: {
                                "User-Agent": "ZG-Music-Bot/1.0.0",
                            },
                        });

                        if (response2.ok) {
                            const searchResults = await response2.json();
                            if (
                                searchResults &&
                                Array.isArray(searchResults) &&
                                searchResults.length > 0
                            ) {
                                // Prendre le premier résultat qui a des paroles
                                lyricsData =
                                    searchResults.find(
                                        (result) =>
                                            result.plainLyrics ||
                                            result.syncedLyrics,
                                    ) || searchResults[0];
                                if (
                                    lyricsData &&
                                    (lyricsData.plainLyrics ||
                                        lyricsData.syncedLyrics)
                                ) {
                                    lyrics = lyricsData.plainLyrics || "";
                                    syncedLyrics =
                                        lyricsData.syncedLyrics || "";
                                    lyricsFound = true;
                                    console.log(
                                        `[LRCLIB] Paroles trouvées avec /search`,
                                    );
                                }
                            }
                        }
                    } catch (e) {
                        console.log(
                            `[LRCLIB] /search a également échoué: ${e.message}`,
                        );
                    }
                }

                if (lyricsFound && lyrics) {
                    // Limiter les paroles à 4000 caractères pour Discord
                    let displayLyrics = lyrics;
                    if (displayLyrics.length > 4000) {
                        displayLyrics =
                            displayLyrics.substring(0, 3950) +
                            "\n\n... (tronqué)";
                    }

                    const lyricsEmbed = new EmbedBuilder()
                        .setTitle(`📝 Paroles`)
                        .setColor("#6e0b14")
                        .setThumbnail(trackThumbnail)
                        .addFields(
                            {
                                name: "<:microdphone2:1419029652596330668>Artiste :",
                                value: lyricsData.artistName || track.info.author,
                                inline: true,
                            },
                            {
                                name: "<:xs:1419030455449157856>Titre :",
                                value: lyricsData.trackName || track.info.title,
                                inline: true,
                            },
                        );

                    // Ajouter l'album si disponible avec le même style
                    if (lyricsData.albumName) {
                        lyricsEmbed.addFields({
                            name: "<:loupe1:1419030687603753000>Album :",
                            value: lyricsData.albumName,
                            inline: true,
                        });
                    }

                    // Ajouter les paroles après les informations
                    lyricsEmbed.setDescription(displayLyrics);

                    // Indiquer si on a des paroles synchronisées
                    if (syncedLyrics) {
                        lyricsEmbed.setFooter({
                            text: "🎵 Paroles disponibles | Propulsé par Akira avec ❤️",
                        });
                    } else {
                        lyricsEmbed.setFooter({
                            text: "🎵 Lyrics v1 | Propulsé par Akira avec ❤️",
                        });
                    }

                    return message.editReply({
                        embeds: [lyricsEmbed],
                    });
                } else {
                    // Aucune paroles trouvée avec lrclib
                    const noLyricsEmbed = new EmbedBuilder()
                        .setTitle("❌ Paroles non trouvées")
                        .setDescription(
                            `Désolé, je n'ai pas pu trouver les paroles pour **${cleanTitle}** de **${cleanArtist}** dans la base de données lrclib.`,
                        )
                        .setColor("#ff6b6b")
                        .setThumbnail(trackThumbnail)
                        .addFields(
                            {
                                name: "🔍 Recherché",
                                value: `**Titre:** ${cleanTitle}\n**Artiste:** ${cleanArtist}`,
                                inline: false,
                            },
                            {
                                name: "💡 Suggestions",
                                value: "• Vérifiez l'orthographe du titre et de l'artiste\n• Essayez avec une version différente de la chanson\n• Les paroles peuvent ne pas être disponibles pour cette track",
                                inline: false,
                            },
                            {
                                name: "📚 À propos de lrclib",
                                value: "lrclib.net est une base de données communautaire gratuite avec près de 3 millions de paroles synchronisées.",
                                inline: false,
                            },
                        )
                        .setFooter({ text: "Powered by lrclib.net" });

                    return message.editReply({
                        embeds: [noLyricsEmbed],
                    });
                }
            } catch (error) {
                console.error(
                    "[LRCLIB] Erreur lors de la récupération des paroles:",
                    error,
                );

                const errorEmbed = new EmbedBuilder()
                    .setTitle("❌ Erreur de service")
                    .setDescription(
                        "Une erreur est survenue lors de la récupération des paroles.",
                    )
                    .setColor("#ff6b6b")
                    .addFields(
                        {
                            name: "🔧 Service utilisé",
                            value: "lrclib.net - Base de données gratuite de paroles",
                            inline: false,
                        },
                        {
                            name: "💡 Que faire ?",
                            value: "• Réessayez dans quelques instants\n• Le service pourrait être temporairement indisponible\n• Vérifiez votre connexion internet",
                            inline: false,
                        },
                    )
                    .setFooter({ text: "Service fourni par lrclib.net" });

                return message.editReply({
                    embeds: [errorEmbed],
                });
            }
        }
    });
});
