const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    // Passenger info (no account needed, just entered at booking time)
    passengerName: {
        type: String,
        required: true
    },
    passengerPhone: {
        type: String,
        required: true
    },
vehicle: {
    type: String,
    default: "Economy"
},
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

    // Filled in once a driver accepts the ride
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null
    },
    driverName: {
        type: String,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Booking", bookingSchema);