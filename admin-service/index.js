import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import adminRoutes from "./routes/adminRoutes.js";
// import { consumeKafkaEvents } from "./kafka/consumer.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 5004;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Admin Service DB connected");
    app.listen(PORT, () => console.log(`Admin Service running on ${PORT}`));
    // consumeKafkaEvents();
  })
  .catch((err) => console.error("DB connection error", err));
