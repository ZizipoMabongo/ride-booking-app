// ================================
// Create the map
// ================================
const map = L.map("map").setView([-33.0153, 27.9116], 13);

// ================================
// Load OpenStreetMap
// ================================
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// ================================
// Variables
// ================================
let pickupMarker = null;
let destinationMarker = null;
let routeLine = null;

let pickupLocation = null;
let destinationLocation = null;

// ================================
// Sidebar Elements
// ================================
const pickupText = document.getElementById("pickup");
const destinationText = document.getElementById("destination");
const distanceText = document.getElementById("distance");
const fareText = document.getElementById("fare");
const bookRideButton = document.getElementById("bookRide");
const rideHistory = document.getElementById("rideHistory");

// ================================
// Map Click Events
// ================================
map.on("click", function (event) {

    // ============================
    // FIRST CLICK (Pickup)
    // ============================
    if (!pickupMarker) {

        pickupMarker = L.marker(event.latlng)
            .addTo(map)
            .bindPopup("📍 Pickup Location")
            .openPopup();

        pickupLocation = event.latlng;

        pickupText.textContent =
            `${pickupLocation.lat.toFixed(5)}, ${pickupLocation.lng.toFixed(5)}`;

    }

    // ============================
    // SECOND CLICK (Destination)
    // ============================
    else if (!destinationMarker) {

        destinationMarker = L.marker(event.latlng)
            .addTo(map)
            .bindPopup("🏁 Destination")
            .openPopup();

        destinationLocation = event.latlng;

        destinationText.textContent =
            `${destinationLocation.lat.toFixed(5)}, ${destinationLocation.lng.toFixed(5)}`;

        // Calculate distance
        const distanceMeters =
            pickupLocation.distanceTo(destinationLocation);

        const distanceKm =
            (distanceMeters / 1000).toFixed(2);

        distanceText.textContent =
            `${distanceKm} km`;

        // Calculate fare
        const baseFare = 25;
        const pricePerKm = 2;

        const fare =
            (baseFare + parseFloat(distanceKm) * pricePerKm).toFixed(2);

        fareText.textContent =
    `R${fare}`;

        // Remove previous route
        if (routeLine) {
            map.removeLayer(routeLine);
        }

        // Draw route
        routeLine = L.polyline(
            [pickupLocation, destinationLocation],
            {
                color: "blue",
                weight: 5
            }
        ).addTo(map);

        // Zoom to route
        map.fitBounds(routeLine.getBounds());

    }

    // ============================
    // THIRD CLICK (Reset)
    // ============================
    else {

        // Remove markers
        map.removeLayer(pickupMarker);
        map.removeLayer(destinationMarker);

        // Remove route
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }

        // Reset markers
        pickupMarker = L.marker(event.latlng)
            .addTo(map)
            .bindPopup("📍 Pickup Location")
            .openPopup();

        pickupLocation = event.latlng;
        destinationLocation = null;
        destinationMarker = null;

        // Reset sidebar
        pickupText.textContent =
            `${pickupLocation.lat.toFixed(5)}, ${pickupLocation.lng.toFixed(5)}`;

        destinationText.textContent = "Not selected";
        distanceText.textContent = "0 km";
        fareText.textContent = "R0.00";
    }

});

// ================================
// Book Ride
// ================================
bookRideButton.addEventListener("click", async () => {

    if (!pickupLocation || !destinationLocation) {
        alert("Please select both a pickup and destination.");
        return;
    }

    const distance =
        Number((pickupLocation.distanceTo(destinationLocation) / 1000).toFixed(2));

    const fare =
        Number((5 + distance * 2).toFixed(2));

    const booking = {

        pickup: {
            lat: pickupLocation.lat,
            lng: pickupLocation.lng
        },

        destination: {
            lat: destinationLocation.lat,
            lng: destinationLocation.lng
        },

        distance: distance,
        fare: fare

    };

    try {

        const response = await fetch("/api/bookings", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(booking)

        });

        const result = await response.json();

      if (response.ok) {

    alert("✅ Ride booked successfully!");

    loadRideHistory();

    console.log("Booking Saved:", result);

} else {

    alert(result.message || "Failed to save booking.");

}

    } catch (error) {

        console.error(error);

        alert("❌ Could not connect to the server.");

    }

});
// ================================
// Draw Saved Ride On Map
// ================================
let savedRideLayers = [];

