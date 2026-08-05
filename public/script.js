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

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

let pickupSearchTimer = null;
let destinationSearchTimer = null;

// ================================
// Sidebar Elements
// ================================
const pickupText = document.getElementById("pickup");
const destinationText = document.getElementById("destination");
const distanceText = document.getElementById("distance");
const fareText = document.getElementById("fare");
const bookRideButton = document.getElementById("bookRide");
const rideHistory = document.getElementById("rideHistory");
const passengerNameInput = document.getElementById("passengerName");
const passengerPhoneInput = document.getElementById("passengerPhone");

const pickupResultsEl = document.getElementById("pickupResults");
const destinationResultsEl = document.getElementById("destinationResults");

// Vehicle Selection
const vehicleCards = document.querySelectorAll(".vehicle-card");

let selectedVehicle = {
    type: "Economy",
    baseFare: 25
};

vehicleCards.forEach(card => {

    card.addEventListener("click", () => {

        vehicleCards.forEach(c => c.classList.remove("selected"));

        card.classList.add("selected");

        selectedVehicle.type = card.dataset.type;
        selectedVehicle.baseFare = Number(card.dataset.basefare);

        recalcFare();

    });

});

// ================================
// Shared: recalc distance + fare + route whenever both points are known
// ================================
function recalcFare() {

    if (!pickupLocation || !destinationLocation) {
        return;
    }

    const distance =
        Number((pickupLocation.distanceTo(destinationLocation) / 1000).toFixed(2));

    let pricePerKm = 2;

    switch (selectedVehicle.type) {

        case "XL":
            pricePerKm = 3;
            break;

        case "Premium":
            pricePerKm = 5;
            break;

        default:
            pricePerKm = 2;

    }

    const fare =
        (selectedVehicle.baseFare + distance * pricePerKm).toFixed(2);

    distanceText.textContent = `${distance} km`;
    fareText.textContent = `R${fare}`;

    // Redraw route
    if (routeLine) {
        map.removeLayer(routeLine);
    }

    routeLine = L.polyline(
        [pickupLocation, destinationLocation],
        {
            color: "blue",
            weight: 5
        }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds());

}

// ================================
// Shared: place / move the pickup marker
// ================================
function setPickup(latlng, addressLabel) {

    if (pickupMarker) {
        map.removeLayer(pickupMarker);
    }

    pickupMarker = L.marker(latlng)
        .addTo(map)
        .bindPopup("📍 Pickup Location");

    pickupLocation = latlng;

    pickupText.value = addressLabel || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;

    recalcFare();

}

// ================================
// Shared: place / move the destination marker
// ================================
function setDestination(latlng, addressLabel) {

    if (destinationMarker) {
        map.removeLayer(destinationMarker);
    }

    destinationMarker = L.marker(latlng)
        .addTo(map)
        .bindPopup("🏁 Destination");

    destinationLocation = latlng;

    destinationText.value = addressLabel || `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;

    recalcFare();

}

// ================================
// Map Click Events
// (1st click = pickup, 2nd = destination, 3rd = reset + new pickup)
// ================================
map.on("click", function (event) {

    // FIRST CLICK (Pickup)
    if (!pickupMarker) {

        setPickup(event.latlng);
        reverseGeocode(event.latlng, pickupText);

    }

    // SECOND CLICK (Destination)
    else if (!destinationMarker) {

        setDestination(event.latlng);
        reverseGeocode(event.latlng, destinationText);

    }

    // THIRD CLICK (Reset, then start a new pickup)
    else {

        clearCurrentRide();

        setPickup(event.latlng);
        reverseGeocode(event.latlng, pickupText);

    }

});

// ================================
// Address search (autocomplete) — Pickup
// ================================
pickupText.addEventListener("input", () => {

    clearTimeout(pickupSearchTimer);
    const query = pickupText.value.trim();

    if (query.length < 3) {
        hideResults(pickupResultsEl);
        return;
    }

    pickupSearchTimer = setTimeout(() => {

        runSearch(query, pickupResultsEl, (result) => {

            const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));

            hideResults(pickupResultsEl);
            setPickup(latlng, result.display_name);
            map.panTo(latlng);

        });

    }, 400);

});

// ================================
// Address search (autocomplete) — Destination
// ================================
destinationText.addEventListener("input", () => {

    clearTimeout(destinationSearchTimer);
    const query = destinationText.value.trim();

    if (query.length < 3) {
        hideResults(destinationResultsEl);
        return;
    }

    destinationSearchTimer = setTimeout(() => {

        runSearch(query, destinationResultsEl, (result) => {

            const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));

            hideResults(destinationResultsEl);
            setDestination(latlng, result.display_name);
            map.panTo(latlng);

        });

    }, 400);

});

async function runSearch(query, resultsEl, onSelect) {

    try {

        const url = `${NOMINATIM_URL}?format=json&addressdetails=0&limit=5&countrycodes=za&q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: { "Accept-Language": "en" }
        });

        const results = await response.json();

        renderResults(results, resultsEl, onSelect);

    } catch (error) {

        console.error("Address search failed:", error);
        resultsEl.innerHTML = `<div class="search-result-empty">Search unavailable, try again</div>`;
        resultsEl.classList.add("visible");

    }

}

