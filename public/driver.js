const mongoose = require("mongoose");

// models/Driver.js
const driverSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    status: {
        type: String,
        default: "Offline"
    }

});


module.exports = mongoose.model(
    "Driver",
    driverSchema
);