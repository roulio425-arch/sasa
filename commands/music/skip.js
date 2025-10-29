const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { logger } = require("../../utils/logger");
const config = require("../../config");

module.exports = {
        data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current playing track")
        .setDMPermission(false),

    run: async ({ interaction, client }) => {
        const embed = new EmbedBuilder().setColor("#6e0b14");

        try {
            const player = client.riffy.players.get(interaction.guildId);

            if (!player) {
                return interaction.reply({ 
                    embeds: [embed.setDescription("\`❌\` | No player found in this server.")],  
                    ephemeral: true 
                });
            }

            if (player.queue.size === 0) {
                return interaction.reply({ 
                    embeds: [embed.setDescription("\`❌\` | La playlist est vide.")], 
                    ephemeral: true 
                });
            }

            await interaction.reply({ embeds: [embed.setDescription(`\`⏭️\` | Ok, je passe au MORCEAU suivant : ${player.current.info.title}`)] });
            player.stop();

        } catch (err) {
            logger(err, "error");
            return interaction.reply({ 
                embeds: [embed.setDescription(`\`❌\` | An error occurred: ${err.message}`)], 
                ephemeral: true 
            });
        }
    },
    options: {
        inVoice: true,
        sameVoice: true,
    }
};