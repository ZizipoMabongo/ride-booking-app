const token = localStorage.getItem("driverToken");
const driverInfo = JSON.parse(localStorage.getItem("driverInfo"));

if (!token) {
    window.location.href = "login.html";
}

if (driverInfo) {
    document.getElementById("driverName").innerHTML = `Welcome, ${driverInfo.name} 👋`;
}

// ================================
// Load available rides
// ================================
async function loadRides() {
    const response = await fetch("/api/bookings");
    const rides = await response.json();

    const container = document.getElementById("rides");
    container.innerHTML = "";

    rides.forEach(ride => {

    if (ride.status === "Pending") {

        container.innerHTML += `

<div class="ride">

<h3>🚖 Ride Request</h3>

<p><strong>Passenger:</strong> ${ride.passengerName}</p>

<p><strong>Phone:</strong> ${ride.passengerPhone}</p>

<p><strong>Vehicle:</strong> ${ride.vehicle || "Economy"}</p>

<p><strong>Distance:</strong> ${ride.distance} km</p>

<p><strong>Fare:</strong> R${ride.fare}</p>

<p><strong>Status:</strong> ${ride.status}</p>

<button onclick="acceptRide('${ride._id}')">
    Accept Ride
</button>

</div>

`;

    }

});

}

// ================================
// Accept ride
// ================================
async function acceptRide(id) {
    const response = await fetch(`/api/bookings/${id}/accept`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "Accepted" })
    });

    if (response.status === 401) {
        alert("Session expired. Please log in again.");
        logout();
        return;
    }

    await response.json();
    alert("Ride accepted successfully!");
    loadRides();
}

function logout() {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverInfo");
    window.location.href = "index.html";
}

loadRides();

document.getElementById("logoutBtn").addEventListener("click", logout);