const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const response = await fetch("/api/drivers/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "green";
            message.textContent = "Registration successful! Redirecting to login...";

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1500);
        } else {
            message.style.color = "red";
            message.textContent = data.message;
        }

    } catch (error) {
        console.error(error);
        message.style.color = "red";
        message.textContent = "Unable to connect to the server.";
    }
});