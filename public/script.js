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

let currentRidePollTimer = null;

// ================================
// Passenger auth state
// ================================
const passengerToken = localStorage.getItem("passengerToken");
const passengerInfo = JSON.parse(localStorage.getItem("passengerInfo") || "null");

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

const currentRideCard = document.getElementById("currentRideCard");
const currentRideStatus = document.getElementById("currentRideStatus");
const currentRideDriver = document.getElementById("currentRideDriver");

const passengerAuthButtons = document.getElementById("passengerAuthButtons");

// Prefill passenger details if logged in
if (passengerInfo) {
    passengerNameInput.value = passengerInfo.name;
}

// ================================
// Nav: show Login/Sign Up or My Rides/Logout
// ================================
function renderPassengerNav() {

    if (passengerToken && passengerInfo) {

        passengerAuthButtons.innerHTML = `
            <a href="my-rides.html"><button class="secondary-btn">My Rides</button></a>
            <button class="secondary-btn" id="passengerLogoutBtn">Logout</button>
        `;

        document.getElementById("passengerLogoutBtn").addEventListener("click", () => {
            localStorage.removeItem("passengerToken");
            localStorage.removeItem("passengerInfo");
            window.location.reload();
        });

    } else {

        passengerAuthButtons.innerHTML = `
            <a href="passenger-login.html"><button class="secondary-btn">Log In</button></a>
            <a href="passenger-register.html"><button class="primary-btn">Sign Up</button></a>
        `;

    }

}

renderPassengerNav();

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

        const headers = {
            "Content-Type": "application/json"
        };

        if (passengerToken) {
            headers["Authorization"] = `Bearer ${passengerToken}`;
        }

        const response = await fetch("/api/bookings", {
            method: "POST",
            headers,
            body: JSON.stringify(booking)
        });

        const result = await response.json();

        if (response.ok) {

            alert("✅ Ride booked successfully!");

            startTrackingCurrentRide(result.booking._id);
            loadMyRideHistoryPreview();

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
// Current Ride tracking (works for guests AND logged-in passengers)
// ================================
function startTrackingCurrentRide(bookingId) {

    localStorage.setItem("lastBookingId", bookingId);

    currentRideCard.style.display = "block";
    currentRideStatus.textContent = "🕒 Waiting for a driver...";
    currentRideDriver.style.display = "none";

    if (currentRidePollTimer) {
        clearInterval(currentRidePollTimer);
    }

    pollCurrentRide(bookingId);
    currentRidePollTimer = setInterval(() => pollCurrentRide(bookingId), 5000);

}

async function pollCurrentRide(bookingId) {

    try {

        const response = await fetch(`/api/bookings/${bookingId}`);

        if (!response.ok) {
            return;
        }

        const booking = await response.json();

        if (booking.status === "Accepted") {

            currentRideStatus.textContent = "🚗 A driver has accepted your ride!";
            currentRideDriver.textContent = `Driver: ${booking.driverName || "Assigned"}`;
            currentRideDriver.style.display = "block";

        } else if (booking.status === "Completed") {

            currentRideStatus.textContent = "✅ Ride completed. Thanks for riding with us!";
            currentRideDriver.style.display = "none";

            if (currentRidePollTimer) {
                clearInterval(currentRidePollTimer);
            }

        } else {

            currentRideStatus.textContent = "🕒 Waiting for a driver...";
            currentRideDriver.style.display = "none";

        }

    } catch (error) {

        console.error("Could not refresh ride status:", error);

    }

}

// Resume tracking the last booking if the page is reloaded (same browser)
const lastBookingId = localStorage.getItem("lastBookingId");

if (lastBookingId) {
    startTrackingCurrentRide(lastBookingId);
}

// ================================
// Clear Current Ride Selection (the map form, not the tracked booking)
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
// Ride History Preview (scoped to the logged-in passenger only —
// guests are prompted to log in instead of seeing everyone else's rides)
// ================================
async function loadMyRideHistoryPreview() {

    if (!passengerToken) {
        rideHistory.innerHTML = `<p>Log in to see your past rides.</p>`;
        return;
    }

    try {

        const response = await fetch("/api/bookings/mine/history", {
            headers: {
                "Authorization": `Bearer ${passengerToken}`
            }
        });

        if (!response.ok) {
            rideHistory.innerHTML = "<p>Unable to load your rides.</p>";
            return;
        }

        const bookings = await response.json();

        if (!bookings.length) {
            rideHistory.innerHTML = "<p>No bookings yet.</p>";
            return;
        }

        rideHistory.innerHTML = "";

        bookings.slice(0, 3).forEach((booking) => {

            rideHistory.innerHTML += `

                <div class="history-card">

                    <strong>📏 ${booking.distance} km</strong> — R${booking.fare}
                    <br>
                    <small>${booking.status}</small>

                </div>

            `;

        });

        if (bookings.length > 3) {
            rideHistory.innerHTML += `<a href="my-rides.html">View all rides →</a>`;
        }

    } catch (error) {

        console.error(error);
        rideHistory.innerHTML = "<p>Unable to load your rides.</p>";

    }

}

// Load history preview on page open
loadMyRideHistoryPreview();