function renderResults(results, resultsEl, onSelect) {

    resultsEl.innerHTML = "";

    if (!results.length) {
        resultsEl.innerHTML = `<div class="search-result-empty">No matches found</div>`;
        resultsEl.classList.add("visible");
        return;
    }

    results.forEach((result) => {

        const item = document.createElement("div");
        item.className = "search-result-item";
        item.textContent = result.display_name;

        item.addEventListener("click", () => onSelect(result));

        resultsEl.appendChild(item);

    });

    resultsEl.classList.add("visible");

}

function hideResults(resultsEl) {
    resultsEl.classList.remove("visible");
    resultsEl.innerHTML = "";
}

// Hide dropdowns when clicking elsewhere on the page
document.addEventListener("click", (e) => {

    if (!pickupText.contains(e.target) && !pickupResultsEl.contains(e.target)) {
        hideResults(pickupResultsEl);
    }

    if (!destinationText.contains(e.target) && !destinationResultsEl.contains(e.target)) {
        hideResults(destinationResultsEl);
    }

});

// ================================
// Reverse geocoding (map click -> fill text input with an address)
// ================================
async function reverseGeocode(latlng, inputEl) {

    try {

        const url = `${NOMINATIM_REVERSE_URL}?format=json&lat=${latlng.lat}&lon=${latlng.lng}`;

        const response = await fetch(url, {
            headers: { "Accept-Language": "en" }
        });

        const result = await response.json();

        if (result.display_name) {
            inputEl.value = result.display_name;
        }

    } catch (error) {

        console.error("Reverse geocoding failed:", error);
        // Leave the lat/lng text already set by setPickup/setDestination as a fallback

    }

}

// ================================
// Book Ride
// ================================
bookRideButton.addEventListener("click", async () => {

    const passengerName = passengerNameInput.value.trim();
    const passengerPhone = passengerPhoneInput.value.trim();

    if (!passengerName || !passengerPhone) {
        alert("Please enter your name and phone number.");
        return;
    }

    if (!pickupLocation || !destinationLocation) {
        alert("Please select both a pickup and destination.");
        return;
    }

    const distance =
        Number((pickupLocation.distanceTo(destinationLocation) / 1000).toFixed(2));


        let pricePerKm = 2;

switch (selectedVehicle.type) {

    case "XL":
        pricePerKm = 3;
        break;

    case "Premium":
        pricePerKm = 5;
        break;

    default:
        pricePerKm = 2;

}

const fare =
    Number((selectedVehicle.baseFare + distance * pricePerKm).toFixed(2));

    const booking = {

        passengerName: passengerName,
        passengerPhone: passengerPhone,
       
        vehicle: selectedVehicle.type,

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

    pickupText.value = "";
    destinationText.value = "";
    distanceText.textContent = "0 km";
    fareText.textContent = "R0.00";

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

                    <strong>👤 Passenger:</strong>
                    ${booking.passengerName} (${booking.passengerPhone})

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
                    R${booking.fare}

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