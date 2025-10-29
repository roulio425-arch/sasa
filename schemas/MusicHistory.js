const { model, Schema } = require("mongoose");

const MusicHistorySchema = new Schema({
    GuildId: { type: String, required: true, index: true },
    trackTitle: { type: String, required: true },
    trackAuthor: { type: String, default: "Unknown Artist" },
    trackUri: { type: String, default: null },
    trackThumbnail: { type: String, default: null },
    trackDuration: { type: String, default: "Unknown" },
    addedBy: { type: String, default: null }, // Discord User ID
    addedByUsername: { type: String, default: "Dashboard User" }, // Discord Username
    addedByDisplayName: { type: String, default: "Dashboard User" }, // Discord Display Name/Pseudo
    addedByAvatar: { type: String, default: null }, // Discord Avatar URL
    addedAt: { type: Date, default: Date.now, index: true }
});

// Index composé pour optimiser les requêtes par guild et date
MusicHistorySchema.index({ GuildId: 1, addedAt: -1 });

module.exports = model("MusicHistory", MusicHistorySchema);
