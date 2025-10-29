// This makes the command cannot be executed when member is not in a voice channel
module.exports = ({ interaction, commandObj }) => {
    if (commandObj.options?.inVoice) {
        const memberChannel = interaction.member.voice.channelId;
        
        if (!memberChannel) {
            return interaction.reply({
                content: `\`❌\` | Vous devez être dans un canal vocal pour utiliser cette commande.`,
                ephemeral: true
            });
        }
    }
};