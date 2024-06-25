const mongoose = require('mongoose');

const listingSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    rent: {
        type: Number,
        required: true
    },
    rooms: {
        type: String,
        required: true,
        enum: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+']
    },
    location: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['available', 'unavailable']
    },
    images: [{
        type: String
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
},  { collection: 'listings' });

module.exports = mongoose.model('listing', listingSchema);