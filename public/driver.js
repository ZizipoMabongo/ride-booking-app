// ================================
// Load available rides
// ================================

async function loadRides(){

    const response = await fetch(
        "/api/bookings"
    );

    const rides = await response.json();


    const container = document.getElementById("rides");

    container.innerHTML="";


    rides.forEach(ride => {


        if(ride.status === "Pending"){


            container.innerHTML += `

            <div class="ride">

                <h3>Ride Request</h3>

                <p>
                Pickup:
                ${ride.pickup.lat},
                ${ride.pickup.lng}
                </p>


                <p>
                Destination:
                ${ride.destination.lat},
                ${ride.destination.lng}
                </p>


                <p>
                Distance:
                ${ride.distance} km
                </p>


                <p>
                Fare:
                R${ride.fare}
                </p>


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

async function acceptRide(id){


    const response = await fetch(
        `/api/bookings/${id}`,
        {
            method:"PUT",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                status:"Accepted"

            })
        }
    );


    const updatedRide = await response.json();


    alert(
        "Ride accepted successfully!"
    );


    loadRides();

}



// Load when page opens

loadRides();