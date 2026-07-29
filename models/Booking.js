const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    pickup: {
        lat: Number,
        lng: Number
    },
    destination: {
        lat: Number,
        lng: Number
    },
    distance: Number,
    fare: Number,
    status: {
        type: String,
        default: "Pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Booking", bookingSchema);;