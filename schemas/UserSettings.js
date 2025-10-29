const { model, Schema } = require("mongoose");

const UserSettingsSchema = new Schema({
    userId: { type: String, required: true, unique: true, index: true }, // Discord User ID
    username: { type: String, default: null }, // Discord Username for reference
    
    // Audio Settings
    defaultVolume: { type: Number, default: 50, min: 0, max: 150 },
    autoplay: { type: Boolean, default: false },
    
    // Platform Preferences
    preferredSearchPlatform: { 
        type: String, 
        default: 'youtube', 
        enum: ['youtube', 'spotify', 'soundcloud'] 
    },
    
    // UI Settings
    theme: { 
        type: String, 
        default: 'red', 
        enum: ['red', 'blue'] 
    },
    language: { 
        type: String, 
        default: 'fr', 
        enum: ['fr', 'en'] 
    },
    
    // Notifications
    notifications: { type: Boolean, default: true },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
UserSettingsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = model("UserSettings", UserSettingsSchema);
