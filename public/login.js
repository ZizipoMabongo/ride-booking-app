async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageEl = document.getElementById("message");

    try {
        const response = await fetch("/api/drivers/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            messageEl.innerHTML = data.message || "Login failed";
            return;
        }

        localStorage.setItem("driverToken", data.token);
        localStorage.setItem("driverInfo", JSON.stringify(data.driver));

        window.location.href = "driver.html";

    } catch (error) {
        messageEl.innerHTML = "Something went wrong. Try again.";
    }
}