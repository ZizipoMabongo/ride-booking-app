// ================================
// Emergency SOS Button
// Usage: <script src="emergency.js" data-role="passenger"></script>
//        <script src="emergency.js" data-role="driver"></script>
// Fully self-contained — injects its own button, modal, and styles.
// ================================
(function () {

    const scriptTag = document.currentScript;
    const role = (scriptTag && scriptTag.dataset.role) || "passenger";

    // ================================
    // Styles
    // ================================
    const style = document.createElement("style");
    style.textContent = `
        #sosFloatingBtn{
            position:fixed;
            bottom:24px;
            right:24px;
            z-index:9999;
            background:#DC2626;
            color:white;
            border:none;
            width:62px;
            height:62px;
            border-radius:50%;
            font-size:26px;
            cursor:pointer;
            box-shadow:0 8px 20px rgba(220,38,38,.45);
            display:flex;
            align-items:center;
            justify-content:center;
            transition:.2s;
        }
        #sosFloatingBtn:hover{
            background:#B91C1C;
            transform:scale(1.06);
        }
        #sosOverlay{
            position:fixed;
            inset:0;
            background:rgba(15,23,42,.6);
            z-index:10000;
            display:none;
            align-items:center;
            justify-content:center;
        }
        #sosOverlay.visible{
            display:flex;
        }
        #sosModal{
            background:white;
            border-radius:16px;
            padding:28px;
            width:90%;
            max-width:380px;
            font-family:'Poppins',sans-serif;
            text-align:center;
        }
        #sosModal h2{
            color:#DC2626;
            margin:0 0 8px 0;
            font-size:22px;
        }
        #sosModal p{
            color:#475569;
            font-size:14px;
            margin:0 0 20px 0;
        }
        .sos-action-btn{
            display:block;
            width:100%;
            box-sizing:border-box;
            padding:14px;
            border-radius:10px;
            border:none;
            font-size:15px;
            font-weight:600;
            margin-bottom:12px;
            cursor:pointer;
            text-decoration:none;
            font-family:'Poppins',sans-serif;
        }
        .sos-call-btn{
            background:#DC2626;
            color:white;
        }
        .sos-alert-btn{
            background:#F59E0B;
            color:#111827;
        }
        .sos-cancel-btn{
            background:#E2E8F0;
            color:#334155;
            margin-bottom:0;
        }
        #sosStatusMsg{
            font-size:13px;
            margin:10px 0 0 0;
            min-height:18px;
        }
    `;
    document.head.appendChild(style);

    // ================================
    // DOM: floating button + modal
    // ================================
    const btn = document.createElement("button");
    btn.id = "sosFloatingBtn";
    btn.title = "Emergency";
    btn.textContent = "🚨";
    document.body.appendChild(btn);

    const overlay = document.createElement("div");
    overlay.id = "sosOverlay";
    overlay.innerHTML = `
        <div id="sosModal">
            <h2>🚨 Emergency</h2>
            <p>If you're in immediate danger, call emergency services first.</p>

            <a class="sos-action-btn sos-call-btn" href="tel:112">📞 Call Emergency Services (112)</a>

            <button class="sos-action-btn sos-alert-btn" id="sosAlertBtn" type="button">
                Alert RideConnect Support
            </button>

            <button class="sos-action-btn sos-cancel-btn" id="sosCancelBtn" type="button">
                Cancel
            </button>

            <p id="sosStatusMsg"></p>
        </div>
    `;
    document.body.appendChild(overlay);

    const statusMsg = overlay.querySelector("#sosStatusMsg");

    btn.addEventListener("click", () => {
        overlay.classList.add("visible");
        statusMsg.textContent = "";
    });

    overlay.querySelector("#sosCancelBtn").addEventListener("click", () => {
        overlay.classList.remove("visible");
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.classList.remove("visible");
        }
    });

    // ================================
    // Send alert to backend (with location, if permitted)
    // ================================
    overlay.querySelector("#sosAlertBtn").addEventListener("click", () => {

        statusMsg.style.color = "#475569";
        statusMsg.textContent = "Getting your location...";

        let name = "Unknown";
        let contact = "Unknown";

        if (role === "driver") {

            const driverInfo = JSON.parse(localStorage.getItem("driverInfo") || "null");

            if (driverInfo) {
                name = driverInfo.name;
                contact = driverInfo.email;
            }

        } else {

            const passengerInfo = JSON.parse(localStorage.getItem("passengerInfo") || "null");
            const enteredName = document.getElementById("passengerName");
            const enteredPhone = document.getElementById("passengerPhone");

            if (passengerInfo) {
                name = passengerInfo.name;
                contact = passengerInfo.email;
            } else if (enteredName && enteredName.value) {
                name = enteredName.value;
                contact = enteredPhone ? enteredPhone.value : "Unknown";
            }

        }

        const bookingId = localStorage.getItem("lastBookingId") || null;

        function sendAlert(location) {

            fetch("/api/sos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role, name, contact, bookingId, location })
            })
                .then((res) => res.json())
                .then(() => {
                    statusMsg.style.color = "green";
                    statusMsg.textContent = "✅ Support has been alerted. Stay safe.";
                })
                .catch(() => {
                    statusMsg.style.color = "#DC2626";
                    statusMsg.textContent = "Could not reach support — please call emergency services.";
                });

        }

        if (navigator.geolocation) {

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    sendAlert({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                () => {
                    // Location denied or unavailable — still send the alert without it
                    sendAlert(null);
                },
                { timeout: 5000 }
            );

        } else {

            sendAlert(null);

        }

    });

})();