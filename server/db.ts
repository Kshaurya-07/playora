import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMessage,
  InsertPlaybackEvent,
  InsertRoom,
  InsertRoomMember,
  InsertUser,
  Message,
  PlaybackEvent,
  Room,
  RoomMember,
  User,
  messages,
  playbackEvents,
  roomMembers,
  rooms,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// In-Memory Storage Fallback for local development and zero-dependency operation
class MemoryStore {
  users = new Map<number, User>();
  usersByOpenId = new Map<string, User>();
  usersByEmail = new Map<string, User>();
  usersByGoogleId = new Map<string, User>();

  rooms = new Map<number, Room>();
  roomsByCode = new Map<string, Room>();
  members = new Map<number, RoomMember>();
  messages = new Map<number, Message>();
  events = new Map<number, PlaybackEvent>();

  private nextUserId = 1;
  private nextRoomId = 1;
  private nextMemberId = 1;
  private nextMessageId = 1;
  private nextEventId = 1;

  upsertUser(user: InsertUser): User {
    let existing: User | undefined;
    if (user.openId) {
      existing = this.usersByOpenId.get(user.openId);
    }
    if (!existing && user.googleId) {
      existing = this.usersByGoogleId.get(user.googleId);
    }
    if (!existing && user.email) {
      existing = this.usersByEmail.get(user.email.toLowerCase().trim());
    }

    if (existing) {
      const updated: User = {
        ...existing,
        name: user.name ?? existing.name,
        email: user.email ? user.email.toLowerCase().trim() : existing.email,
        avatarColor: user.avatarColor ?? existing.avatarColor,
        avatarUrl: user.avatarUrl ?? existing.avatarUrl,
        googleId: user.googleId ?? existing.googleId,
        loginMethod: user.loginMethod ?? existing.loginMethod,
        role: user.role ?? existing.role,
        lastSignedIn: user.lastSignedIn ?? new Date(),
        updatedAt: new Date(),
      };
      this.users.set(existing.id, updated);
      if (updated.openId) this.usersByOpenId.set(updated.openId, updated);
      if (updated.googleId) this.usersByGoogleId.set(updated.googleId, updated);
      if (updated.email) this.usersByEmail.set(updated.email.toLowerCase().trim(), updated);
      return updated;
    }

    const newUser: User = {
      id: this.nextUserId++,
      openId: user.openId,
      name: user.name ?? "Guest " + Math.floor(1000 + Math.random() * 9000),
      email: user.email ? user.email.toLowerCase().trim() : null,
      avatarColor: user.avatarColor ?? "#D6FF3F",
      avatarUrl: user.avatarUrl ?? null,
      googleId: user.googleId ?? null,
      loginMethod: user.loginMethod ?? "guest",
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    this.users.set(newUser.id, newUser);
    if (newUser.openId) this.usersByOpenId.set(newUser.openId, newUser);
    if (newUser.googleId) this.usersByGoogleId.set(newUser.googleId, newUser);
    if (newUser.email) this.usersByEmail.set(newUser.email.toLowerCase().trim(), newUser);
    return newUser;
  }

  getUserById(id: number): User | undefined {
    return this.users.get(id);
  }

  getUserByOpenId(openId: string): User | undefined {
    return this.usersByOpenId.get(openId);
  }

  getUserByEmail(email: string): User | undefined {
    return this.usersByEmail.get(email.toLowerCase().trim());
  }

  getUserByGoogleId(googleId: string): User | undefined {
    return this.usersByGoogleId.get(googleId);
  }

  updateUserProfile(
    userId: number,
    data: { name?: string; avatarColor?: string; avatarUrl?: string }
  ): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    if (data.name !== undefined) user.name = data.name.trim();
    if (data.avatarColor !== undefined) user.avatarColor = data.avatarColor;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    if (user.openId) this.usersByOpenId.set(user.openId, user);
    if (user.googleId) this.usersByGoogleId.set(user.googleId, user);
    if (user.email) this.usersByEmail.set(user.email.toLowerCase().trim(), user);
    return user;
  }

