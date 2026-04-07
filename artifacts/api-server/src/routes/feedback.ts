import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { requireAuth } from "../lib/auth";
import { GetFeedbackBody } from "@workspace/api-zod";
import type { Request } from "express";

const router: IRouter = Router();

router.post("/feedback", requireAuth, async (req: Request, res): Promise<void> => {
  const parsed = GetFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid feedback body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userText, expectedPhrases, language } = parsed.data;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  req.log.info({ language, userText }, "Generating language feedback");

  const prompt = expectedPhrases.length > 0
    ? `A student learning ${language} said: "${userText}"
       
       Expected phrases to practice: ${expectedPhrases.join(", ")}
       
       Provide feedback with up to 2 specific corrections. If their statement is perfect, provide encouraging feedback with 0 corrections.
       
       Return ONLY valid JSON (no markdown) in this format:
       {
         "corrections": [
           {
             "original": "what they said",
             "corrected": "the correct version",
             "explanation": "brief explanation in English"
           }
         ],
         "improvedSentence": "a more natural/correct version of what they tried to say"
       }`
    : `A student learning ${language} said: "${userText}"
       
       Provide brief language feedback. If correct, confirm and provide a natural variation.
       
       Return ONLY valid JSON (no markdown) in this format:
       {
         "corrections": [],
         "improvedSentence": "a natural, correct version of the sentence"
       }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a ${language} language teacher. Give concise, helpful feedback. Always return valid JSON.`,
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content ?? "";

  let feedbackData: { corrections: Array<{ original: string; corrected: string; explanation: string }>; improvedSentence: string };
  try {
    feedbackData = JSON.parse(content);
  } catch {
    req.log.error({ content }, "Failed to parse feedback JSON");
    feedbackData = {
      corrections: [],
      improvedSentence: userText,
    };
  }

  res.json(feedbackData);
});

export default router;
