import { desc, eq } from "drizzle-orm";
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
    let existing = user.openId ? this.usersByOpenId.get(user.openId) : undefined;
    if (existing) {
      const updated: User = {
        ...existing,
        name: user.name ?? existing.name,
        email: user.email ?? existing.email,
        avatarColor: user.avatarColor ?? existing.avatarColor,
        loginMethod: user.loginMethod ?? existing.loginMethod,
        role: user.role ?? existing.role,
        lastSignedIn: user.lastSignedIn ?? new Date(),
        updatedAt: new Date(),
      };
      this.users.set(existing.id, updated);
      this.usersByOpenId.set(existing.openId, updated);
      return updated;
    }

    const newUser: User = {
      id: this.nextUserId++,
      openId: user.openId,
      name: user.name ?? "Guest " + Math.floor(1000 + Math.random() * 9000),
      email: user.email ?? null,
      avatarColor: user.avatarColor ?? "#D6FF3F",
      loginMethod: user.loginMethod ?? "guest",
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    this.users.set(newUser.id, newUser);
    this.usersByOpenId.set(newUser.openId, newUser);
    return newUser;
  }

  getUserById(id: number): User | undefined {
    return this.users.get(id);
  }

  getUserByOpenId(openId: string): User | undefined {
    return this.usersByOpenId.get(openId);
  }

  createRoom(room: InsertRoom): Room {
    const newRoom: Room = {
      id: this.nextRoomId++,
      code: room.code,
      title: room.title,
      platform: room.platform ?? "youtube",
      contentUrl: room.contentUrl,
      hostId: room.hostId,
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
    return newRoom;
  }

  getRoomByCode(code: string): Room | undefined {
    return this.roomsByCode.get(code.toUpperCase());
  }

  getRoomById(id: number): Room | undefined {
    return this.rooms.get(id);
  }

  listActiveRooms(): Room[] {
    return Array.from(this.rooms.values())
      .filter(r => r.settings.isPublic)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 20);
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
      email: user.email,
      avatarColor: user.avatarColor,
      loginMethod: user.loginMethod,
      role: user.openId === ENV.ownerOpenId ? "admin" : (user.role ?? "user"),
      lastSignedIn: new Date(),
    };

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: {
        name: values.name,
        email: values.email,
        avatarColor: values.avatarColor,
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

export async function createRoom(room: InsertRoom): Promise<Room> {
  const db = await getDb();
  if (!db) {
    return memoryStore.createRoom(room);
  }

  try {
    const [inserted] = await db.insert(rooms).values(room).$returningId();
    const result = await db.select().from(rooms).where(eq(rooms.id, inserted.id)).limit(1);
    return result[0];
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

export async function listActiveRooms(): Promise<Room[]> {
  const db = await getDb();
  if (!db) {
    return memoryStore.listActiveRooms();
  }

  try {
    const result = await db.select().from(rooms).orderBy(desc(rooms.updatedAt)).limit(20);
    return result.length > 0 ? result : memoryStore.listActiveRooms();
  } catch (error) {
    return memoryStore.listActiveRooms();
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
    if (isHost) {
      await db.delete(messages).where(eq(messages.id, messageId));
    } else {
      await db.delete(messages).where(eq(messages.id, messageId));
    }
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
