const { MongoClient, ServerApiVersion } = require("mongodb");

const uri =
  "mongodb+srv://misszmabongo_db_user:kg55KDvZ4b4sJeRM@ridebookingcluster.qtolndd.mongodb.net/?retryWrites=true&w=majority&appName=RideBookingCluster";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected!");

    await client.db("admin").command({ ping: 1 });

    console.log("✅ Ping successful!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();