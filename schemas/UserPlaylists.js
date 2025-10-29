const { model, Schema } = require("mongoose");

const PlaylistTrackSchema = new Schema({
    title: { type: String, required: true },
    author: { type: String, default: "Unknown Artist" },
    uri: { type: String, required: true },
    thumbnail: { type: String, default: null },
    duration: { type: String, default: "Unknown" },
    addedAt: { type: Date, default: Date.now }
}, { _id: false });

const UserPlaylistsSchema = new Schema({
    userId: { type: String, required: true, index: true }, // Discord User ID
    name: { type: String, required: true },
    description: { type: String, default: "" },
    tracks: [PlaylistTrackSchema],
    isPublic: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index for user playlists
UserPlaylistsSchema.index({ userId: 1, createdAt: -1 });

// Update timestamp on save
UserPlaylistsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = model("UserPlaylists", UserPlaylistsSchema);
