const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const Booking = require("./models/Booking");
const Driver = require("./models/Driver");
const Passenger = require("./models/Passenger");
const SOSAlert = require("./models/SOSAlert");

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

        if (decoded.role !== "driver") {
            return res.status(401).json({ message: "Invalid token for this route" });
        }

        req.driver = decoded; // { id, email, name, role }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// ==============================
// Auth Middleware (passengers only — required)
// ==============================
function verifyPassengerToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "passenger") {
            return res.status(401).json({ message: "Invalid token for this route" });
        }

        req.passenger = decoded; // { id, email, name, role }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// ==============================
// Auth Middleware (passengers — optional)
// Lets guests keep booking without a token, but attaches
// req.passenger when a valid passenger token IS provided.
// ==============================
function optionalPassengerToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(); // guest — proceed with no passenger attached
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === "passenger") {
            req.passenger = decoded;
        }
    } catch (error) {
        // Invalid/expired token on an optional route — just proceed as a guest
    }

    next();
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
        message: "RideConnect SA API is running."
    });

});

// ==============================
// Save a Booking (guest OR logged-in passenger)
// ==============================
app.post("/api/bookings", optionalPassengerToken, async (req, res) => {
    try {
        const { passengerName, passengerPhone, pickup, destination, distance, fare, vehicle } = req.body;

        if (!passengerName || !passengerPhone || !pickup || !destination || distance == null || fare == null) {
            return res.status(400).json({
                success: false,
                message: "passengerName, passengerPhone, pickup, destination, distance, and fare are required."
            });
        }

        const booking = new Booking({
            passengerName,
            passengerPhone,
            vehicle,
            pickup,
            destination,
            distance,
            fare,
            passengerId: req.passenger ? req.passenger.id : null
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
// Get All Pending Bookings (used by the driver dashboard)
// ==============================
app.get("/api/bookings", async (req, res) => {

    try {

        const bookings = await Booking.find({
            status: "Pending"
        }).sort({
            createdAt: -1
        });

        res.json(bookings);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });

    }

});

// ==============================
// Get a Single Booking (used to poll status right after booking —
// works for guests too, since the booking ID itself isn't guessable)
// ==============================
app.get("/api/bookings/:id", async (req, res) => {

    try {

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        res.json(booking);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });

    }

});

// ==============================
// Get Logged-In Passenger's Own Bookings
// ==============================
app.get("/api/bookings/mine/history", verifyPassengerToken, async (req, res) => {

    try {

        const bookings = await Booking.find({
            passengerId: req.passenger.id
        }).sort({
            createdAt: -1
        });

        res.json(bookings);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
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
                name: driver.name,
                role: "driver"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            message: "Login successful",
            token,
            driver: {
                id: driver._id,
                name: driver.name,
                email: driver.email
            }
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
// Passenger Registration
// ==============================
app.post("/api/passengers/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "name, email, and password are required."
            });
        }

        const existingPassenger = await Passenger.findOne({ email });

        if (existingPassenger) {
            return res.status(400).json({
                message: "An account with that email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const passenger = new Passenger({
            name,
            email,
            password: hashedPassword
        });

        await passenger.save();

        res.json({
            message: "Account created successfully"
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// ==============================
// Passenger Login
// ==============================
app.post("/api/passengers/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const passenger = await Passenger.findOne({ email });

        if (!passenger) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            passenger.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: passenger._id,
                email: passenger.email,
                name: passenger.name,
                role: "passenger"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h"
            }
        );

        res.json({
            message: "Login successful",
            token,
            passenger: {
                id: passenger._id,
                name: passenger.name,
                email: passenger.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// ==============================
// Get Logged-In Passenger Info
// ==============================
app.get("/api/passengers/me", verifyPassengerToken, async (req, res) => {
    res.json({
        id: req.passenger.id,
        name: req.passenger.name,
        email: req.passenger.email
    });
});

// ==============================
// Emergency SOS Alert (passenger or driver — no auth required,
// guests must be able to trigger this too)
// ==============================
app.post("/api/sos", async (req, res) => {

    try {

        const { role, name, contact, bookingId, location } = req.body;

        if (!role || (role !== "passenger" && role !== "driver")) {
            return res.status(400).json({
                message: "A valid role (passenger or driver) is required."
            });
        }

        const alert = new SOSAlert({
            role,
            name: name || "Unknown",
            contact: contact || "Unknown",
            bookingId: bookingId || null,
            location: location || null
        });

        await alert.save();

        console.log(`🚨 SOS ALERT — ${role.toUpperCase()}: ${alert.name} (${alert.contact})`, location || "location unavailable");

        res.status(201).json({
            success: true,
            message: "Alert received"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to log SOS alert"
        });

    }

});

// ==============================
// Simple health-check route
// ==============================
app.get("/test", (req, res) => {
    res.send("Server is reading this file");
});
// ==============================
// Driver Accept Ride
// ==============================
app.put("/api/bookings/:id/accept", verifyDriverToken, async (req, res) => {

    try {

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        if (booking.status !== "Pending") {
            return res.status(400).json({
                message: "Ride already accepted"
            });
        }

        booking.status = "Accepted";
        booking.driverId = req.driver.id;
        booking.driverName = req.driver.name;

        await booking.save();

        res.json({
            message: "Ride accepted successfully",
            booking
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error"
        });

    }

});
// ==============================
// Start Server (LAST)
// ==============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
   
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});