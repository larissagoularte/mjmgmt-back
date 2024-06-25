const mongoose = require("mongoose");
const Schema = mongoose.Schema; 

const userSchema = new Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true
    },
    pass: {
        type: String
    },
    listings: [{
        type: Schema.Types.ObjectId, ref: 'Listing'
    }]
}, { collection: 'users' });

module.exports = mongoose.model("user", userSchema);