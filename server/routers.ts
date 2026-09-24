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
    me: publicProcedure.query(opts => opts.ctx.user),

    guestLogin: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(50).optional(),
          avatarColor: z.string().optional(),
        }).optional()
      )
      .mutation(async ({ ctx, input }) => {
        const guestName = input?.name?.trim() || "Guest " + Math.floor(1000 + Math.random() * 9000);
        const avatarColor = input?.avatarColor || "#D6FF3F";
        const openId = "guest_" + nanoid(10);

        const user = await db.upsertUser({
          openId,
          name: guestName,
          email: null,
          avatarColor,
          loginMethod: "guest",
          role: "user",
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

        const user = await db.upsertUser({
          openId,
          googleId,
          name: name || existing?.name || "Google User",
          email,
          avatarUrl: avatarUrl || existing?.avatarUrl || null,
          avatarColor: existing?.avatarColor || "#4285F4",
          loginMethod: "google",
          role: existing?.role || "user",
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

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(64),
          avatarColor: z.string().min(4).max(32).optional(),
          avatarUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await db.updateUserProfile(ctx.user.id, {
          name: input.name.trim(),
          avatarColor: input.avatarColor,
          avatarUrl: input.avatarUrl,
        });

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

        return updated || ctx.user;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  party: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1).max(120),
          platform: z.string().min(1).max(64),
          contentUrl: z.string().min(1),
          hostName: z.string().optional(),
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
        // Resolve & validate content URL via Universal Engine
        const resolved = resolveStreamingContent(input.contentUrl);
        const finalPlatform = resolved.platform !== "generic" ? resolved.platform : input.platform.toLowerCase().trim();
        const finalUrl = resolved.normalizedUrl || input.contentUrl.trim();

        // Ensure user exists (create guest if unauthenticated)
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
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create party: The server security configuration is incomplete. Please check the PlayOra server environment configuration.",
            });
          }
        }

        // Generate clean alphanumeric 8-char uppercase code (excluding confusing chars)
        const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
        let code = "";
        for (let i = 0; i < 8; i++) {
          code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }

        const room = await db.createRoom({
          code,
          title: input.title.trim(),
          platform: finalPlatform,
          contentUrl: finalUrl,
          hostId: userId,
          status: "active",
          startedAt: new Date(),
          isPlaying: false,
          currentPosition: 0,
          settings: input.settings ?? {
            hostOnlyControls: true,
            lockSeeking: false,
            allowReactions: true,
            allowVoice: true,
            isPublic: true,
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
            message: `Party room "${input.code.toUpperCase()}" not found. Check the invite link.`,
          });
        }
        return room;
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
          throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
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
});

export type AppRouter = typeof appRouter;
