require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const aiRoutes = require("./routes/aiRoutes");
const userRoutes = require("./routes/userRoutes");


const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, "http://localhost:3000"] 
    : "*",
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Backend is running.",
    frontend: "http://localhost:3000",
    health: "/api/health"
  });
});

app.get("/babysit", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "This is a backend route, not a frontend page.",
    frontend: "http://localhost:3000"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB connection failed:", error.message);
    process.exit(1);
  });
