import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import type { Request } from "express";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/voice/clone", requireAuth, upload.single("audio"), async (req: Request, res): Promise<void> => {
  const clerkUserId = (req as Request & { clerkUserId: string }).clerkUserId;

  if (!req.file) {
    res.status(400).json({ error: "No audio file provided" });
    return;
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    res.status(500).json({ error: "ElevenLabs API key not configured" });
    return;
  }

  req.log.info({ fileSize: req.file.size, mimeType: req.file.mimetype }, "Cloning voice with ElevenLabs");

  const formData = new FormData();
  const arrayBuffer = req.file.buffer.buffer.slice(req.file.buffer.byteOffset, req.file.buffer.byteOffset + req.file.buffer.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: req.file.mimetype || "audio/mpeg" });
  formData.append("name", `user-voice-${clerkUserId}-${Date.now()}`);
  formData.append("files", blob, req.file.originalname || "audio.mp3");
  formData.append("description", "User cloned voice for language learning");

  const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    req.log.error({ status: response.status, error: errorText }, "ElevenLabs voice clone failed");
    res.status(500).json({ error: `Voice cloning failed: ${response.statusText}` });
    return;
  }

  const data = await response.json() as { voice_id: string };
  const voiceId = data.voice_id;

  const user = await getOrCreateUser(clerkUserId);
  await db.update(usersTable).set({ voiceId, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  req.log.info({ voiceId }, "Voice cloned successfully");
  res.json({ voiceId, message: "Voice cloned successfully" });
});

export default router;
