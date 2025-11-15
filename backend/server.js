import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import QueryLog from "./models/QueryLog.js";
dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  })
);
// Basic rate limiter to avoid abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // max 30 requests per minute per IP
});
app.use(limiter);

const PORT = process.env.PORT || 5173;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "mistralai/mixtral-8x7b-instruct";

// connect to MongodB


mongoose.connect(process.env.MONGO_URI,{
      useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log(" MongoDB connected"))
.catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});


// POST /query => call OpenRouter, save result, return answer
app.post("/query", async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const payload = {
      model: MODEL,
      messages: [{ role: "user", content: query }]
    };

    const orRes = await axios.post(OPENROUTER_URL, payload, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 60000
    });

    // OpenRouter typically returns choices[0].message.content
    const answer = orRes.data?.choices?.[0]?.message?.content || JSON.stringify(orRes.data);

    // Save to MongoDB
    const doc = await QueryLog.create({
      query,
      answer,
      model: MODEL,
      meta: { raw: orRes.data }
    });

    res.json({ id: doc._id, answer });
  } catch (err) {
    console.error("Error calling OpenRouter:", err.response?.data || err.message);
    res.status(500).json({ error: "LLM call failed", details: err.response?.data || err.message });
  }
});

// GET /history => return recent queries
app.get("/history", async (req, res) => {
  try {
    const logs = await QueryLog.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json({ logs });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Optional: GET /history/:id to get a single item
app.get("/history/:id", async (req, res) => {
  try {
    const doc = await QueryLog.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ log: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});