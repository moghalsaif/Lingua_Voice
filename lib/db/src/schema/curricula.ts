import { pgTable, serial, text, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const CurriculumDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  phrases: z.array(z.string()),
  scenario: z.string(),
  task: z.string(),
});

export type CurriculumDay = z.infer<typeof CurriculumDaySchema>;

export const curriculaTable = pgTable("curricula", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  level: text("level").notNull(),
  goal: text("goal").notNull(),
  days: json("days").$type<CurriculumDay[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCurriculumSchema = createInsertSchema(curriculaTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCurriculum = z.infer<typeof insertCurriculumSchema>;
export type Curriculum = typeof curriculaTable.$inferSelect;
