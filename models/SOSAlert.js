const mongoose = require("mongoose");

const sosAlertSchema = new mongoose.Schema({

    role: {
        type: String,
        enum: ["passenger", "driver"],
        required: true
    },

    name: {
        type: String,
        default: "Unknown"
    },

    contact: {
        type: String,
        default: "Unknown"
    },

    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null
    },

    location: {
        lat: Number,
        lng: Number
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("SOSAlert", sosAlertSchema);