const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const response = await fetch("/api/drivers/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Save JWT token
            localStorage.setItem("driverToken", data.token);
            localStorage.setItem("driverInfo", JSON.stringify(data.driver));

            message.style.color = "green";
            message.textContent = "Login successful! Redirecting...";

            setTimeout(() => {
                window.location.href = "/driver.html";
            }, 1000);
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
    token: token,
    driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email
    }
});