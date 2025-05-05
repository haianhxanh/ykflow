/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

type Request = {
  id: string;
  order_name: string;
  order_id: string;
  order_email: string;
  pause_start_date: Date;
  pause_end_date: Date;
  item_title: string;
  item_id: string;
  new_start_date: Date;
  new_end_date: Date;
  status: string;
  request_date: Date;
  merchant_note: string | null;
  user_note: string | null;
  created_by_id: string | null;
  updated_by_id: string;
  update_history: UpdateHistory[];
  createdAt: Date;
  updatedAt: Date;
};

type UpdateHistory = {
  timestamp: Date;
  updatedBy: string;
  details: string;
};

export const requestRouter = createTRPCRouter({
  // Get all requests
  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }
    try {
      const requests = await ctx.db
        .$queryRaw`SELECT * FROM "Request" ORDER BY "createdAt" DESC`;
      return requests as Request[];
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch requests",
      });
    }
  }),

  // Get request by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }): Promise<Request> => {
      try {
        const request = await ctx.db.request.findUnique({
          where: { id: input.id },
        });
        if (!request) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Request not found",
          });
        }
        return request;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch request:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch request",
        });
      }
    }),

  // Create new request
  create: protectedProcedure
    .input(
      z.object({
        order_name: z.string(),
        order_id: z.string(),
        order_email: z.string().email(),
        pause_start_date: z.date(),
        pause_end_date: z.date(),
        item_title: z.string(),
        item_id: z.string(),
        new_start_date: z.date(),
        new_end_date: z.date(),
        merchant_note: z.string().optional(),
        user_note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<Request> => {
      try {
        const request = await ctx.db.request.create({
          data: {
            ...input,
            created_by_id: ctx.session.user.id,
            updated_by_id: ctx.session.user.id,
            status: "PENDING",
            request_date: new Date(),
          },
        });
        return request;
      } catch (error) {
        console.error("Failed to create request:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create request",
        });
      }
    }),

  // Update request
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
        merchant_note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<Request> => {
      try {
        const request = await ctx.db.request.update({
          where: { id: input.id },
          data: {
            status: input.status,
            merchant_note: input.merchant_note,
            updated_by_id: ctx.session.user.id,
            update_history: {
              push: {
                timestamp: new Date(),
                updatedBy: ctx.session.user.id,
                details: "tbd",
              },
            },
            original_start_date: input.original_start_date,
            original_end_date: input.original_end_date,
            pause_start_date: input.pause_start_date,
            pause_end_date: input.pause_end_date,
            new_start_date: input.new_start_date,
            new_end_date: input.new_end_date,
          },
        });
        return request;
      } catch (error) {
        console.error("Failed to update request:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update request",
        });
      }
    }),
});
