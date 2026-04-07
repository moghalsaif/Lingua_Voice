import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import type { Request } from "express";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const ConversationFieldsSchema = z.object({
  day: z.coerce.number().int().min(1).max(7),
  language: z.string().min(1).max(100),
  scenario: z.string().max(500).optional(),
});

const ALLOWED_AUDIO_MIMETYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
  "audio/mp4",
];

router.post("/conversation", requireAuth, upload.single("audio"), async (req: Request, res): Promise<void> => {
  const clerkUserId = (req as Request & { clerkUserId: string }).clerkUserId;

  if (!req.file) {
    res.status(400).json({ error: "No audio file provided" });
    return;
  }

  if (!ALLOWED_AUDIO_MIMETYPES.includes(req.file.mimetype)) {
    res.status(400).json({ error: "Invalid audio file type" });
    return;
  }

  const parsed = ConversationFieldsSchema.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid conversation request body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { day, language, scenario } = parsed.data;

  const openaiKey = process.env.OPENAI_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!openaiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  const user = await getOrCreateUser(clerkUserId);
  const openai = new OpenAI({ apiKey: openaiKey });

  req.log.info({ day, language }, "Processing conversation message");

  const arrayBuffer = req.file.buffer.buffer.slice(req.file.buffer.byteOffset, req.file.buffer.byteOffset + req.file.buffer.byteLength) as ArrayBuffer;
  const audioFile = new File([arrayBuffer], req.file.originalname || "audio.webm", {
    type: req.file.mimetype || "audio/webm",
  });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
  });

  const transcript = transcription.text;
  req.log.info({ transcript }, "Audio transcribed");

  const systemPrompt = scenario
    ? `You are a friendly ${language} language tutor helping a student practice. The scenario is: ${scenario}. 
       Respond naturally in ${language} (keep it simple for learners). 
       Keep your response to 1-2 sentences only. Be encouraging and conversational.`
    : `You are a friendly ${language} language tutor helping a student practice on day ${day} of their learning journey. 
       Respond naturally in ${language} (keep it simple for learners).
       Keep your response to 1-2 sentences only. Be encouraging and conversational.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  const aiText = completion.choices[0]?.message?.content ?? "Great job! Keep practicing.";
  req.log.info({ aiText }, "AI response generated");

  let audioBase64 = "";

  if (elevenLabsKey) {
    const voiceId = user.voiceId ?? "21m00Tcm4TlvDq8ikWAM";
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: aiText,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer();
      audioBase64 = Buffer.from(audioBuffer).toString("base64");
      req.log.info({ hasVoice: !!user.voiceId }, "TTS audio generated");
    } else {
      req.log.warn({ status: ttsResponse.status }, "TTS failed");
    }
  }

  res.json({
    text: aiText,
    audio: audioBase64,
    transcript,
  });
});

export default router;