  createRoom(room: InsertRoom): Room {
    const newRoom: Room = {
      id: this.nextRoomId++,
      code: room.code,
      title: room.title,
      platform: room.platform ?? "youtube",
      contentUrl: room.contentUrl,
      hostId: room.hostId,
      status: room.status ?? "active",
      startedAt: room.startedAt ?? new Date(),
      endedAt: room.endedAt ?? null,
      isPlaying: room.isPlaying ?? false,
      currentPosition: room.currentPosition ?? 0,
      positionUpdatedAt: new Date(),
      settings: room.settings ?? {
        hostOnlyControls: true,
        lockSeeking: false,
        allowReactions: true,
        allowVoice: true,
        isPublic: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rooms.set(newRoom.id, newRoom);
    this.roomsByCode.set(newRoom.code.toUpperCase(), newRoom);

    // Host automatically joins as member
    this.recordMemberJoin(newRoom.id, newRoom.hostId, "host");

    return newRoom;
  }

  getRoomByCode(code: string): Room | undefined {
    return this.roomsByCode.get(code.toUpperCase());
  }

  getRoomById(id: number): Room | undefined {
    return this.rooms.get(id);
  }

  endRoom(roomId: number): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.status = "ended";
    room.endedAt = new Date();
    room.isPlaying = false;
    room.updatedAt = new Date();

    // Mark active members as left
    for (const member of this.members.values()) {
      if (member.roomId === roomId && !member.leftAt) {
        member.leftAt = new Date();
      }
    }

    return room;
  }

  listActiveRooms(): Room[] {
    return Array.from(this.rooms.values())
      .filter(r => r.status === "active" && (r.settings?.isPublic !== false))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 30);
  }

  listHistoryRooms(userId?: number): Room[] {
    return Array.from(this.rooms.values())
      .filter(r => {
        if (r.status !== "ended") return false;
        if (!userId) return true;
        if (r.hostId === userId) return true;
        return Array.from(this.members.values()).some(
          m => m.roomId === r.id && m.userId === userId
        );
      })
      .sort((a, b) => {
        const timeB = b.endedAt?.getTime() ?? b.updatedAt.getTime();
        const timeA = a.endedAt?.getTime() ?? a.updatedAt.getTime();
        return timeB - timeA;
      })
      .slice(0, 50);
  }

  updateRoomPlayback(
    roomId: number,
    isPlaying: boolean,
    currentPosition: number
  ): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.isPlaying = isPlaying;
    room.currentPosition = currentPosition;
    room.positionUpdatedAt = new Date();
    room.updatedAt = new Date();
    return room;
  }

  updateRoomSettings(
    roomId: number,
    settings: Partial<Room["settings"]>
  ): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.settings = { ...room.settings, ...settings };
    room.updatedAt = new Date();
    return room;
  }

  updateRoomContent(
    roomId: number,
    contentUrl: string,
    platform: string,
    title?: string
  ): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.contentUrl = contentUrl;
    room.platform = platform;
    if (title) room.title = title;
    room.isPlaying = false;
    room.currentPosition = 0;
    room.positionUpdatedAt = new Date();
    room.updatedAt = new Date();
    return room;
  }

  updateRoomHost(roomId: number, hostId: number): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.hostId = hostId;
    room.updatedAt = new Date();
    return room;
  }

  recordMemberJoin(
    roomId: number,
    userId: number,
    role: "host" | "moderator" | "participant" = "participant"
  ): RoomMember {
    const existing = Array.from(this.members.values()).find(
      m => m.roomId === roomId && m.userId === userId
    );
    if (existing) {
      existing.role = role;
      existing.leftAt = null;
      existing.lastSeenAt = new Date();
      return existing;
    }
    const newMember: RoomMember = {
      id: this.nextMemberId++,
      roomId,
      userId,
      role,
      isMuted: false,
      joinedAt: new Date(),
      leftAt: null,
      lastSeenAt: new Date(),
    };
    this.members.set(newMember.id, newMember);
    return newMember;
  }

  recordMemberLeave(roomId: number, userId: number): void {
    const existing = Array.from(this.members.values()).find(
      m => m.roomId === roomId && m.userId === userId && !m.leftAt
    );
    if (existing) {
      existing.leftAt = new Date();
      existing.lastSeenAt = new Date();
    }
  }

  getUserStats(userId: number) {
    const hosted = Array.from(this.rooms.values()).filter(r => r.hostId === userId);
    const hostedCount = hosted.length;

    const joinedRoomIds = new Set(
      Array.from(this.members.values())
        .filter(m => m.userId === userId && m.role !== "host")
        .map(m => m.roomId)
    );
    const joinedCount = joinedRoomIds.size;

    const activeRooms = hosted.filter(r => r.status === "active");
    const historyRooms = this.listHistoryRooms(userId);

    return {
      hostedCount,
      joinedCount,
      activeRooms,
      historyRooms,
    };
  }

  addMessage(message: InsertMessage): Message {
    const newMsg: Message = {
      id: this.nextMessageId++,
      roomId: message.roomId,
      userId: message.userId,
      senderName: message.senderName,
      senderColor: message.senderColor ?? "#8EABE9",
      content: message.content,
      messageType: message.messageType ?? "chat",
      createdAt: new Date(),
    };
    this.messages.set(newMsg.id, newMsg);
    return newMsg;
  }

  getRoomMessages(roomId: number, limit = 50): Message[] {
    return Array.from(this.messages.values())
      .filter(m => m.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit);
  }

  deleteMessage(messageId: number, requestingUserId: number, isHost = false): boolean {
    const msg = this.messages.get(messageId);
    if (!msg) return false;
    if (msg.userId === requestingUserId || isHost) {
      this.messages.delete(messageId);
      return true;
    }
    return false;
  }

  recordPlaybackEvent(event: InsertPlaybackEvent): PlaybackEvent {
    const newEv: PlaybackEvent = {
      id: this.nextEventId++,
      roomId: event.roomId,
      userId: event.userId,
      eventType: event.eventType,
      position: event.position,
      serverTimestamp: new Date(),
    };
    this.events.set(newEv.id, newEv);
    return newEv;
  }
}

