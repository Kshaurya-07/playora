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
  avatarUrl: text("avatarUrl"),
  googleId: varchar("googleId", { length: 128 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

  // Enhanced Social & Identity fields
  username: varchar("username", { length: 64 }),
  playoraId: varchar("playoraId", { length: 64 }), // e.g. "@kumarplays"
  bio: text("bio"),
  isOnline: boolean("isOnline").default(false).notNull(),
  ghostMode: boolean("ghostMode").default(false).notNull(),
  activityVisibility: mysqlEnum("activityVisibility", ["public", "friends", "none"])
    .default("friends")
    .notNull(),
  profileVisibility: mysqlEnum("profileVisibility", ["public", "friends", "private"])
    .default("public")
    .notNull(),
  allowFriendRequests: boolean("allowFriendRequests").default(true).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),

  // Current live activity state
  currentRoomCode: varchar("currentRoomCode", { length: 32 }),
  currentActivityTitle: text("currentActivityTitle"),
  currentActivityPlatform: varchar("currentActivityPlatform", { length: 64 }),

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
  code: varchar("code", { length: 32 }).notNull().unique(), // e.g. PO-7XK29A
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).default("movies").notNull(),
  platform: varchar("platform", { length: 64 }).notNull().default("youtube"),
  contentUrl: text("contentUrl").notNull(),
  hostId: int("hostId").notNull(),
  status: mysqlEnum("status", ["active", "ended"]).default("active").notNull(),

  // Privacy & Access settings
  privacyMode: mysqlEnum("privacyMode", ["public", "friends", "invite_only"])
    .default("public")
    .notNull(),
  accessMode: mysqlEnum("accessMode", ["open", "password", "approval"])
    .default("open")
    .notNull(),
  passwordHash: text("passwordHash"),
  hostOnlyPlayback: boolean("hostOnlyPlayback").default(true).notNull(),
  viewerCount: int("viewerCount").default(0).notNull(),
  maxParticipants: int("maxParticipants").default(100).notNull(),

  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
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
 * Friend relationships between users.
 */
export const friendships = mysqlTable("friendships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  friendId: int("friendId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "blocked"])
    .default("pending")
    .notNull(),
  initiatorId: int("initiatorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = typeof friendships.$inferInsert;

/**
 * Invitations to private or friends-only watch parties.
 */
export const partyInvites = mysqlTable("partyInvites", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 32 }).notNull(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "expired"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type PartyInvite = typeof partyInvites.$inferSelect;
export type InsertPartyInvite = typeof partyInvites.$inferInsert;

/**
 * Requests to join an approval-required watch party.
 */
export const partyJoinRequests = mysqlTable("partyJoinRequests", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 32 }).notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartyJoinRequest = typeof partyJoinRequests.$inferSelect;
export type InsertPartyJoinRequest = typeof partyJoinRequests.$inferInsert;

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
  leftAt: timestamp("leftAt"),
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