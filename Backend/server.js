import "./src/config/env.js";

import http from "http";
import app from "./app.js";
import connectToDb from "./src/db/db.js";
import { config } from "./src/config/env.js";
import { initializeSocket } from "./src/Socket/socket.js";

const PORT = config.PORT || 4000;
async function startServer() {
  try {
    await connectToDb();
    const server = http.createServer(app);

    initializeSocket(server);

    server.listen(PORT || 8000, () => {
      console.log(`⚙️  Server is running on PORT ${PORT}.`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

startServer();