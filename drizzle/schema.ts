import {
  boolean,
  double,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing authentication and profiles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarColor: varchar("avatarColor", { length: 32 }).default("#D6FF3F"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Watch party rooms.
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 64 }).notNull().default("youtube"),
  contentUrl: text("contentUrl").notNull(),
  hostId: int("hostId").notNull(),
  isPlaying: boolean("isPlaying").notNull().default(false),
  currentPosition: double("currentPosition").notNull().default(0),
  positionUpdatedAt: timestamp("positionUpdatedAt").defaultNow().notNull(),
  settings: json("settings").$type<{
    hostOnlyControls: boolean;
    lockSeeking: boolean;
    allowReactions: boolean;
    allowVoice: boolean;
    isPublic: boolean;
  }>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Members participating in a watch party room.
 */
export const roomMembers = mysqlTable("roomMembers", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["host", "moderator", "participant"]).default("participant").notNull(),
  isMuted: boolean("isMuted").default(false).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
});

export type RoomMember = typeof roomMembers.$inferSelect;
export type InsertRoomMember = typeof roomMembers.$inferInsert;

/**
 * Persistent chat messages within a room.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  senderName: varchar("senderName", { length: 128 }).notNull(),
  senderColor: varchar("senderColor", { length: 32 }).notNull().default("#8EABE9"),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["chat", "system"]).default("chat").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Playback audit log for reconciliation and history.
 */
export const playbackEvents = mysqlTable("playbackEvents", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 32 }).notNull(), // play | pause | seek | sync
  position: double("position").notNull(),
  serverTimestamp: timestamp("serverTimestamp").defaultNow().notNull(),
});

export type PlaybackEvent = typeof playbackEvents.$inferSelect;
export type InsertPlaybackEvent = typeof playbackEvents.$inferInsert;