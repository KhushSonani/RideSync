import express from 'express';
import cors from "cors";

import userRoutes from "./src/routes/user.routes.js";
import driverRoutes from "./src/routes/driver.routes.js";
import rideRoutes from "./src/routes/ride.routes.js";

import { multerErrorHandler } from "./src/middlewares/multer.middleware.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send("It's working!");
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/rides", rideRoutes);

app.use(multerErrorHandler);
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});


export default app;

