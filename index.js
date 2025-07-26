import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import createHttpError, { isHttpError } from "http-errors";
import session from "express-session";
import MongoStore from "connect-mongo";

import userRoutes from "./routes/user.js";
import productRoutes from "./routes/product.js";
import orderRoutes from "./routes/order.js";
import foodShareRoutes from "./routes/foodShare.js";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
dotenv.config();

const corsOptions = {
  credentials: true,
  origin: process.env.NODE_ENV === "production" ? "https://www.sayfoods.co/" : "http://localhost:5173",
};
app.use(cors(corsOptions));

// Setup session store
app.use(
  session({
    name: "SAYFOODS",
    secret: process.env.SESSION_SECRET, // Secret used to sign the session ID cookie
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      collectionName: "sessions",
      ttl: 60 * 60 * 24, // Session TTL (time to live) in seconds (1 day)
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // Cookie expiration time in milliseconds (1 day),
      httpOnly: true, //  Prevent client-side JS from reading the cookie
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Cross-origin handling
    },
    rolling: true, // Reset expiration on every request
  })
);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/food-share", foodShareRoutes);

// Wrong endpoint error handling
app.use((_req, _res, next) => {
  next(createHttpError(404, "Endpoint not found"));
});

// Global error handler
app.use((error, _req, res, _next) => {
  const statusCode = isHttpError(error) ? error.status : 500;
  const message = isHttpError(error)
    ? error.message
    : "An unknown error occurred";
  res.status(statusCode).json({ error: message });
  console.log(error);
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => app.listen(8000, () => console.log("APP CONNECTED")))
  .catch((error) => console.log(error));
