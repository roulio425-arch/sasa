const { model, Schema } = require("mongoose");

const UserFavoritesSchema = new Schema({
    userId: { type: String, required: true, index: true }, // Discord User ID
    trackTitle: { type: String, required: true },
    trackAuthor: { type: String, default: "Unknown Artist" },
    trackUri: { type: String, required: true },
    trackThumbnail: { type: String, default: null },
    trackDuration: { type: String, default: "Unknown" },
    addedAt: { type: Date, default: Date.now, index: true }
});

// Compound index to prevent duplicate favorites and optimize queries
UserFavoritesSchema.index({ userId: 1, trackUri: 1 }, { unique: true });
UserFavoritesSchema.index({ userId: 1, addedAt: -1 });

module.exports = model("UserFavorites", UserFavoritesSchema);
