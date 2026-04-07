import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, curriculaTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { GenerateCurriculumBody } from "@workspace/api-zod";
import type { Request } from "express";

const router: IRouter = Router();

router.post("/curriculum", requireAuth, async (req: Request, res): Promise<void> => {
  const clerkUserId = (req as Request & { clerkUserId: string }).clerkUserId;

  const parsed = GenerateCurriculumBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid curriculum body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { language, level, goal } = parsed.data;
  const user = await getOrCreateUser(clerkUserId);

  req.log.info({ language, level, goal }, "Generating curriculum");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a language learning curriculum designer. Create a structured 7-day curriculum for a student learning ${language} at a ${level} level. Their goal is: ${goal}. 
        
        Return ONLY a valid JSON array (no markdown, no explanation) with exactly 7 objects in this format:
        [
          {
            "day": 1,
            "title": "Lesson title",
            "phrases": ["phrase1", "phrase2", "phrase3", "phrase4", "phrase5"],
            "scenario": "Brief description of the conversation scenario",
            "task": "What the student should accomplish in this lesson"
          }
        ]
        
        Make the lessons progressively more challenging and build on each other. Keep phrases practical and relevant to real conversations.`,
      },
      {
        role: "user",
        content: `Generate a 7-day ${language} curriculum for ${level} level. Goal: ${goal}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content ?? "";

  let days;
  try {
    days = JSON.parse(content);
  } catch {
    req.log.error({ content }, "Failed to parse curriculum JSON");
    res.status(500).json({ error: "Failed to generate curriculum" });
    return;
  }

  const existingCurricula = await db.select().from(curriculaTable).where(eq(curriculaTable.userId, user.id));
  if (existingCurricula.length > 0) {
    await db.delete(curriculaTable).where(eq(curriculaTable.userId, user.id));
  }

  const [curriculum] = await db.insert(curriculaTable).values({
    userId: user.id,
    language,
    level,
    goal,
    days,
  }).returning();

  req.log.info({ curriculumId: curriculum.id }, "Curriculum generated successfully");

  res.json({
    curriculum: {
      id: curriculum.id,
      language: curriculum.language,
      level: curriculum.level,
      goal: curriculum.goal,
      days: curriculum.days,
    },
  });
});

export default router;
