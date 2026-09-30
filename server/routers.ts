import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { decodeJwt } from "jose";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { resolveStreamingContent } from "@shared/universal-streaming-engine";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { broadcastPartyEndedToRoom } from "./socket";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    guestLogin: publicProcedure
      .input(
        z
          .object({
            name: z.string().min(1).max(50).optional(),
            avatarColor: z.string().optional(),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        const guestName = input?.name?.trim() || "Guest " + Math.floor(1000 + Math.random() * 9000);
        const avatarColor = input?.avatarColor || "#D6FF3F";
        const openId = "guest_" + nanoid(10);
        const playoraId = db.generatePlayoraId(guestName);
        const username = playoraId.replace(/^@/, "");

        const user = await db.upsertUser({
          openId,
          name: guestName,
          email: null,
          avatarColor,
          loginMethod: "guest",
          role: "user",
          username,
          playoraId,
          lastSignedIn: new Date(),
        });

        try {
          const sessionToken = await sdk.createSessionToken(openId, {
            name: guestName,
            expiresInMs: ONE_YEAR_MS,
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        } catch (tokenErr: any) {
          console.error("[Auth] Failed to sign guest session token:", tokenErr);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to sign in as guest: server security configuration is incomplete. Please check JWT_SECRET.",
          });
        }

        return user;
      }),

    googleLogin: publicProcedure
      .input(
        z.object({
          credential: z.string().optional(),
          profile: z
            .object({
              googleId: z.string(),
              email: z.string().email(),
              name: z.string(),
              avatarUrl: z.string().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let googleId = "";
        let email = "";
        let name = "";
        let avatarUrl: string | undefined = undefined;

        if (input.credential) {
          try {
            const decoded = decodeJwt(input.credential) as Record<string, any>;
            googleId = decoded.sub || "";
            email = decoded.email || "";
            name = decoded.name || decoded.given_name || "Google User";
            avatarUrl = decoded.picture || undefined;
          } catch (e) {
            console.warn("[Auth] Failed to decode Google credential:", e);
          }
        }

        if (!googleId && input.profile) {
          googleId = input.profile.googleId;
          email = input.profile.email;
          name = input.profile.name;
          avatarUrl = input.profile.avatarUrl;
        }

        if (!googleId || !email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Google authentication payload.",
          });
        }

        // Look for existing user by googleId or email
        let existing = await db.getUserByGoogleId(googleId);
        if (!existing && email) {
          existing = await db.getUserByEmail(email);
        }
        if (!existing && ctx.user?.id) {
          existing = ctx.user;
        }

        const openId = existing ? existing.openId : `google_${googleId}`;
        const playoraId = existing?.playoraId || db.generatePlayoraId(name);
        const username = existing?.username || playoraId.replace(/^@/, "");

        const user = await db.upsertUser({
          openId,
          googleId,
          name: name || existing?.name || "Google User",
          email,
          avatarUrl: avatarUrl || existing?.avatarUrl || null,
          avatarColor: existing?.avatarColor || "#4285F4",
          loginMethod: "google",
          role: existing?.role || "user",
          username,
          playoraId,
          lastSignedIn: new Date(),
        });

        try {
          const sessionToken = await sdk.createSessionToken(openId, {
            name: user.name || name || "Google User",
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        } catch (tokenErr: any) {
          console.error("[Auth] Failed to sign Google session token:", tokenErr);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to establish secure session for Google account.",
          });
        }

        return { success: true, user };
      }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserStats(ctx.user.id);
    }),

    checkUsernameAvailability: publicProcedure
      .input(z.object({ username: z.string().min(3).max(30) }))
      .query(async ({ ctx, input }) => {
        const clean = input.username.toLowerCase().trim().replace(/^@/, "");
        const reserved = ["admin", "playora", "support", "official", "moderator", "system", "help", "world", "api"];
        if (reserved.includes(clean)) {
          return { available: false, reason: "Reserved system identifier." };
        }
        const existing = await db.getUserByUsername(clean);
        if (existing && existing.id !== ctx.user?.id) {
          return { available: false, reason: "PlayOra ID already taken." };
        }
        return { available: true };
      }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(64).optional(),
          username: z.string().min(3).max(32).optional(),
          playoraId: z.string().min(3).max(32).optional(),
          bio: z.string().max(250).optional(),
          avatarColor: z.string().min(4).max(32).optional(),
          avatarUrl: z.string().optional(),
          ghostMode: z.boolean().optional(),
          activityVisibility: z.enum(["public", "friends", "none"]).optional(),
          profileVisibility: z.enum(["public", "friends", "private"]).optional(),
          allowFriendRequests: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Uniqueness check for username/playoraId if changed
        if (input.username) {
          const cleanUser = input.username.toLowerCase().trim().replace(/^@/, "");
          const existing = await db.getUserByUsername(cleanUser);
          if (existing && existing.id !== ctx.user.id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Username @${cleanUser} is already taken by another user.`,
            });
          }
        }

        const updated = await db.updateUserProfile(ctx.user.id, {
          name: input.name ? input.name.trim() : undefined,
          username: input.username,
          playoraId: input.playoraId || (input.username ? `@${input.username.replace(/^@/, "")}` : undefined),
          bio: input.bio,
          avatarColor: input.avatarColor,
          avatarUrl: input.avatarUrl,
          ghostMode: input.ghostMode,
          activityVisibility: input.activityVisibility,
          profileVisibility: input.profileVisibility,
          allowFriendRequests: input.allowFriendRequests,
        });

        if (input.name) {
          try {
            const sessionToken = await sdk.createSessionToken(ctx.user.openId, {
              name: input.name.trim(),
              expiresInMs: ONE_YEAR_MS,
            });
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          } catch (tokenErr: any) {
            console.error("[Auth] Failed to refresh session token:", tokenErr);
          }
        }

        return updated || ctx.user;
      }),

    getProfile: publicProcedure
      .input(
        z.object({
          playoraId: z.string().optional(),
          userId: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        let user: db.User | undefined;
        if (input.playoraId) {
          user = await db.getUserByPlayoraId(input.playoraId);
        } else if (input.userId) {
          user = await db.getUserById(input.userId);
        } else if (ctx.user) {
          user = ctx.user;
        }

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User profile not found." });
        }

        // Check privacy
        const isSelf = ctx.user?.id === user.id;
        if (!isSelf && user.profileVisibility === "private") {
          throw new TRPCError({ code: "FORBIDDEN", message: "This profile is private." });
        }

        const stats = await db.getUserStats(user.id);
        return {
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            playoraId: user.playoraId,
            bio: user.bio,
            avatarColor: user.avatarColor,
            avatarUrl: user.avatarUrl,
            isOnline: user.ghostMode ? false : user.isOnline,
            status: user.ghostMode
              ? "GHOST"
              : user.isOnline
              ? user.currentRoomCode
                ? "IN_PARTY"
                : "ONLINE"
              : "OFFLINE",
            currentActivityTitle: user.ghostMode ? null : user.currentActivityTitle,
            currentActivityPlatform: user.ghostMode ? null : user.currentActivityPlatform,
            createdAt: user.createdAt,
            ghostMode: isSelf ? user.ghostMode : undefined,
            activityVisibility: isSelf ? user.activityVisibility : undefined,
            profileVisibility: isSelf ? user.profileVisibility : undefined,
          },
          stats,
        };
      }),

    searchUsers: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.searchUsers(input.query, ctx.user?.id);
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  friend: router({
    sendRequest: protectedProcedure
      .input(
        z.object({
          friendId: z.number().optional(),
          playoraId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let targetId = input.friendId;
        if (!targetId && input.playoraId) {
          const targetUser = await db.getUserByPlayoraId(input.playoraId);
          if (!targetUser) {
            throw new TRPCError({ code: "NOT_FOUND", message: "User not found with this PlayOra ID." });
          }
          targetId = targetUser.id;
        }

        if (!targetId || targetId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot send friend request to yourself." });
        }

        const targetUser = await db.getUserById(targetId);
        if (targetUser && !targetUser.allowFriendRequests) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This user does not accept friend requests." });
        }

        const friendship = await db.sendFriendRequest(ctx.user.id, targetId);
        return { success: true, friendship };
      }),

    respondRequest: protectedProcedure
      .input(
        z.object({
          friendshipId: z.number(),
          action: z.enum(["accept", "decline"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.respondFriendRequest(input.friendshipId, ctx.user.id, input.action);
        if (!result) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Friend request not found." });
        }
        return { success: true, friendship: result };
      }),

    cancelRequest: protectedProcedure
      .input(z.object({ friendshipId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.cancelFriendRequest(input.friendshipId, ctx.user.id);
        return { success };
      }),

    removeFriend: protectedProcedure
      .input(z.object({ friendId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.removeFriend(ctx.user.id, input.friendId);
        return { success };
      }),

    listFriends: protectedProcedure.query(async ({ ctx }) => {
      return db.listFriends(ctx.user.id);
    }),

    listPendingRequests: protectedProcedure.query(async ({ ctx }) => {
      return db.listPendingFriendRequestsDetailed(ctx.user.id);
    }),

    getFriendsActivity: protectedProcedure.query(async ({ ctx }) => {
      return db.getFriendsActivity(ctx.user.id);
    }),
  }),

  party: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1).max(120),
          description: z.string().max(300).optional(),
          category: z.string().default("movies"),
          platform: z.string().min(1).max(64),
          contentUrl: z.string().min(1),
          hostName: z.string().optional(),
          privacyMode: z.enum(["public", "friends", "invite_only"]).default("public"),
          accessMode: z.enum(["open", "password", "host_approval", "approval"]).default("open"),
          password: z.string().max(64).optional(),
          maxParticipants: z.number().optional(),
          hostOnlyPlayback: z.boolean().default(true),
          settings: z
            .object({
              hostOnlyControls: z.boolean().default(true),
              lockSeeking: z.boolean().default(false),
              allowReactions: z.boolean().default(true),
              allowVoice: z.boolean().default(true),
              isPublic: z.boolean().default(true),
            })
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const resolved = resolveStreamingContent(input.contentUrl);
        const finalPlatform = resolved.platform !== "generic" ? resolved.platform : input.platform.toLowerCase().trim();
        const finalUrl = resolved.normalizedUrl || input.contentUrl.trim();

        let userId = ctx.user?.id;
        if (!userId) {
          const guestName = input.hostName?.trim() || "Host " + Math.floor(100 + Math.random() * 900);
          const openId = "guest_" + nanoid(10);
          const guestUser = await db.upsertUser({
            openId,
            name: guestName,
            avatarColor: "#D6FF3F",
            loginMethod: "guest",
            role: "user",
          });
          userId = guestUser.id;

          try {
            const sessionToken = await sdk.createSessionToken(openId, {
              name: guestName,
              expiresInMs: ONE_YEAR_MS,
            });
            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          } catch (tokenErr: any) {
            console.error("[Party] Failed to sign host session token:", tokenErr);
          }
        }

        // Generate canonical Room Code format: PO-XXXXXX
        const code = db.generateRoomCode();

        // Securely hash password if provided
        const passwordHash =
          input.accessMode === "password" && input.password && input.password.trim()
            ? db.hashRoomPassword(input.password.trim())
            : null;

        const normalizedAccessMode: "open" | "password" | "approval" =
          input.accessMode === "host_approval" ? "approval" : input.accessMode;

        const room = await db.createRoom({
          code,
          title: input.title.trim(),
          description: input.description?.trim() || "",
          category: input.category || "movies",
          platform: finalPlatform,
          contentUrl: finalUrl,
          hostId: userId,
          status: "active",
          privacyMode: input.privacyMode,
          accessMode: normalizedAccessMode,
          passwordHash,
          maxParticipants: input.maxParticipants,
          hostOnlyPlayback: input.hostOnlyPlayback,
          viewerCount: 1,
          startedAt: new Date(),
          isPlaying: false,
          currentPosition: 0,
          settings: input.settings ?? {
            hostOnlyControls: input.hostOnlyPlayback,
            lockSeeking: false,
            allowReactions: true,
            allowVoice: true,
            isPublic: input.privacyMode === "public",
          },
        });

        return room;
      }),

    get: publicProcedure
      .input(z.object({ code: z.string().min(1) }))
      .query(async ({ input }) => {
        const room = await db.getRoomByCode(input.code);
        if (!room) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Party room "${input.code.toUpperCase()}" not found. Check the room ID or invite link.`,
          });
        }
        // Never return passwordHash to client
        const { passwordHash, ...safeRoom } = room;
        return {
          ...safeRoom,
          hasPassword: Boolean(passwordHash),
        };
      }),

    verifyPassword: publicProcedure
      .input(
        z.object({
          code: z.string().min(1),
          password: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const room = await db.getRoomByCode(input.code);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Party room not found." });
        }
        if (room.status === "ended") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This watch party has already ended." });
        }
        if (!room.passwordHash) {
          return { success: true, valid: true };
        }
        const matches = db.verifyRoomPassword(input.password, room.passwordHash);
        if (!matches) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid room password. Please try again." });
        }
        return { success: true, valid: true };
      }),

    requestJoin: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const room = await db.getRoomByCode(input.code);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Party room not found." });
        }
        const request = await db.createJoinRequest(room.code, ctx.user.id);
        return { success: true, request };
      }),

    listJoinRequests: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const room = await db.getRoomByCode(input.code);
        if (!room || room.hostId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the host can view join requests." });
        }
        return db.listRoomJoinRequests(room.code);
      }),

    respondJoinRequest: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          action: z.enum(["approved", "rejected"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await db.respondJoinRequest(input.requestId, input.action);
        return { success: true, request: updated };
      }),

    inviteFriend: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1),
          friendId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const room = await db.getRoomByCode(input.code);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Party room not found." });
        }
        const invite = await db.sendPartyInvite(room.code, ctx.user.id, input.friendId);
        return { success: true, invite };
      }),

    listInvites: protectedProcedure.query(async ({ ctx }) => {
      return db.listUserPartyInvites(ctx.user.id);
    }),

    respondInvite: protectedProcedure
      .input(
        z.object({
          inviteId: z.number(),
          action: z.enum(["accept", "decline"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const success = await db.respondPartyInvite(input.inviteId, ctx.user.id, input.action);
        return { success };
      }),

    list: publicProcedure.query(async ({ ctx }) => {
      return db.listActiveRooms(ctx.user?.id);
    }),

    listActive: publicProcedure.query(async ({ ctx }) => {
      return db.listActiveRooms(ctx.user?.id);
    }),

    listHistory: publicProcedure
      .input(z.object({ userId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.listHistoryRooms(input?.userId ?? ctx.user?.id);
      }),

    end: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const room = await db.getRoomByCode(input.code);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Party room not found." });
        }
        if (room.hostId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the party host has permission to end this watch party.",
          });
        }

        const endedRoom = await db.endRoom(room.id);
        broadcastPartyEndedToRoom(room.code, "Watch party ended by the host.");
        return { success: true, room: endedRoom };
      }),

    leave: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const room = await db.getRoomByCode(input.code);
        if (room) {
          await db.recordMemberLeave(room.id, ctx.user.id);
          await db.updateUserLiveActivity(ctx.user.id, {
            currentRoomCode: null,
            currentActivityTitle: null,
            currentActivityPlatform: null,
          });
        }
        return { success: true };
      }),

    updateSettings: protectedProcedure
      .input(
        z.object({
          roomId: z.number(),
          settings: z.object({
            hostOnlyControls: z.boolean().optional(),
            lockSeeking: z.boolean().optional(),
            allowReactions: z.boolean().optional(),
            allowVoice: z.boolean().optional(),
            isPublic: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const room = await db.getRoomById(input.roomId);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Room not found." });
        }
        if (room.hostId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the host can modify room settings.",
          });
        }

        await db.updateRoomSettings(input.roomId, input.settings);
        return { success: true };
      }),

    getMessages: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return db.getRoomMessages(input.roomId);
      }),
  }),

  world: router({
    getStats: publicProcedure.query(async () => {
      return db.getWorldStats();
    }),

    listParties: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          platform: z.string().optional(),
          search: z.string().optional(),
          sort: z.enum(["trending", "viewers", "recent"]).default("trending"),
          page: z.number().default(1),
          limit: z.number().default(12),
        })
      )
      .query(async ({ input }) => {
        return db.listWorldParties(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
