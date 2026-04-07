import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as Request & { clerkUserId: string }).clerkUserId = clerkUserId;
  next();
};

export const getOrCreateUser = async (clerkUserId: string, email?: string) => {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db.insert(usersTable).values({
    clerkUserId,
    email: email ?? "",
  }).returning();

  return newUser;
};
