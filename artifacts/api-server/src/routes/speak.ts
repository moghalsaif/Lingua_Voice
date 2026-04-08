import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import type { Request } from "express";

const router: IRouter = Router();

const SpeakBody = z.object({
  text: z.string().min(1).max(500),
  useClonedVoice: z.boolean().optional().default(false),
});

router.post("/voice/speak", requireAuth, async (req: Request, res): Promise<void> => {
  const clerkUserId = (req as Request & { clerkUserId: string }).clerkUserId;

  const parsed = SpeakBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, useClonedVoice } = parsed.data;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!elevenLabsKey) {
    res.status(500).json({ error: "ElevenLabs API key not configured" });
    return;
  }

  let voiceId = "21m00Tcm4TlvDq8ikWAM"; // default: Rachel (neutral, clear)
  if (useClonedVoice) {
    const user = await getOrCreateUser(clerkUserId);
    if (user.voiceId) voiceId = user.voiceId;
  }

  const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.6, similarity_boost: 0.7 },
    }),
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    req.log.error({ status: ttsResponse.status, error: errorText }, "ElevenLabs TTS failed");
    res.status(500).json({ error: "Text-to-speech failed" });
    return;
  }

  const audioBuffer = await ttsResponse.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");

  req.log.info({ voiceId, textLength: text.length }, "TTS phrase generated");
  res.json({ audio: audioBase64 });
});

export default router;
