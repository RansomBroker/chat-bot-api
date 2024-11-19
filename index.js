require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const debug = require("debug")("app:debug");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { botPrompt } = require("./prompt");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper untuk mendapatkan timestamp
const getCurrentTimestamp = () => new Date().toISOString();

// Middleware 2: CORS
app.use(
  cors({
    origin: "*", // Mengizinkan semua domain (ubah sesuai kebutuhan)
    methods: ["GET", "POST", "PUT", "DELETE"], // Metode yang diizinkan
  })
);

app.use(morgan("dev"));
debug("Server sedang diinisialisasi...");

app.get("/", (req, res) => {
  debug("Request ke endpoint utama diterima.");
  res.json({ message: "Server Work" });
});

// Endpoint untuk memproses percakapan
app.post("/chat", async (req, res) => {
  try {
    const { chatHistory, userMsg } = req.body;

    if (!chatHistory || !userMsg) {
      return res
        .status(400)
        .json({ error: "Chat history and user message are required." });
    }

    // Format riwayat percakapan menjadi prompt
    const conversationHistory = chatHistory
      .map((message) =>
        message.sender === "user"
          ? `User: ${message.text}`
          : `Agent: ${message.text}`
      )
      .join("\n");

    const prompt = `${conversationHistory}\nUser: ${userMsg}\nAgent:`;

    const genAI = new GoogleGenerativeAI(process.env.VITE_BARD_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-002",
      generationConfig: { temperature: 1.3 },
      systemInstruction: botPrompt,
    });
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const removeBackticks = responseText.replace(/```/g, "");
    const jsonLabel = removeBackticks.replace(/json/g, "");
    const respond = JSON.parse(jsonLabel);

    // Kirim seluruh riwayat percakapan ke klien
    res.json(respond);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  debug(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
