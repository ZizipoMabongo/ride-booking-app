const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const Booking = require("./models/Booking");
const Driver = require("./models/Driver");

const app = express();

// ==============================
// Middleware
// ==============================
app.use(express.json());
app.use(express.static("public"));

// ==============================
// Auth Middleware (drivers only)
// ==============================
function verifyDriverToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.driver = decoded; // { id, email, name }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// ==============================
// MongoDB Atlas Connection
// ==============================
const uri = process.env.MONGO_URI;

mongoose.connect(uri)
    .then(() => {
        console.log("✅ MongoDB connected successfully");
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:");
        console.error(err.message);
    });

// ==============================
// Test API
// ==============================
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "API is working!"
    });
});

// ==============================
// Save a Booking
// ==============================
app.post("/api/bookings", async (req, res) => {
    try {
        const { passengerName, passengerPhone, pickup, destination, distance, fare } = req.body;

        if (!passengerName || !passengerPhone || !pickup || !destination || distance == null || fare == null) {
            return res.status(400).json({
                success: false,
                message: "passengerName, passengerPhone, pickup, destination, distance, and fare are required."
            });
        }

        const booking = new Booking({
            passengerName,
            passengerPhone,
            pickup,
            destination,
            distance,
            fare
        });

        await booking.save();

        res.status(201).json({
            success: true,
            message: "Ride booked successfully!",
            booking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to save booking."
        });
    }
});

// ==============================
// Get All Bookings
// ==============================
app.get("/api/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings."
        });
    }
});

// ==============================
// Update Booking Status (driver accepts / updates a ride)
// ==============================
app.put("/api/bookings/:id", verifyDriverToken, async (req, res) => {
    try {
        const { status } = req.body;

        const updateData = { status };

        if (status === "Accepted") {
            updateData.driverId = req.driver.id;
            updateData.driverName = req.driver.name;
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        res.json({
            success: true,
            message: "Booking updated successfully!",
            booking
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking."
        });
    }
});

// ==============================
// Driver Registration
// ==============================
app.post("/api/drivers/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "name, email, and password are required."
            });
        }

        const existingDriver = await Driver.findOne({ email });

        if (existingDriver) {
            return res.status(400).json({
                message: "Driver already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const driver = new Driver({
            name,
            email,
            password: hashedPassword
        });

        await driver.save();

        res.json({
            message: "Driver registered successfully"
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// ==============================
// Driver Login
// ==============================
// ==============================
// Driver Login
// ==============================
app.post("/api/drivers/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const driver = await Driver.findOne({ email });

        if (!driver) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            driver.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: driver._id,
                email: driver.email,
                name: driver.name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            message: "Login successful",
            token
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// ==============================
// Get Logged-In Driver Info
// ==============================
app.get("/api/drivers/me", verifyDriverToken, async (req, res) => {
    res.json({
        id: req.driver.id,
        name: req.driver.name,
        email: req.driver.email
    });
});

// ==============================
// Simple health-check route
// ==============================
app.get("/test", (req, res) => {
    res.send("Server is reading this file");
});

// ==============================
// Start Server (LAST)
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    // ==============================
// Driver Registration
// ==============================
app.post("/api/drivers/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingDriver = await Driver.findOne({ email });

        if (existingDriver) {
            return res.status(400).json({
                message: "Driver already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const driver = new Driver({
            name,
            email,
            password: hashedPassword
        });

        await driver.save();

        res.status(201).json({
            message: "Driver registered successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});