export const memoryStore = new MemoryStore();

export async function upsertUser(user: InsertUser): Promise<User> {
  const db = await getDb();
  if (!db) {
    return memoryStore.upsertUser(user);
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      name: user.name,
      email: user.email ? user.email.toLowerCase().trim() : null,
      avatarColor: user.avatarColor ?? "#D6FF3F",
      avatarUrl: user.avatarUrl ?? null,
      googleId: user.googleId ?? null,
      loginMethod: user.loginMethod ?? "guest",
      role: user.openId === ENV.ownerOpenId ? "admin" : (user.role ?? "user"),
      lastSignedIn: new Date(),
    };

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: {
        name: values.name,
        email: values.email,
        avatarColor: values.avatarColor,
        avatarUrl: values.avatarUrl,
        googleId: values.googleId,
        lastSignedIn: new Date(),
      },
    });

    const found = await getUserByOpenId(user.openId);
    if (found) return found;
    return memoryStore.upsertUser(user);
  } catch (error) {
    console.error("[Database] Failed to upsert user, falling back to memory:", error);
    return memoryStore.upsertUser(user);
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    return memoryStore.getUserByOpenId(openId);
  }

  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : memoryStore.getUserByOpenId(openId);
  } catch (error) {
    console.error("[Database] Failed to get user by openId:", error);
    return memoryStore.getUserByOpenId(openId);
  }
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    return memoryStore.getUserById(id);
  }

  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : memoryStore.getUserById(id);
  } catch (error) {
    return memoryStore.getUserById(id);
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.toLowerCase().trim();
  const db = await getDb();
  if (!db) {
    return memoryStore.getUserByEmail(normalized);
  }

  try {
    const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    return result.length > 0 ? result[0] : memoryStore.getUserByEmail(normalized);
  } catch (error) {
    return memoryStore.getUserByEmail(normalized);
  }
}

export async function getUserByGoogleId(googleId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    return memoryStore.getUserByGoogleId(googleId);
  }

  try {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result.length > 0 ? result[0] : memoryStore.getUserByGoogleId(googleId);
  } catch (error) {
    return memoryStore.getUserByGoogleId(googleId);
  }
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; avatarColor?: string; avatarUrl?: string }
): Promise<User | undefined> {
  memoryStore.updateUserProfile(userId, data);
  const db = await getDb();
  if (!db) {
    return memoryStore.getUserById(userId);
  }

  try {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.avatarColor !== undefined) updateData.avatarColor = data.avatarColor;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    await db.update(users).set(updateData).where(eq(users.id, userId));
    return getUserById(userId);
  } catch (error) {
    console.error("[Database] Failed to update user profile:", error);
    return memoryStore.getUserById(userId);
  }
}

