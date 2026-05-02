import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.get('/',(req,res)=>{
    res.send("It's working!");
});

app.use("/api/users", userRouter);

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

