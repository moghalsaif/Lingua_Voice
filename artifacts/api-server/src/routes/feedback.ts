import { Router, type IRouter } from "express";
import { requireAuth } from "../lib/auth";
import { GetFeedbackBody } from "@workspace/api-zod";
import { openrouter } from "@workspace/integrations-openrouter-ai";
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

  req.log.info({ language }, "Generating language feedback");

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

  const completion = await openrouter.chat.completions.create({
    model: "openai/gpt-4o-mini",
    max_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are a ${language} language teacher. Give concise, helpful feedback. Always return valid JSON.`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content ?? "";

  let feedbackData: { corrections: Array<{ original: string; corrected: string; explanation: string }>; improvedSentence: string };
  try {
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    feedbackData = JSON.parse(cleaned);
  } catch {
    req.log.error("Failed to parse feedback JSON");
    feedbackData = {
      corrections: [],
      improvedSentence: userText,
    };
  }

  res.json(feedbackData);
});

export default router;