export async function createRoom(room: InsertRoom): Promise<Room> {
  const db = await getDb();
  if (!db) {
    return memoryStore.createRoom(room);
  }

  try {
    const [inserted] = await db.insert(rooms).values(room).$returningId();
    const result = await db.select().from(rooms).where(eq(rooms.id, inserted.id)).limit(1);
    const created = result[0] || memoryStore.createRoom(room);
    
    // Automatically record host membership
    await recordMemberJoin(created.id, created.hostId, "host");
    return created;
  } catch (error) {
    console.error("[Database] Failed to insert room, using memory store:", error);
    return memoryStore.createRoom(room);
  }
}

export async function getRoomByCode(code: string): Promise<Room | undefined> {
  const db = await getDb();
  if (!db) {
    return memoryStore.getRoomByCode(code);
  }

  try {
    const result = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1);
    return result.length > 0 ? result[0] : memoryStore.getRoomByCode(code);
  } catch (error) {
    return memoryStore.getRoomByCode(code);
  }
}

export async function getRoomById(id: number): Promise<Room | undefined> {
  const db = await getDb();
  if (!db) {
    return memoryStore.getRoomById(id);
  }

  try {
    const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return result.length > 0 ? result[0] : memoryStore.getRoomById(id);
  } catch (error) {
    return memoryStore.getRoomById(id);
  }
}

export async function endRoom(roomId: number): Promise<Room | undefined> {
  memoryStore.endRoom(roomId);
  const db = await getDb();
  if (!db) {
    return memoryStore.getRoomById(roomId);
  }

  try {
    const now = new Date();
    await db
      .update(rooms)
      .set({
        status: "ended",
        endedAt: now,
        isPlaying: false,
        updatedAt: now,
      })
      .where(eq(rooms.id, roomId));

    // Mark members as left
    await db
      .update(roomMembers)
      .set({ leftAt: now })
      .where(eq(roomMembers.roomId, roomId));

    return getRoomById(roomId);
  } catch (error) {
    console.error("[Database] Failed to end room:", error);
    return memoryStore.getRoomById(roomId);
  }
}

export async function listActiveRooms(): Promise<Room[]> {
  const db = await getDb();
  if (!db) {
    return memoryStore.listActiveRooms();
  }

  try {
    const result = await db
      .select()
      .from(rooms)
      .where(eq(rooms.status, "active"))
      .orderBy(desc(rooms.updatedAt))
      .limit(30);
    return result.length > 0 ? result : memoryStore.listActiveRooms();
  } catch (error) {
    return memoryStore.listActiveRooms();
  }
}

export async function listHistoryRooms(userId?: number): Promise<Room[]> {
  const db = await getDb();
  if (!db) {
    return memoryStore.listHistoryRooms(userId);
  }

  try {
    if (userId) {
      const result = await db
        .select()
        .from(rooms)
        .where(and(eq(rooms.status, "ended"), eq(rooms.hostId, userId)))
        .orderBy(desc(rooms.endedAt))
        .limit(50);
      return result.length > 0 ? result : memoryStore.listHistoryRooms(userId);
    }

    const result = await db
      .select()
      .from(rooms)
      .where(eq(rooms.status, "ended"))
      .orderBy(desc(rooms.endedAt))
      .limit(50);
    return result.length > 0 ? result : memoryStore.listHistoryRooms(userId);
  } catch (error) {
    return memoryStore.listHistoryRooms(userId);
  }
}

export async function recordMemberJoin(
  roomId: number,
  userId: number,
  role: "host" | "moderator" | "participant" = "participant"
): Promise<RoomMember> {
  const memMember = memoryStore.recordMemberJoin(roomId, userId, role);
  const db = await getDb();
  if (!db) return memMember;

  try {
    const existing = await db
      .select()
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(roomMembers)
        .set({ role, leftAt: null, lastSeenAt: new Date() })
        .where(eq(roomMembers.id, existing[0].id));
      return { ...existing[0], role, leftAt: null, lastSeenAt: new Date() };
    } else {
      const [inserted] = await db
        .insert(roomMembers)
        .values({
          roomId,
          userId,
          role,
          isMuted: false,
          joinedAt: new Date(),
          lastSeenAt: new Date(),
        })
        .$returningId();
      const res = await db.select().from(roomMembers).where(eq(roomMembers.id, inserted.id)).limit(1);
      return res[0] || memMember;
    }
  } catch (error) {
    console.error("[Database] Failed to record member join:", error);
    return memMember;
  }
}

