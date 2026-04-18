import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import OpenAI from "openai";

dotenv.config();

const app = express();
const maxUploadBytes = 25 * 1024 * 1024;
const upload = multer({
  limits: { fileSize: maxUploadBytes },
  storage: multer.memoryStorage(),
});
const port = Number(process.env.PORT || 3001);
const model = process.env.TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const supportedExtensions = new Set([".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".wav", ".webm"]);

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is missing. The transcription endpoint will fail until it is configured.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    model,
    service: "live-audio-transcriber-server",
  });
});

app.post("/api/transcribe", upload.single("file"), async (request, response) => {
  const uploadedFile = request.file;

  if (!uploadedFile) {
    response.status(400).json({ error: "No audio file was provided in the file field." });
    return;
  }

  const extension = path.extname(uploadedFile.originalname) || ".m4a";
  if (!supportedExtensions.has(extension.toLowerCase())) {
    response.status(400).json({
      error: "Unsupported audio format. Use m4a, mp3, mp4, mpeg, mpga, wav, or webm.",
    });
    return;
  }

  const tempFile = path.join(os.tmpdir(), `upload-${Date.now()}${extension}`);

  try {
    await fs.promises.writeFile(tempFile, uploadedFile.buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFile),
      language: request.body.language || undefined,
      model,
      response_format: "json",
    });

    response.json({
      text: transcription.text,
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected transcription failure.",
    });
  } finally {
    await fs.promises.rm(tempFile, { force: true }).catch(() => {});
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({
      error: `Audio file is too large. The current transcription limit is ${Math.round(maxUploadBytes / (1024 * 1024))} MB.`,
    });
    return;
  }

  response.status(500).json({
    error: error instanceof Error ? error.message : "Unexpected server failure.",
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Transcription server running on http://0.0.0.0:${port}`);
});
