const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { logger } = require("../../utils/logger");
const config = require("../../config");

module.exports = {
        data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop the current track and destroy the player")
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

            player.stop();
            player.destroy();
            return interaction.reply({ embeds: [embed.setDescription("\`⏹️\` Bon ok je m'en vais !")] });

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