import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const PLATFORM_USER_LIMIT = 20;

export class PlatformCapacityError extends Error {
  readonly code = "PLATFORM_CAPACITY_REACHED";
  constructor() {
    super("Platform capacity reached");
    Object.setPrototypeOf(this, PlatformCapacityError.prototype);
  }
}

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

export const getOrCreateUser = async (clerkUserId: string) => {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  if (existing.length > 0) {
    return existing[0];
  }

  const allUsers = await db.select({ id: usersTable.id }).from(usersTable);
  if (allUsers.length >= PLATFORM_USER_LIMIT) {
    throw new PlatformCapacityError();
  }

  let email = "";
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  } catch {
    // non-fatal — email can be updated later
  }

  const [newUser] = await db.insert(usersTable).values({
    clerkUserId,
    email,
  }).returning();

  return newUser;
};