export async function recordMemberLeave(roomId: number, userId: number): Promise<void> {
  memoryStore.recordMemberLeave(roomId, userId);
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(roomMembers)
      .set({ leftAt: new Date(), lastSeenAt: new Date() })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
  } catch (error) {
    console.error("[Database] Failed to record member leave:", error);
  }
}

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) {
    return memoryStore.getUserStats(userId);
  }

  try {
    const hosted = await db.select().from(rooms).where(eq(rooms.hostId, userId));
    const hostedCount = hosted.length;

    const memberships = await db
      .select()
      .from(roomMembers)
      .where(eq(roomMembers.userId, userId));
    const joinedRoomIds = new Set(memberships.map(m => m.roomId));
    const joinedCount = joinedRoomIds.size;

    const activeRooms = hosted.filter(r => r.status === "active");
    const historyRooms = await listHistoryRooms(userId);

    return {
      hostedCount,
      joinedCount,
      activeRooms,
      historyRooms,
    };
  } catch (error) {
    return memoryStore.getUserStats(userId);
  }
}

export async function updateRoomPlayback(
  roomId: number,
  isPlaying: boolean,
  currentPosition: number
): Promise<void> {
  memoryStore.updateRoomPlayback(roomId, isPlaying, currentPosition);
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(rooms)
      .set({
        isPlaying,
        currentPosition,
        positionUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, roomId));
  } catch (error) {
    console.error("[Database] Failed to update room playback:", error);
  }
}

export async function updateRoomSettings(
  roomId: number,
  settings: Partial<Room["settings"]>
): Promise<void> {
  memoryStore.updateRoomSettings(roomId, settings);
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    if (existing[0]) {
      const merged = { ...existing[0].settings, ...settings };
      await db
        .update(rooms)
        .set({ settings: merged, updatedAt: new Date() })
        .where(eq(rooms.id, roomId));
    }
  } catch (error) {
    console.error("[Database] Failed to update room settings:", error);
  }
}

export async function updateRoomContent(
  roomId: number,
  contentUrl: string,
  platform: string,
  title?: string
): Promise<void> {
  memoryStore.updateRoomContent(roomId, contentUrl, platform, title);
  const db = await getDb();
  if (!db) return;

  try {
    const updateData: any = {
      contentUrl,
      platform,
      isPlaying: false,
      currentPosition: 0,
      positionUpdatedAt: new Date(),
      updatedAt: new Date(),
    };
    if (title) updateData.title = title;
    await db.update(rooms).set(updateData).where(eq(rooms.id, roomId));
  } catch (error) {
    console.error("[Database] Failed to update room content:", error);
  }
}

export async function updateRoomHost(roomId: number, hostId: number): Promise<void> {
  memoryStore.updateRoomHost(roomId, hostId);
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(rooms).set({ hostId, updatedAt: new Date() }).where(eq(rooms.id, roomId));
  } catch (error) {
    console.error("[Database] Failed to update room host:", error);
  }
}

export async function addMessage(message: InsertMessage): Promise<Message> {
  const memMsg = memoryStore.addMessage(message);
  const db = await getDb();
  if (!db) return memMsg;

  try {
    await db.insert(messages).values(message);
  } catch (error) {
    console.error("[Database] Failed to insert message:", error);
  }
  return memMsg;
}

export async function getRoomMessages(roomId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) {
    return memoryStore.getRoomMessages(roomId);
  }

  try {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(messages.createdAt)
      .limit(50);
    return result.length > 0 ? result : memoryStore.getRoomMessages(roomId);
  } catch (error) {
    return memoryStore.getRoomMessages(roomId);
  }
}

export async function deleteMessage(messageId: number, userId: number, isHost = false): Promise<boolean> {
  const memDeleted = memoryStore.deleteMessage(messageId, userId, isHost);
  const db = await getDb();
  if (!db) return memDeleted;

  try {
    await db.delete(messages).where(eq(messages.id, messageId));
    return true;
  } catch (error) {
    return memDeleted;
  }
}

export async function recordPlaybackEvent(event: InsertPlaybackEvent): Promise<void> {
  memoryStore.recordPlaybackEvent(event);
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(playbackEvents).values(event);
  } catch (error) {
    console.error("[Database] Failed to record playback event:", error);
  }
}
