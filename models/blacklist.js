const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
        },
        expiresAt: { 
            type: Date, 
            required: true 
        }

    },
    { timestamps: true },
    {collection: 'blacklists'}
);

const Blacklist = mongoose.model('blacklist', blacklistSchema);

module.exports = Blacklist;