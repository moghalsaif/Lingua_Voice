import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, curriculaTable } from "@workspace/db";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { UpdateUserVoiceBody } from "@workspace/api-zod";
import type { Request } from "express";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req: Request, res): Promise<void> => {
  const clerkUserId = (req as Request & { clerkUserId: string }).clerkUserId;

  const user = await getOrCreateUser(clerkUserId);

  const curricula = await db.select().from(curriculaTable).where(eq(curriculaTable.userId, user.id)).orderBy(curriculaTable.createdAt);
  const latestCurriculum = curricula[curricula.length - 1] ?? null;

  res.json({
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    voiceId: user.voiceId,
    hasVoice: !!user.voiceId,
    curriculum: latestCurriculum ? {
      id: latestCurriculum.id,
      language: latestCurriculum.language,
      level: latestCurriculum.level,
      goal: latestCurriculum.goal,
      days: latestCurriculum.days,
    } : null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/users/me/voice", requireAuth, async (req: Request, res): Promise<void> => {
  const clerkUserId = (req as Request & { clerkUserId: string }).clerkUserId;
  const user = await getOrCreateUser(clerkUserId);

  const parsed = UpdateUserVoiceBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid voice update body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ voiceId: parsed.data.voiceId, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  const curricula = await db.select().from(curriculaTable).where(eq(curriculaTable.userId, user.id)).orderBy(curriculaTable.createdAt);
  const latestCurriculum = curricula[curricula.length - 1] ?? null;

  res.json({
    id: updated.id,
    clerkUserId: updated.clerkUserId,
    email: updated.email,
    voiceId: updated.voiceId,
    hasVoice: !!updated.voiceId,
    curriculum: latestCurriculum ? {
      id: latestCurriculum.id,
      language: latestCurriculum.language,
      level: latestCurriculum.level,
      goal: latestCurriculum.goal,
      days: latestCurriculum.days,
    } : null,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