function drawRideOnMap(booking) {

    const pickup = [
        booking.pickup.lat,
        booking.pickup.lng
    ];

    const destination = [
        booking.destination.lat,
        booking.destination.lng
    ];

    // Pickup Marker
    const pickupCircle = L.circleMarker(pickup, {

        radius: 8,
        color: "#0f766e",
        fillColor: "#14b8a6",
        fillOpacity: 1

    })
    .addTo(map)
    .bindPopup(`
        <strong>Ride #${booking._id.slice(-4)}</strong><br>
        📍 Pickup
    `);

    savedRideLayers.push(pickupCircle);

    // Destination Marker
    const destinationCircle = L.circleMarker(destination, {

        radius: 8,
        color: "#991b1b",
        fillColor: "#ef4444",
        fillOpacity: 1

    })
    .addTo(map)
    .bindPopup(`
        <strong>Ride #${booking._id.slice(-4)}</strong><br>
        🏁 Destination
    `);

    savedRideLayers.push(destinationCircle);

    // Route Line
    const savedRoute = L.polyline(
        [pickup, destination],
        {
            color: "#7c3aed",
            weight: 4,
            opacity: 0.9,
            dashArray: "10,10"
        }
    ).addTo(map);

    savedRideLayers.push(savedRoute);

}

// ================================
// Clear Current Ride Selection
// ================================
function clearCurrentRide() {

    if (pickupMarker) {
        map.removeLayer(pickupMarker);
        pickupMarker = null;
    }

    if (destinationMarker) {
        map.removeLayer(destinationMarker);
        destinationMarker = null;
    }

    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    pickupLocation = null;
    destinationLocation = null;

    pickupText.textContent = "Not selected";
    destinationText.textContent = "Not selected";
    distanceText.textContent = "0 km";
    fareText.textContent = "$0.00";

}

// ================================
// Load Ride History
// ================================
async function loadRideHistory() {

    try {

        // Remove old saved rides from the map
        savedRideLayers.forEach(layer => {
            map.removeLayer(layer);
        });

        savedRideLayers = [];

        const response = await fetch("/api/bookings");
        const bookings = await response.json();

        rideHistory.innerHTML = "";

        if (bookings.length === 0) {

            rideHistory.innerHTML = "<p>No bookings yet.</p>";
            return;

        }

        bookings.forEach((booking) => {

            // Draw ride on the map
            drawRideOnMap(booking);

            // Add ride to sidebar
            rideHistory.innerHTML += `

                <div class="history-card">

                    <strong>Ride #${booking._id.slice(-4)}</strong>

                    <br><br>

                    <strong>📍 Pickup</strong><br>
                    ${booking.pickup.lat.toFixed(5)},
                    ${booking.pickup.lng.toFixed(5)}

                    <br><br>

                    <strong>🏁 Destination</strong><br>
                    ${booking.destination.lat.toFixed(5)},
                    ${booking.destination.lng.toFixed(5)}

                    <br><br>

                    <strong>📏 Distance:</strong>
                    ${booking.distance} km

                    <br>

                    <strong>💲 Fare:</strong>
                    $${booking.fare}

                    <br>

                    <strong>📌 Status:</strong>
                    ${booking.status}

                    <hr>

                </div>

            `;

        });

    } catch (error) {

        console.error(error);

        rideHistory.innerHTML = "<p>Unable to load bookings.</p>";

    }

}

// Load saved rides when the page opens
loadRideHistory();