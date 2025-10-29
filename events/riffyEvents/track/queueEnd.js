const client = require("../../../Aria");
const { EmbedBuilder } = require("discord.js");

// Map pour stocker les timers de déconnexion par guild
const disconnectTimers = new Map();

client.riffy.on("queueEnd", async (player) => {
    const channel = client.channels.cache.get(player.textChannel);
    
    if (player.message) await player.message.delete().catch((e) => {});

    if (player.isAutoplay === true) {
        player.autoplay(player)
    } else {
        // Annuler tout timer existant pour ce guild
        if (disconnectTimers.has(player.guildId)) {
            clearTimeout(disconnectTimers.get(player.guildId));
            disconnectTimers.delete(player.guildId);
        }

        // Créer un embed stylé pour annoncer le départ
        const leaveEmbed = new EmbedBuilder()
            .setAuthor({
                name: "ZG Music - Déconnexion programmée",
                iconURL: "https://cdn.discordapp.com/attachments/1391089229177557187/1418991076198580304/icons8-dashboard-100.png",
            })
            .setColor("#6e0b14")
            .setTitle("⏰ Je m'en vais dans 15 minutes")
            .setDescription("La playlist est terminée ! Je vais quitter le canal vocal dans **15 minutes** si aucune nouvelle musique n'est ajoutée.")
            .addFields(
                {
                    name: "⏱️ Temps restant",
                    value: "`15:00 minutes`",
                    inline: true,
                },
                {
                    name: "🎵 Action",
                    value: "Ajoutez une musique pour me garder !",
                    inline: true,
                }
            )
            .setFooter({
                text: "ZG Music • Déconnexion automatique",
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Envoyer l'embed
        await channel.send({ embeds: [leaveEmbed] });
        console.log(`[DISCONNECT] Timer de 15 minutes démarré pour ${player.guildId}`);

        // Créer le timer de 15 minutes (900000 ms)
        const timer = setTimeout(async () => {
            // Vérifier si le player existe encore et si la queue est toujours vide
            const currentPlayer = client.riffy.players.get(player.guildId);
            if (currentPlayer && currentPlayer.queue.size === 0 && !currentPlayer.current) {
                // Créer un embed de départ final
                const finalLeaveEmbed = new EmbedBuilder()
                    .setAuthor({
                        name: "ZG Music",
                        iconURL: "https://cdn.discordapp.com/attachments/1391089229177557187/1418991076198580304/icons8-dashboard-100.png",
                    })
                    .setColor("#6e0b14")
                    .setTitle("👋 Au revoir !")
                    .setDescription("Les 15 minutes sont écoulées. Je quitte le canal vocal !")
                    .setFooter({
                        text: "À bientôt ! • ZG Music",
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                await channel.send({ embeds: [finalLeaveEmbed] });
                console.log(`[DISCONNECT] Déconnexion du vocal pour ${player.guildId}`);
                
                currentPlayer.destroy();
            }
            
            disconnectTimers.delete(player.guildId);
        }, 15 * 60 * 1000); // 15 minutes en millisecondes

        // Stocker le timer
        disconnectTimers.set(player.guildId, timer);
    }
});

// Annuler le timer de déconnexion quand une nouvelle musique est ajoutée
client.riffy.on("trackStart", (player) => {
    if (disconnectTimers.has(player.guildId)) {
        clearTimeout(disconnectTimers.get(player.guildId));
        disconnectTimers.delete(player.guildId);
        console.log(`[DISCONNECT] Timer annulé pour ${player.guildId} - Nouvelle musique lancée`);
    }
});