import crypto from "crypto";
import { and, desc, eq, or, sql, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Friendship,
  InsertFriendship,
  InsertMessage,
  InsertPartyInvite,
  InsertPartyJoinRequest,
  InsertPlaybackEvent,
  InsertRoom,
  InsertRoomMember,
  InsertUser,
  Message,
  PartyInvite,
  PartyJoinRequest,
  PlaybackEvent,
  Room,
  RoomMember,
  User,
  friendships,
  messages,
  partyInvites,
  partyJoinRequests,
  playbackEvents,
  roomMembers,
  rooms,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

export type { User, Room, Friendship, PartyInvite, PartyJoinRequest, Message };
export type ActiveRoomSummary = Room & { userJoinedBefore?: boolean };

let _db: ReturnType<typeof drizzle> | null = null;

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

/**
 * Secure password hashing for watch party room passwords.
 * Plaintext passwords must NEVER be saved or transmitted in plain text.
 */
export function hashRoomPassword(password: string): string {
  const salt = "playora_room_salt_2026";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

export function verifyRoomPassword(password: string, hash?: string | null): boolean {
  if (!hash) return true; // Room has no password
  return hashRoomPassword(password) === hash;
}

/**
 * Helper to generate sanitized, collision-safe PlayOra IDs.
 * Format: @username or @name1234
 */
export function generatePlayoraId(baseName: string): string {
  const clean = baseName.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15) || "user";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `@${clean}${num}`;
}

/**
 * Helper to generate unique human-readable Room IDs.
 * Format: PO-7XK29A
 */
export function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PO-${suffix}`;
}

export type WorldPartyItem = Room & {
  hostName?: string;
  hostAvatar?: string;
  hostPlayoraId?: string;
};

// In-Memory Storage Fallback for local development, zero-dependency hosting, and tests
class MemoryStore {
  users = new Map<number, User>();
  usersByOpenId = new Map<string, User>();
  usersByEmail = new Map<string, User>();
  usersByGoogleId = new Map<string, User>();
  usersByPlayoraId = new Map<string, User>();
  usersByUsername = new Map<string, User>();

  rooms = new Map<number, Room>();
  roomsByCode = new Map<string, Room>();
  members = new Map<number, RoomMember>();
  messages = new Map<number, Message>();
  events = new Map<number, PlaybackEvent>();

  friendships = new Map<number, Friendship>();
  invites = new Map<number, PartyInvite>();
  joinRequests = new Map<number, PartyJoinRequest>();

  private nextUserId = 1;
  private nextRoomId = 1;
  private nextMemberId = 1;
  private nextMessageId = 1;
  private nextEventId = 1;
  private nextFriendshipId = 1;
  private nextInviteId = 1;
  private nextJoinRequestId = 1;

  reset() {
    this.users.clear();
    this.usersByOpenId.clear();
    this.usersByEmail.clear();
    this.usersByGoogleId.clear();
    this.usersByPlayoraId.clear();
    this.usersByUsername.clear();
    this.rooms.clear();
    this.roomsByCode.clear();
    this.members.clear();
    this.messages.clear();
    this.events.clear();
    this.friendships.clear();
    this.invites.clear();
    this.joinRequests.clear();
    this.nextUserId = 1;
    this.nextRoomId = 1;
    this.nextMemberId = 1;
    this.nextMessageId = 1;
    this.nextEventId = 1;
    this.nextFriendshipId = 1;
    this.nextInviteId = 1;
    this.nextJoinRequestId = 1;
  }

  upsertUser(user: Partial<InsertUser>): User {
    let existing: User | undefined;
    if (user.openId) existing = this.usersByOpenId.get(user.openId);
    if (!existing && user.googleId) existing = this.usersByGoogleId.get(user.googleId);
    if (!existing && user.email) existing = this.usersByEmail.get(user.email.toLowerCase().trim());

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
        bio: user.bio ?? existing.bio,
        username: user.username ?? existing.username,
        playoraId: user.playoraId ?? existing.playoraId,
        ghostMode: user.ghostMode ?? existing.ghostMode,
        activityVisibility: user.activityVisibility ?? existing.activityVisibility,
        profileVisibility: user.profileVisibility ?? existing.profileVisibility,
        allowFriendRequests: user.allowFriendRequests ?? existing.allowFriendRequests,
        lastSignedIn: user.lastSignedIn ?? new Date(),
        updatedAt: new Date(),
      };
      this.users.set(existing.id, updated);
      if (updated.openId) this.usersByOpenId.set(updated.openId, updated);
      if (updated.googleId) this.usersByGoogleId.set(updated.googleId, updated);
      if (updated.email) this.usersByEmail.set(updated.email.toLowerCase().trim(), updated);
      if (updated.playoraId) this.usersByPlayoraId.set(updated.playoraId.toLowerCase(), updated);
      if (updated.username) this.usersByUsername.set(updated.username.toLowerCase(), updated);
      return updated;
    }

    const defaultName = user.name ?? "Guest " + Math.floor(1000 + Math.random() * 9000);
    const defaultPlayoraId = user.playoraId ?? generatePlayoraId(defaultName);
    const defaultUsername = user.username ?? defaultPlayoraId.replace(/^@/, "");

    const newUser: User = {
      id: this.nextUserId++,
      openId: user.openId ?? `user_${Math.random().toString(36).substring(2, 10)}`,
      name: defaultName,
      email: user.email ? user.email.toLowerCase().trim() : null,
      avatarColor: user.avatarColor ?? "#D6FF3F",
      avatarUrl: user.avatarUrl ?? null,
      googleId: user.googleId ?? null,
      loginMethod: user.loginMethod ?? "guest",
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      username: defaultUsername,
      playoraId: defaultPlayoraId,
      bio: user.bio ?? "",
      isOnline: user.isOnline ?? false,
      ghostMode: user.ghostMode ?? false,
      activityVisibility: user.activityVisibility ?? "friends",
      profileVisibility: user.profileVisibility ?? "public",
      allowFriendRequests: user.allowFriendRequests ?? true,
      lastSeenAt: new Date(),
      currentRoomCode: null,
      currentActivityTitle: null,
      currentActivityPlatform: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    this.users.set(newUser.id, newUser);
    if (newUser.openId) this.usersByOpenId.set(newUser.openId, newUser);
    if (newUser.googleId) this.usersByGoogleId.set(newUser.googleId, newUser);
    if (newUser.email) this.usersByEmail.set(newUser.email.toLowerCase().trim(), newUser);
    if (newUser.playoraId) this.usersByPlayoraId.set(newUser.playoraId.toLowerCase(), newUser);
    if (newUser.username) this.usersByUsername.set(newUser.username.toLowerCase(), newUser);
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

  getUserByPlayoraId(playoraId: string): User | undefined {
    const clean = playoraId.startsWith("@") ? playoraId.toLowerCase() : `@${playoraId.toLowerCase()}`;
    return this.usersByPlayoraId.get(clean);
  }

  getUserByUsername(username: string): User | undefined {
    return this.usersByUsername.get(username.toLowerCase().trim());
  }

  searchUsers(query: string, currentUserId?: number): User[] {
    const q = query.toLowerCase().trim().replace(/^@/, "");
    if (!q) return [];
    return Array.from(this.users.values())
      .filter((u) => {
        if (currentUserId && u.id === currentUserId) return false;
        if (u.profileVisibility === "private") return false;
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.playoraId && u.playoraId.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }

  updateUserProfile(
    userId: number,
    data: {
      name?: string;
      username?: string;
      playoraId?: string;
      bio?: string;
      avatarColor?: string;
      avatarUrl?: string;
      ghostMode?: boolean;
      activityVisibility?: "public" | "friends" | "none";
      profileVisibility?: "public" | "friends" | "private";
      allowFriendRequests?: boolean;
    }
  ): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.bio !== undefined) user.bio = data.bio.trim();
    if (data.avatarColor !== undefined) user.avatarColor = data.avatarColor;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    if (data.ghostMode !== undefined) user.ghostMode = data.ghostMode;
    if (data.activityVisibility !== undefined) user.activityVisibility = data.activityVisibility;
    if (data.profileVisibility !== undefined) user.profileVisibility = data.profileVisibility;
    if (data.allowFriendRequests !== undefined) user.allowFriendRequests = data.allowFriendRequests;

    if (data.username !== undefined) {
      const cleanUser = data.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
      if (cleanUser && cleanUser !== user.username) {
        if (user.username) this.usersByUsername.delete(user.username.toLowerCase());
        user.username = cleanUser;
        this.usersByUsername.set(cleanUser, user);
      }
    }

    if (data.playoraId !== undefined) {
      const cleanId = data.playoraId.startsWith("@") ? data.playoraId.toLowerCase().trim() : `@${data.playoraId.toLowerCase().trim()}`;
      if (cleanId !== user.playoraId) {
        if (user.playoraId) this.usersByPlayoraId.delete(user.playoraId.toLowerCase());
        user.playoraId = cleanId;
        this.usersByPlayoraId.set(cleanId, user);
      }
    }

    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  updateUserLiveActivity(
    userId: number,
    data: {
      isOnline?: boolean;
      currentRoomCode?: string | null;
      currentActivityTitle?: string | null;
      currentActivityPlatform?: string | null;
    }
  ): void {
    const user = this.users.get(userId);
    if (!user) return;
    if (data.isOnline !== undefined) user.isOnline = data.isOnline;
    if (data.currentRoomCode !== undefined) user.currentRoomCode = data.currentRoomCode;
    if (data.currentActivityTitle !== undefined) user.currentActivityTitle = data.currentActivityTitle;
    if (data.currentActivityPlatform !== undefined) user.currentActivityPlatform = data.currentActivityPlatform;
    user.lastSeenAt = new Date();
  }

  createRoom(room: Partial<InsertRoom> & { code: string; title: string; contentUrl: string; hostId: number }): Room {
    const newRoom: Room = {
      id: this.nextRoomId++,
      code: room.code.toUpperCase(),
      title: room.title,
      description: room.description ?? "",
      category: room.category ?? "movies",
      platform: room.platform ?? "youtube",
      contentUrl: room.contentUrl,
      hostId: room.hostId,
      status: room.status ?? "active",
      privacyMode: room.privacyMode ?? "public",
      accessMode: room.accessMode ?? "open",
      passwordHash: room.passwordHash ?? null,
      hostOnlyPlayback: room.hostOnlyPlayback ?? true,
      viewerCount: room.viewerCount ?? 1,
      maxParticipants: room.maxParticipants ?? 100,
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
    this.roomsByCode.set(newRoom.code, newRoom);
    this.recordMemberJoin(newRoom.id, newRoom.hostId, "host");
    return newRoom;
  }

  getRoomByCode(code: string): Room | undefined {
    return this.roomsByCode.get(code.toUpperCase().trim());
  }

  getRoomById(id: number): Room | undefined {
    return this.rooms.get(id);
  }

  endRoom(roomId: number): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.status = "ended";
    room.isPlaying = false;
    room.endedAt = new Date();
    room.updatedAt = new Date();

    for (const member of this.members.values()) {
      if (member.roomId === roomId && !member.leftAt) {
        member.leftAt = new Date();
      }
    }
    return room;
  }

  listActiveRooms(userId?: number): ActiveRoomSummary[] {
    return Array.from(this.rooms.values())
      .filter((r) => r.status === "active" && r.privacyMode !== "invite_only")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 30)
      .map((r) => {
        const userJoinedBefore = Boolean(
          userId &&
            (r.hostId === userId ||
              Array.from(this.members.values()).some((m) => m.roomId === r.id && m.userId === userId))
        );
        return { ...r, userJoinedBefore };
      });
  }

  listHistoryRooms(userId?: number): Room[] {
    return Array.from(this.rooms.values())
      .filter((r) => {
        if (r.status !== "ended") return false;
        if (!userId) return true;
        if (r.hostId === userId) return true;
        return Array.from(this.members.values()).some((m) => m.roomId === r.id && m.userId === userId);
      })
      .sort((a, b) => {
        const timeB = b.endedAt?.getTime() ?? b.updatedAt.getTime();
        const timeA = a.endedAt?.getTime() ?? a.updatedAt.getTime();
        return timeB - timeA;
      })
      .slice(0, 50);
  }

  listWorldParties(filters: {
    category?: string;
    platform?: string;
    search?: string;
    sort?: "trending" | "viewers" | "recent";
    page?: number;
    limit?: number;
  }): { parties: Room[]; total: number } {
    let list = Array.from(this.rooms.values()).filter(
      (r) => r.status === "active" && r.privacyMode === "public"
    );

    if (filters.category && filters.category !== "all") {
      list = list.filter((r) => r.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.platform && filters.platform !== "all") {
      list = list.filter((r) => r.platform.toLowerCase() === filters.platform!.toLowerCase());
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }

    // Sort order
    if (filters.sort === "viewers") {
      list.sort((a, b) => b.viewerCount - a.viewerCount);
    } else if (filters.sort === "recent") {
      list.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    } else {
      // Trending: viewers weight + recent activity
      list.sort((a, b) => {
        const scoreA = a.viewerCount * 2 + (a.isPlaying ? 5 : 0);
        const scoreB = b.viewerCount * 2 + (b.isPlaying ? 5 : 0);
        return scoreB - scoreA;
      });
    }

    const total = list.length;
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const start = (page - 1) * limit;
    const parties: WorldPartyItem[] = list.slice(start, start + limit).map((r) => {
      const host = this.users.get(r.hostId);
      return {
        ...r,
        hostName: host?.name || "Host",
        hostAvatar: host?.avatarUrl || undefined,
        hostPlayoraId: host?.playoraId ? host.playoraId.replace(/^@/, "") : `user${r.hostId}`,
      };
    });

    return { parties, total };
  }

  getWorldStats(): {
    activeParties: number;
    totalViewers: number;
    categoryBreakdown: Record<string, number>;
    platformBreakdown: Record<string, number>;
  } {
    const active = Array.from(this.rooms.values()).filter(
      (r) => r.status === "active" && r.privacyMode === "public"
    );

    let totalViewers = 0;
    const categoryBreakdown: Record<string, number> = {};
    const platformBreakdown: Record<string, number> = {};

    for (const r of active) {
      totalViewers += r.viewerCount || 1;
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
      platformBreakdown[r.platform] = (platformBreakdown[r.platform] || 0) + 1;
    }

    return {
      activeParties: active.length,
      totalViewers,
      categoryBreakdown,
      platformBreakdown,
    };
  }

  updateRoomViewerCount(roomCodeOrId: string | number, count: number): void {
    let room: Room | undefined;
    if (typeof roomCodeOrId === "number") {
      room = this.rooms.get(roomCodeOrId);
    } else if (typeof roomCodeOrId === "string") {
      room = this.roomsByCode.get(roomCodeOrId.toUpperCase());
    }
    if (room) {
      room.viewerCount = Math.max(0, count);
    }
  }

  updateRoomPlayback(roomId: number, isPlaying: boolean, currentPosition: number): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.isPlaying = isPlaying;
    room.currentPosition = currentPosition;
    room.positionUpdatedAt = new Date();
    room.updatedAt = new Date();
    return room;
  }

  updateRoomSettings(roomId: number, settings: Partial<Room["settings"]>): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.settings = { ...room.settings, ...settings };
    room.updatedAt = new Date();
    return room;
  }

  updateRoomContent(roomId: number, contentUrl: string, platform: string, title?: string): Room | undefined {
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

  recordMemberJoin(roomId: number, userId: number, role: "host" | "moderator" | "participant" = "participant"): RoomMember {
    const existing = Array.from(this.members.values()).find((m) => m.roomId === roomId && m.userId === userId);
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
    const existing = Array.from(this.members.values()).find((m) => m.roomId === roomId && m.userId === userId && !m.leftAt);
    if (existing) {
      existing.leftAt = new Date();
      existing.lastSeenAt = new Date();
    }
  }

  // Friendship methods
  sendFriendRequest(userId: number, friendId: number): Friendship {
    const existing = Array.from(this.friendships.values()).find(
      (f) =>
        (f.userId === userId && f.friendId === friendId) ||
        (f.userId === friendId && f.friendId === userId)
    );
    if (existing) {
      if (existing.status === "declined") {
        existing.status = "pending";
        existing.initiatorId = userId;
        existing.updatedAt = new Date();
      }
      return existing;
    }

    const friendship: Friendship = {
      id: this.nextFriendshipId++,
      userId,
      friendId,
      status: "pending",
      initiatorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.friendships.set(friendship.id, friendship);
    return friendship;
  }

  respondFriendRequest(friendshipId: number, userId: number, action: "accept" | "decline"): Friendship | undefined {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship) return undefined;
    if (friendship.friendId !== userId && friendship.userId !== userId) return undefined;

    friendship.status = action === "accept" ? "accepted" : "declined";
    friendship.updatedAt = new Date();
    return friendship;
  }

  cancelFriendRequest(friendshipId: number, userId: number): boolean {
    const friendship = this.friendships.get(friendshipId);
    if (!friendship || friendship.initiatorId !== userId) return false;
    this.friendships.delete(friendshipId);
    return true;
  }

  removeFriend(userId: number, friendId: number): boolean {
    const existing = Array.from(this.friendships.values()).find(
      (f) =>
        (f.userId === userId && f.friendId === friendId) ||
        (f.userId === friendId && f.friendId === userId)
    );
    if (existing) {
      this.friendships.delete(existing.id);
      return true;
    }
    return false;
  }

  listFriends(userId: number): Array<User & { friendshipId: number; status: string; friendshipCreatedAt: Date }> {
    const friends: Array<User & { friendshipId: number; status: string; friendshipCreatedAt: Date }> = [];
    for (const f of this.friendships.values()) {
      if (f.status === "accepted" && (f.userId === userId || f.friendId === userId)) {
        const otherId = f.userId === userId ? f.friendId : f.userId;
        const user = this.users.get(otherId);
        if (user) {
          friends.push({
            ...user,
            friendshipId: f.id,
            status: f.status,
            friendshipCreatedAt: f.createdAt,
          });
        }
      }
    }
    return friends;
  }

  listPendingFriendRequests(userId: number): Array<{ friendshipId: number; fromUser: User; createdAt: Date }> {
    const requests: Array<{ friendshipId: number; fromUser: User; createdAt: Date }> = [];
    for (const f of this.friendships.values()) {
      if (f.status === "pending" && f.friendId === userId && f.initiatorId !== userId) {
        const fromUser = this.users.get(f.initiatorId);
        if (fromUser) {
          requests.push({
            friendshipId: f.id,
            fromUser,
            createdAt: f.createdAt,
          });
        }
      }
    }
    return requests;
  }

  listPendingFriendRequestsDetailed(userId: number) {
    const incoming: Array<{
      id: number;
      senderId: number;
      senderName: string;
      senderPlayoraId: string;
      senderAvatarColor?: string;
      createdAt: Date;
    }> = [];

    const outgoing: Array<{
      id: number;
      receiverId: number;
      receiverName: string;
      receiverPlayoraId: string;
      receiverAvatarColor?: string;
      createdAt: Date;
    }> = [];

    for (const f of this.friendships.values()) {
      if (f.status === "pending") {
        if (f.friendId === userId) {
          const sender = this.users.get(f.userId);
          if (sender) {
            incoming.push({
              id: f.id,
              senderId: sender.id,
              senderName: sender.name || "User",
              senderPlayoraId: sender.playoraId || `@user${sender.id}`,
              senderAvatarColor: sender.avatarColor || "#D6FF3F",
              createdAt: f.createdAt,
            });
          }
        } else if (f.userId === userId) {
          const receiver = this.users.get(f.friendId);
          if (receiver) {
            outgoing.push({
              id: f.id,
              receiverId: receiver.id,
              receiverName: receiver.name || "User",
              receiverPlayoraId: receiver.playoraId || `@user${receiver.id}`,
              receiverAvatarColor: receiver.avatarColor || "#D6FF3F",
              createdAt: f.createdAt,
            });
          }
        }
      }
    }

    return { incoming, outgoing };
  }

  getFriendsActivity(userId: number): Array<{
    friend: User;
    status: "ONLINE" | "WATCHING" | "IN_PARTY" | "GHOST" | "OFFLINE";
    activity?: {
      roomCode: string;
      roomTitle: string;
      platform: string;
      viewerCount: number;
    };
  }> {
    const friends = this.listFriends(userId);
    const result: Array<{
      friend: User;
      status: "ONLINE" | "WATCHING" | "IN_PARTY" | "GHOST" | "OFFLINE";
      activity?: {
        roomCode: string;
        roomTitle: string;
        platform: string;
        viewerCount: number;
      };
    }> = [];

    for (const friend of friends) {
      // Obey Ghost Mode
      if (friend.ghostMode || friend.activityVisibility === "none") {
        result.push({ friend, status: "GHOST" });
        continue;
      }

      if (!friend.isOnline) {
        result.push({ friend, status: "OFFLINE" });
        continue;
      }

      if (friend.currentRoomCode) {
        const room = this.roomsByCode.get(friend.currentRoomCode.toUpperCase());
        // Do not expose private invite-only rooms
        if (room && room.status === "active" && room.privacyMode !== "invite_only") {
          result.push({
            friend,
            status: room.isPlaying ? "WATCHING" : "IN_PARTY",
            activity: {
              roomCode: room.code,
              roomTitle: room.title,
              platform: room.platform,
              viewerCount: room.viewerCount || 1,
            },
          });
          continue;
        }
      }

      result.push({ friend, status: "ONLINE" });
    }

    return result;
  }

  // Party Invites & Join Requests
  sendPartyInvite(roomCode: string, senderId: number, recipientId: number): PartyInvite {
    const invite: PartyInvite = {
      id: this.nextInviteId++,
      roomCode: roomCode.toUpperCase(),
      senderId,
      recipientId,
      status: "pending",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    this.invites.set(invite.id, invite);
    return invite;
  }

  listUserPartyInvites(userId: number): Array<PartyInvite & { room?: Room; sender?: User }> {
    const list: Array<PartyInvite & { room?: Room; sender?: User }> = [];
    for (const inv of this.invites.values()) {
      if (inv.recipientId === userId && inv.status === "pending") {
        const room = this.roomsByCode.get(inv.roomCode);
        const sender = this.users.get(inv.senderId);
        list.push({ ...inv, room, sender });
      }
    }
    return list;
  }

  respondPartyInvite(inviteId: number, userId: number, action: "accept" | "decline"): boolean {
    const inv = this.invites.get(inviteId);
    if (!inv || inv.recipientId !== userId) return false;
    inv.status = action === "accept" ? "accepted" : "declined";
    return true;
  }

  createJoinRequest(roomCode: string, userId: number): PartyJoinRequest {
    const request: PartyJoinRequest = {
      id: this.nextJoinRequestId++,
      roomCode: roomCode.toUpperCase(),
      userId,
      status: "pending",
      createdAt: new Date(),
    };
    this.joinRequests.set(request.id, request);
    return request;
  }

  listRoomJoinRequests(roomCode: string): Array<PartyJoinRequest & { user?: User }> {
    const list: Array<PartyJoinRequest & { user?: User }> = [];
    const code = roomCode.toUpperCase();
    for (const req of this.joinRequests.values()) {
      if (req.roomCode === code && req.status === "pending") {
        const user = this.users.get(req.userId);
        list.push({ ...req, user });
      }
    }
    return list;
  }

  respondJoinRequest(requestId: number, action: "approved" | "rejected"): PartyJoinRequest | undefined {
    const req = this.joinRequests.get(requestId);
    if (!req) return undefined;
    req.status = action;
    return req;
  }

  getUserStats(userId: number) {
    const hosted = Array.from(this.rooms.values()).filter((r) => r.hostId === userId);
    const hostedCount = hosted.length;

    const joinedRoomIds = new Set(
      Array.from(this.members.values())
        .filter((m) => m.userId === userId && m.role !== "host")
        .map((m) => m.roomId)
    );
    const joinedCount = joinedRoomIds.size;
    const activeRooms = hosted.filter((r) => r.status === "active");
    const historyRooms = this.listHistoryRooms(userId);

    const friendsCount = this.listFriends(userId).length;

    return {
      hostedCount,
      joinedCount,
      completedCount: historyRooms.length,
      friendsCount,
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

  getRoomMessages(roomId: number): Message[] {
    return Array.from(this.messages.values())
      .filter((m) => m.roomId === roomId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-60);
  }

  deleteMessage(messageId: number, userId: number, isHost = false): boolean {
    const msg = this.messages.get(messageId);
    if (!msg) return false;
    if (msg.userId === userId || isHost) {
      this.messages.delete(messageId);
      return true;
    }
    return false;
  }

  recordPlaybackEvent(event: InsertPlaybackEvent): PlaybackEvent {
    const newEvent: PlaybackEvent = {
      id: this.nextEventId++,
      roomId: event.roomId,
      userId: event.userId,
      eventType: event.eventType,
      position: event.position,
      serverTimestamp: new Date(),
    };
    this.events.set(newEvent.id, newEvent);
    return newEvent;
  }
}

export const memoryStore = new MemoryStore();

export function resetMemoryStore() {
  memoryStore.reset();
}

// ==========================================
// EXPORTED PROMISE-BASED REPOSITORY METHODS
// ==========================================

export async function upsertUser(user: Partial<InsertUser>): Promise<User> {
  const memUser = memoryStore.upsertUser(user);
  const db = await getDb();
  if (!db) return memUser;

  try {
    let existing: User[] = [];
    if (user.openId) {
      existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    }
    if (existing.length === 0 && user.googleId) {
      existing = await db.select().from(users).where(eq(users.googleId, user.googleId)).limit(1);
    }
    if (existing.length === 0 && user.email) {
      existing = await db.select().from(users).where(eq(users.email, user.email.toLowerCase().trim())).limit(1);
    }

    if (existing.length > 0) {
      const target = existing[0];
      const updateData: any = {
        name: user.name ?? target.name,
        email: user.email ? user.email.toLowerCase().trim() : target.email,
        avatarColor: user.avatarColor ?? target.avatarColor,
        avatarUrl: user.avatarUrl ?? target.avatarUrl,
        googleId: user.googleId ?? target.googleId,
        loginMethod: user.loginMethod ?? target.loginMethod,
        role: user.role ?? target.role,
        bio: user.bio ?? target.bio,
        username: user.username ?? target.username,
        playoraId: user.playoraId ?? target.playoraId,
        ghostMode: user.ghostMode ?? target.ghostMode,
        activityVisibility: user.activityVisibility ?? target.activityVisibility,
        profileVisibility: user.profileVisibility ?? target.profileVisibility,
        allowFriendRequests: user.allowFriendRequests ?? target.allowFriendRequests,
        lastSignedIn: user.lastSignedIn ?? new Date(),
      };
      await db.update(users).set(updateData).where(eq(users.id, target.id));
      const [res] = await db.select().from(users).where(eq(users.id, target.id)).limit(1);
      return res || memUser;
    } else {
      const defaultName = user.name ?? "Guest " + Math.floor(1000 + Math.random() * 9000);
      const defaultPlayoraId = user.playoraId ?? generatePlayoraId(defaultName);
      const defaultUsername = user.username ?? defaultPlayoraId.replace(/^@/, "");

      const [inserted] = await db
        .insert(users)
        .values({
          openId: user.openId ?? `user_${Math.random().toString(36).substring(2, 10)}`,
          name: defaultName,
          email: user.email ? user.email.toLowerCase().trim() : null,
          avatarColor: user.avatarColor ?? "#D6FF3F",
          avatarUrl: user.avatarUrl ?? null,
          googleId: user.googleId ?? null,
          loginMethod: user.loginMethod ?? "guest",
          role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
          username: defaultUsername,
          playoraId: defaultPlayoraId,
          bio: user.bio ?? "",
          isOnline: false,
          ghostMode: false,
          activityVisibility: "friends",
          profileVisibility: "public",
          allowFriendRequests: true,
          lastSeenAt: new Date(),
          currentRoomCode: null,
          currentActivityTitle: null,
          currentActivityPlatform: null,
          lastSignedIn: new Date(),
        })
        .$returningId();

      const [res] = await db.select().from(users).where(eq(users.id, inserted.id)).limit(1);
      return res || memUser;
    }
  } catch (error) {
    console.warn("[Database] Failed to upsert user into MySQL, using MemoryStore:", error);
    return memUser;
  }
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return memoryStore.getUserById(id);
  try {
    const res = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return res[0] || memoryStore.getUserById(id);
  } catch (error) {
    return memoryStore.getUserById(id);
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return memoryStore.getUserByOpenId(openId);
  try {
    const res = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return res[0] || memoryStore.getUserByOpenId(openId);
  } catch (error) {
    return memoryStore.getUserByOpenId(openId);
  }
}

export async function getUserByGoogleId(googleId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return memoryStore.getUserByGoogleId(googleId);
  try {
    const res = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return res[0] || memoryStore.getUserByGoogleId(googleId);
  } catch (error) {
    return memoryStore.getUserByGoogleId(googleId);
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return memoryStore.getUserByEmail(email);
  try {
    const res = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    return res[0] || memoryStore.getUserByEmail(email);
  } catch (error) {
    return memoryStore.getUserByEmail(email);
  }
}

export async function getUserByPlayoraId(playoraId: string): Promise<User | undefined> {
  const clean = playoraId.startsWith("@") ? playoraId.toLowerCase() : `@${playoraId.toLowerCase()}`;
  const db = await getDb();
  if (!db) return memoryStore.getUserByPlayoraId(clean);
  try {
    const res = await db.select().from(users).where(eq(users.playoraId, clean)).limit(1);
    return res[0] || memoryStore.getUserByPlayoraId(clean);
  } catch (error) {
    return memoryStore.getUserByPlayoraId(clean);
  }
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const clean = username.toLowerCase().trim();
  const db = await getDb();
  if (!db) return memoryStore.getUserByUsername(clean);
  try {
    const res = await db.select().from(users).where(eq(users.username, clean)).limit(1);
    return res[0] || memoryStore.getUserByUsername(clean);
  } catch (error) {
    return memoryStore.getUserByUsername(clean);
  }
}

export async function searchUsers(query: string, currentUserId?: number): Promise<User[]> {
  const q = query.toLowerCase().trim().replace(/^@/, "");
  if (!q) return [];
  const db = await getDb();
  if (!db) return memoryStore.searchUsers(query, currentUserId);

  try {
    const result = await db
      .select()
      .from(users)
      .where(
        and(
          currentUserId ? sql`${users.id} != ${currentUserId}` : sql`1=1`,
          sql`${users.profileVisibility} != 'private'`,
          or(
            like(users.name, `%${q}%`),
            like(users.username, `%${q}%`),
            like(users.playoraId, `%${q}%`)
          )
        )
      )
      .limit(20);
    return result.length > 0 ? result : memoryStore.searchUsers(query, currentUserId);
  } catch (error) {
    return memoryStore.searchUsers(query, currentUserId);
  }
}

export async function updateUserProfile(
  userId: number,
  data: {
    name?: string;
    username?: string;
    playoraId?: string;
    bio?: string;
    avatarColor?: string;
    avatarUrl?: string;
    ghostMode?: boolean;
    activityVisibility?: "public" | "friends" | "none";
    profileVisibility?: "public" | "friends" | "private";
    allowFriendRequests?: boolean;
  }
): Promise<User | undefined> {
  const memUser = memoryStore.updateUserProfile(userId, data);
  const db = await getDb();
  if (!db) return memUser;

  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.bio !== undefined) updateData.bio = data.bio.trim();
    if (data.avatarColor !== undefined) updateData.avatarColor = data.avatarColor;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.ghostMode !== undefined) updateData.ghostMode = data.ghostMode;
    if (data.activityVisibility !== undefined) updateData.activityVisibility = data.activityVisibility;
    if (data.profileVisibility !== undefined) updateData.profileVisibility = data.profileVisibility;
    if (data.allowFriendRequests !== undefined) updateData.allowFriendRequests = data.allowFriendRequests;

    if (data.username !== undefined) {
      updateData.username = data.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    }
    if (data.playoraId !== undefined) {
      updateData.playoraId = data.playoraId.startsWith("@")
        ? data.playoraId.toLowerCase().trim()
        : `@${data.playoraId.toLowerCase().trim()}`;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
    const [res] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return res || memUser;
  } catch (error) {
    console.error("[Database] Failed to update user profile:", error);
    return memUser;
  }
}

export async function updateUserLiveActivity(
  userId: number,
  data: {
    isOnline?: boolean;
    currentRoomCode?: string | null;
    currentActivityTitle?: string | null;
    currentActivityPlatform?: string | null;
  }
): Promise<void> {
  memoryStore.updateUserLiveActivity(userId, data);
  const db = await getDb();
  if (!db) return;

  try {
    const updateData: any = { lastSeenAt: new Date() };
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline;
    if (data.currentRoomCode !== undefined) updateData.currentRoomCode = data.currentRoomCode;
    if (data.currentActivityTitle !== undefined) updateData.currentActivityTitle = data.currentActivityTitle;
    if (data.currentActivityPlatform !== undefined) updateData.currentActivityPlatform = data.currentActivityPlatform;
    await db.update(users).set(updateData).where(eq(users.id, userId));
  } catch (error) {
    console.warn("[Database] Failed to update user live activity:", error);
  }
}

export async function createRoom(
  room: Partial<InsertRoom> & { code: string; title: string; contentUrl: string; hostId: number }
): Promise<Room> {
  const memRoom = memoryStore.createRoom(room);
  const db = await getDb();
  if (!db) return memRoom;

  try {
    const [inserted] = await db
      .insert(rooms)
      .values({
        code: room.code.toUpperCase(),
        title: room.title,
        description: room.description ?? "",
        category: room.category ?? "movies",
        platform: room.platform ?? "youtube",
        contentUrl: room.contentUrl,
        hostId: room.hostId,
        status: room.status ?? "active",
        privacyMode: room.privacyMode ?? "public",
        accessMode: room.accessMode ?? "open",
        passwordHash: room.passwordHash ?? null,
        hostOnlyPlayback: room.hostOnlyPlayback ?? true,
        viewerCount: 1,
        maxParticipants: room.maxParticipants ?? 100,
        startedAt: room.startedAt ?? new Date(),
        isPlaying: room.isPlaying ?? false,
        currentPosition: room.currentPosition ?? 0,
        settings: room.settings ?? {
          hostOnlyControls: true,
          lockSeeking: false,
          allowReactions: true,
          allowVoice: true,
          isPublic: true,
        },
      })
      .$returningId();

    const [res] = await db.select().from(rooms).where(eq(rooms.id, inserted.id)).limit(1);
    await recordMemberJoin(inserted.id, room.hostId, "host");
    return res || memRoom;
  } catch (error) {
    console.warn("[Database] Failed to insert room in MySQL, using memory room:", error);
    return memRoom;
  }
}

export async function getRoomByCode(code: string): Promise<Room | undefined> {
  const clean = code.toUpperCase().trim();
  const db = await getDb();
  if (!db) return memoryStore.getRoomByCode(clean);

  try {
    const res = await db.select().from(rooms).where(eq(rooms.code, clean)).limit(1);
    return res[0] || memoryStore.getRoomByCode(clean);
  } catch (error) {
    return memoryStore.getRoomByCode(clean);
  }
}

export async function getRoomById(id: number): Promise<Room | undefined> {
  const db = await getDb();
  if (!db) return memoryStore.getRoomById(id);

  try {
    const res = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return res[0] || memoryStore.getRoomById(id);
  } catch (error) {
    return memoryStore.getRoomById(id);
  }
}

export async function endRoom(roomId: number): Promise<Room | undefined> {
  const memRoom = memoryStore.endRoom(roomId);
  const db = await getDb();
  if (!db) return memRoom;

  try {
    await db
      .update(rooms)
      .set({ status: "ended", isPlaying: false, endedAt: new Date(), updatedAt: new Date() })
      .where(eq(rooms.id, roomId));
    await db
      .update(roomMembers)
      .set({ leftAt: new Date(), lastSeenAt: new Date() })
      .where(and(eq(roomMembers.roomId, roomId), sql`${roomMembers.leftAt} IS NULL`));
    const [res] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    return res || memRoom;
  } catch (error) {
    console.error("[Database] Failed to end room:", error);
    return memRoom;
  }
}

export async function listActiveRooms(userId?: number): Promise<ActiveRoomSummary[]> {
  const db = await getDb();
  if (!db) return memoryStore.listActiveRooms(userId);

  try {
    const result = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.status, "active"), sql`${rooms.privacyMode} != 'invite_only'`))
      .orderBy(desc(rooms.updatedAt))
      .limit(30);

    const baseRooms = result.length > 0 ? result : memoryStore.listActiveRooms(userId);
    if (!userId) {
      return baseRooms.map((r) => ({ ...r, userJoinedBefore: false }));
    }

    const memberships = await db
      .select({ roomId: roomMembers.roomId })
      .from(roomMembers)
      .where(eq(roomMembers.userId, userId));
    const memberRoomIds = new Set(memberships.map((m) => m.roomId));

    return baseRooms.map((r) => ({
      ...r,
      userJoinedBefore: r.hostId === userId || memberRoomIds.has(r.id),
    }));
  } catch (error) {
    return memoryStore.listActiveRooms(userId);
  }
}

export async function listHistoryRooms(userId?: number): Promise<Room[]> {
  const db = await getDb();
  if (!db) return memoryStore.listHistoryRooms(userId);

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

export async function listWorldParties(filters: {
  category?: string;
  platform?: string;
  search?: string;
  sort?: "trending" | "viewers" | "recent";
  page?: number;
  limit?: number;
}): Promise<{ parties: WorldPartyItem[]; total: number }> {
  const db = await getDb();
  if (!db) return memoryStore.listWorldParties(filters);

  try {
    const conditions = [
      eq(rooms.status, "active"),
      eq(rooms.privacyMode, "public"),
    ];

    if (filters.category && filters.category !== "all") {
      conditions.push(eq(rooms.category, filters.category));
    }

    if (filters.platform && filters.platform !== "all") {
      conditions.push(eq(rooms.platform, filters.platform));
    }

    if (filters.search) {
      const q = `%${filters.search.toLowerCase().trim()}%`;
      conditions.push(or(like(rooms.title, q), like(rooms.code, q))!);
    }

    const whereClause = and(...conditions);
    const limit = filters.limit || 12;
    const page = filters.page || 1;
    const offset = (page - 1) * limit;

    let orderExpr = desc(rooms.viewerCount);
    if (filters.sort === "recent") {
      orderExpr = desc(rooms.startedAt);
    } else if (filters.sort === "viewers") {
      orderExpr = desc(rooms.viewerCount);
    }

    const result = await db
      .select()
      .from(rooms)
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset);

    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rooms)
      .where(whereClause);

    const total = Number(countRes?.count || result.length);
    const mappedParties: WorldPartyItem[] = [];
    for (const r of result) {
      const host = await getUserById(r.hostId);
      mappedParties.push({
        ...r,
        hostName: host?.name || "Host",
        hostAvatar: host?.avatarUrl || undefined,
        hostPlayoraId: host?.playoraId ? host.playoraId.replace(/^@/, "") : `user${r.hostId}`,
      });
    }
    return { parties: mappedParties, total };
  } catch (error) {
    return memoryStore.listWorldParties(filters);
  }
}

export async function getWorldStats(): Promise<{
  activeParties: number;
  totalViewers: number;
  categoryBreakdown: Record<string, number>;
  platformBreakdown: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) return memoryStore.getWorldStats();

  try {
    const activeRooms = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.status, "active"), eq(rooms.privacyMode, "public")));

    let totalViewers = 0;
    const categoryBreakdown: Record<string, number> = {};
    const platformBreakdown: Record<string, number> = {};

    for (const r of activeRooms) {
      totalViewers += r.viewerCount || 1;
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;
      platformBreakdown[r.platform] = (platformBreakdown[r.platform] || 0) + 1;
    }

    return {
      activeParties: activeRooms.length,
      totalViewers,
      categoryBreakdown,
      platformBreakdown,
    };
  } catch (error) {
    return memoryStore.getWorldStats();
  }
}

export async function updateRoomViewerCount(roomCodeOrId: string | number, count: number): Promise<void> {
  memoryStore.updateRoomViewerCount(roomCodeOrId, count);
  const db = await getDb();
  if (!db) return;

  try {
    if (typeof roomCodeOrId === "number") {
      await db
        .update(rooms)
        .set({ viewerCount: Math.max(0, count) })
        .where(eq(rooms.id, roomCodeOrId));
    } else {
      await db
        .update(rooms)
        .set({ viewerCount: Math.max(0, count) })
        .where(eq(rooms.code, String(roomCodeOrId).toUpperCase()));
    }
  } catch (error) {
    console.warn("[Database] Failed to update room viewer count:", error);
  }
}

export async function updateRoomPlayback(roomId: number, isPlaying: boolean, currentPosition: number): Promise<void> {
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

export async function updateRoomSettings(roomId: number, settings: Partial<Room["settings"]>): Promise<void> {
  memoryStore.updateRoomSettings(roomId, settings);
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    if (existing[0]) {
      const merged = { ...existing[0].settings, ...settings };
      await db.update(rooms).set({ settings: merged, updatedAt: new Date() }).where(eq(rooms.id, roomId));
    }
  } catch (error) {
    console.error("[Database] Failed to update room settings:", error);
  }
}

export async function updateRoomContent(roomId: number, contentUrl: string, platform: string, title?: string): Promise<void> {
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

// ==========================================
// FRIENDSHIP & SOCIAL REPOSITORY METHODS
// ==========================================

export async function sendFriendRequest(userId: number, friendId: number): Promise<Friendship> {
  const memReq = memoryStore.sendFriendRequest(userId, friendId);
  const db = await getDb();
  if (!db) return memReq;

  try {
    const existing = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status === "declined") {
        await db
          .update(friendships)
          .set({ status: "pending", initiatorId: userId, updatedAt: new Date() })
          .where(eq(friendships.id, existing[0].id));
      }
      return existing[0];
    }

    const [inserted] = await db
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: "pending",
        initiatorId: userId,
      })
      .$returningId();

    const [res] = await db.select().from(friendships).where(eq(friendships.id, inserted.id)).limit(1);
    return res || memReq;
  } catch (error) {
    console.warn("[Database] Failed to send friend request:", error);
    return memReq;
  }
}

export async function respondFriendRequest(
  friendshipId: number,
  userId: number,
  action: "accept" | "decline"
): Promise<Friendship | undefined> {
  const memRes = memoryStore.respondFriendRequest(friendshipId, userId, action);
  const db = await getDb();
  if (!db) return memRes;

  try {
    const status = action === "accept" ? "accepted" : "declined";
    await db
      .update(friendships)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(friendships.id, friendshipId),
          or(eq(friendships.friendId, userId), eq(friendships.userId, userId))
        )
      );
    const [res] = await db.select().from(friendships).where(eq(friendships.id, friendshipId)).limit(1);
    return res || memRes;
  } catch (error) {
    return memRes;
  }
}

export async function cancelFriendRequest(friendshipId: number, userId: number): Promise<boolean> {
  memoryStore.cancelFriendRequest(friendshipId, userId);
  const db = await getDb();
  if (!db) return true;

  try {
    await db
      .delete(friendships)
      .where(and(eq(friendships.id, friendshipId), eq(friendships.initiatorId, userId)));
    return true;
  } catch (error) {
    return false;
  }
}

export async function removeFriend(userId: number, friendId: number): Promise<boolean> {
  memoryStore.removeFriend(userId, friendId);
  const db = await getDb();
  if (!db) return true;

  try {
    await db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
    return true;
  } catch (error) {
    return false;
  }
}

export async function listFriends(
  userId: number
): Promise<Array<User & { friendshipId: number; status: string; friendshipCreatedAt: Date }>> {
  const db = await getDb();
  if (!db) return memoryStore.listFriends(userId);

  try {
    const records = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId))
        )
      );

    const friendsList: Array<User & { friendshipId: number; status: string; friendshipCreatedAt: Date }> = [];
    for (const f of records) {
      const otherId = f.userId === userId ? f.friendId : f.userId;
      const [u] = await db.select().from(users).where(eq(users.id, otherId)).limit(1);
      if (u) {
        friendsList.push({
          ...u,
          friendshipId: f.id,
          status: f.status,
          friendshipCreatedAt: f.createdAt,
        });
      }
    }
    return friendsList.length > 0 ? friendsList : memoryStore.listFriends(userId);
  } catch (error) {
    return memoryStore.listFriends(userId);
  }
}

export async function listPendingFriendRequests(
  userId: number
): Promise<Array<{ friendshipId: number; fromUser: User; createdAt: Date }>> {
  const db = await getDb();
  if (!db) return memoryStore.listPendingFriendRequests(userId);

  try {
    const records = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "pending"),
          eq(friendships.friendId, userId),
          sql`${friendships.initiatorId} != ${userId}`
        )
      );

    const result: Array<{ friendshipId: number; fromUser: User; createdAt: Date }> = [];
    for (const f of records) {
      const [u] = await db.select().from(users).where(eq(users.id, f.initiatorId)).limit(1);
      if (u) {
        result.push({
          friendshipId: f.id,
          fromUser: u,
          createdAt: f.createdAt,
        });
      }
    }
    return result.length > 0 ? result : memoryStore.listPendingFriendRequests(userId);
  } catch (error) {
    return memoryStore.listPendingFriendRequests(userId);
  }
}

export async function getFriendsActivity(userId: number): Promise<
  Array<{
    friend: User;
    status: "ONLINE" | "WATCHING" | "IN_PARTY" | "GHOST" | "OFFLINE";
    activity?: {
      roomCode: string;
      roomTitle: string;
      platform: string;
      viewerCount: number;
    };
  }>
> {
  const friends = await listFriends(userId);
  const result: Array<{
    friend: User;
    status: "ONLINE" | "WATCHING" | "IN_PARTY" | "GHOST" | "OFFLINE";
    activity?: {
      roomCode: string;
      roomTitle: string;
      platform: string;
      viewerCount: number;
    };
  }> = [];

  for (const friend of friends) {
    // Check Ghost Mode or private activity
    if (friend.ghostMode || friend.activityVisibility === "none") {
      result.push({ friend, status: "GHOST" });
      continue;
    }

    if (!friend.isOnline) {
      result.push({ friend, status: "OFFLINE" });
      continue;
    }

    if (friend.currentRoomCode) {
      const room = await getRoomByCode(friend.currentRoomCode);
      if (room && room.status === "active" && room.privacyMode !== "invite_only") {
        result.push({
          friend,
          status: room.isPlaying ? "WATCHING" : "IN_PARTY",
          activity: {
            roomCode: room.code,
            roomTitle: room.title,
            platform: room.platform,
            viewerCount: room.viewerCount || 1,
          },
        });
        continue;
      }
    }

    result.push({ friend, status: "ONLINE" });
  }

  return result;
}

// ==========================================
// PARTY INVITES & JOIN REQUESTS REPOSITORY
// ==========================================

export async function sendPartyInvite(
  roomCode: string,
  senderId: number,
  recipientId: number
): Promise<PartyInvite> {
  const memInv = memoryStore.sendPartyInvite(roomCode, senderId, recipientId);
  const db = await getDb();
  if (!db) return memInv;

  try {
    const [inserted] = await db
      .insert(partyInvites)
      .values({
        roomCode: roomCode.toUpperCase(),
        senderId,
        recipientId,
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .$returningId();
    const [res] = await db.select().from(partyInvites).where(eq(partyInvites.id, inserted.id)).limit(1);
    return res || memInv;
  } catch (error) {
    return memInv;
  }
}

export async function listUserPartyInvites(
  userId: number
): Promise<Array<PartyInvite & { room?: Room; sender?: User }>> {
  const db = await getDb();
  if (!db) return memoryStore.listUserPartyInvites(userId);

  try {
    const records = await db
      .select()
      .from(partyInvites)
      .where(and(eq(partyInvites.recipientId, userId), eq(partyInvites.status, "pending")));

    const list: Array<PartyInvite & { room?: Room; sender?: User }> = [];
    for (const inv of records) {
      const room = await getRoomByCode(inv.roomCode);
      const sender = await getUserById(inv.senderId);
      list.push({ ...inv, room, sender });
    }
    return list.length > 0 ? list : memoryStore.listUserPartyInvites(userId);
  } catch (error) {
    return memoryStore.listUserPartyInvites(userId);
  }
}

export async function respondPartyInvite(
  inviteId: number,
  userId: number,
  action: "accept" | "decline"
): Promise<boolean> {
  memoryStore.respondPartyInvite(inviteId, userId, action);
  const db = await getDb();
  if (!db) return true;

  try {
    await db
      .update(partyInvites)
      .set({ status: action === "accept" ? "accepted" : "declined" })
      .where(and(eq(partyInvites.id, inviteId), eq(partyInvites.recipientId, userId)));
    return true;
  } catch (error) {
    return false;
  }
}

export async function createJoinRequest(roomCode: string, userId: number): Promise<PartyJoinRequest> {
  const memReq = memoryStore.createJoinRequest(roomCode, userId);
  const db = await getDb();
  if (!db) return memReq;

  try {
    const [inserted] = await db
      .insert(partyJoinRequests)
      .values({
        roomCode: roomCode.toUpperCase(),
        userId,
        status: "pending",
      })
      .$returningId();
    const [res] = await db.select().from(partyJoinRequests).where(eq(partyJoinRequests.id, inserted.id)).limit(1);
    return res || memReq;
  } catch (error) {
    return memReq;
  }
}

export async function listRoomJoinRequests(
  roomCode: string
): Promise<Array<PartyJoinRequest & { user?: User }>> {
  const db = await getDb();
  if (!db) return memoryStore.listRoomJoinRequests(roomCode);

  try {
    const records = await db
      .select()
      .from(partyJoinRequests)
      .where(and(eq(partyJoinRequests.roomCode, roomCode.toUpperCase()), eq(partyJoinRequests.status, "pending")));

    const list: Array<PartyJoinRequest & { user?: User }> = [];
    for (const req of records) {
      const user = await getUserById(req.userId);
      list.push({ ...req, user });
    }
    return list.length > 0 ? list : memoryStore.listRoomJoinRequests(roomCode);
  } catch (error) {
    return memoryStore.listRoomJoinRequests(roomCode);
  }
}

export async function respondJoinRequest(
  requestId: number,
  action: "approved" | "rejected"
): Promise<PartyJoinRequest | undefined> {
  const memReq = memoryStore.respondJoinRequest(requestId, action);
  const db = await getDb();
  if (!db) return memReq;

  try {
    await db.update(partyJoinRequests).set({ status: action }).where(eq(partyJoinRequests.id, requestId));
    const [res] = await db.select().from(partyJoinRequests).where(eq(partyJoinRequests.id, requestId)).limit(1);
    return res || memReq;
  } catch (error) {
    return memReq;
  }
}

export async function listPendingFriendRequestsDetailed(userId: number) {
  const mem = memoryStore.listPendingFriendRequestsDetailed(userId);
  const db = await getDb();
  if (!db) return mem;

  try {
    const records = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "pending"),
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId))
        )
      );

    const incoming: Array<{
      id: number;
      senderId: number;
      senderName: string;
      senderPlayoraId: string;
      senderAvatarColor?: string;
      createdAt: Date;
    }> = [];

    const outgoing: Array<{
      id: number;
      receiverId: number;
      receiverName: string;
      receiverPlayoraId: string;
      receiverAvatarColor?: string;
      createdAt: Date;
    }> = [];

    for (const f of records) {
      if (f.friendId === userId) {
        const [sender] = await db.select().from(users).where(eq(users.id, f.userId)).limit(1);
        if (sender) {
          incoming.push({
            id: f.id,
            senderId: sender.id,
            senderName: sender.name || "User",
            senderPlayoraId: sender.playoraId || `@user${sender.id}`,
            senderAvatarColor: sender.avatarColor || "#D6FF3F",
            createdAt: f.createdAt,
          });
        }
      } else if (f.userId === userId) {
        const [receiver] = await db.select().from(users).where(eq(users.id, f.friendId)).limit(1);
        if (receiver) {
          outgoing.push({
            id: f.id,
            receiverId: receiver.id,
            receiverName: receiver.name || "User",
            receiverPlayoraId: receiver.playoraId || `@user${receiver.id}`,
            receiverAvatarColor: receiver.avatarColor || "#D6FF3F",
            createdAt: f.createdAt,
          });
        }
      }
    }
    return { incoming, outgoing };
  } catch (error) {
    return mem;
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

    const memberships = await db.select().from(roomMembers).where(eq(roomMembers.userId, userId));
    const joinedRoomIds = new Set(memberships.map((m) => m.roomId));
    const joinedCount = joinedRoomIds.size;

    const activeRooms = hosted.filter((r) => r.status === "active");
    const historyRooms = await listHistoryRooms(userId);

    const friends = await listFriends(userId);
    const friendsCount = friends.length;

    return {
      hostedCount,
      joinedCount,
      completedCount: historyRooms.length,
      friendsCount,
      activeRooms,
      historyRooms,
    };
  } catch (error) {
    return memoryStore.getUserStats(userId);
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
      .limit(60);
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
