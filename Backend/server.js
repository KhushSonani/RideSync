import http from "http";
import app from "./app.js";
import connectToDb from "./src/db/db.js";

const PORT = process.env.PORT || 3000;
async function startServer() {
  try {
    await connectToDb();
    const server = http.createServer(app);
    server.listen(PORT || 8000, () => {
      console.log(`⚙️  Server is running on PORT ${PORT}.`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

startServer();