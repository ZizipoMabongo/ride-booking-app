const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const response = await fetch("/api/passengers/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("passengerToken", data.token);
            localStorage.setItem("passengerInfo", JSON.stringify(data.passenger));

            message.style.color = "green";
            message.textContent = "Login successful! Redirecting...";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 800);
        } else {
            message.style.color = "red";
            message.textContent = data.message || "Login failed";
        }
    } catch (error) {
        console.error(error);
        message.style.color = "red";
        message.textContent = "Unable to connect to the server.";
    }
});