const token = localStorage.getItem("passengerToken");
const passengerInfo = JSON.parse(localStorage.getItem("passengerInfo") || "null");

if (!token) {
    window.location.href = "passenger-login.html";
}

if (passengerInfo) {
    document.getElementById("pageHeading").textContent = `${passengerInfo.name}'s Rides`;
}

const ridesList = document.getElementById("ridesList");

// ================================
// Load this passenger's bookings
// ================================
async function loadMyRides() {

    try {

        const response = await fetch("/api/bookings/mine/history", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const bookings = await response.json();

        renderRides(bookings);

    } catch (error) {

        console.error(error);
        ridesList.innerHTML = "<p>Unable to load your rides right now.</p>";

    }

}

function renderRides(bookings) {

    if (!bookings.length) {
        ridesList.innerHTML = "<p>You haven't booked a ride yet.</p>";
        return;
    }

    ridesList.innerHTML = "";

    bookings.forEach((booking) => {

        const statusBadge = statusLabel(booking.status);

        ridesList.innerHTML += `

<div class="card ride-history-card">

    <div class="ride-history-top">
        <strong>Ride #${booking._id.slice(-4)}</strong>
        <span class="status-badge ${booking.status.toLowerCase()}">${statusBadge}</span>
    </div>

    <p><strong>Vehicle:</strong> ${booking.vehicle || "Economy"}</p>
    <p><strong>Distance:</strong> ${booking.distance} km</p>
    <p><strong>Fare:</strong> R${booking.fare}</p>
    ${booking.driverName ? `<p><strong>Driver:</strong> ${booking.driverName}</p>` : ""}
    <p class="ride-history-date">${new Date(booking.createdAt).toLocaleString()}</p>

</div>

`;

    });

}

function statusLabel(status) {

    if (status === "Pending") return "🕒 Waiting for a driver";
    if (status === "Accepted") return "🚗 Driver on the way";
    if (status === "Completed") return "✅ Completed";

    return status;

}

// ================================
// Logout
// ================================
function logout() {
    localStorage.removeItem("passengerToken");
    localStorage.removeItem("passengerInfo");
    window.location.href = "index.html";
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// ================================
// Init + live polling
// ================================
loadMyRides();
setInterval(loadMyRides, 8000);