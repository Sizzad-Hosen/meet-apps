import z from "zod";

const meetingCodeSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
});

const createBreakoutSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
    body: z.object({
        rooms: z.array(z.object({
            name: z.string().trim().min(1).max(100).optional(),
            participantIds: z.array(z.string().uuid()).optional(),
        }).superRefine((room, ctx) => {
            if (!room.name && (!room.participantIds || room.participantIds.length === 0)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Room must have either a name or at least one participant",
                });
            }
        })).min(1).optional(),
    }).optional(),
});

const joinBreakoutSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
        roomId: z.string().uuid(),
    }),
});

const broadcastBreakoutSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
    body: z.object({
        message: z.string().trim().min(1).max(1000),
    }),
});

export type CreateBreakoutInput = NonNullable<z.infer<typeof createBreakoutSchema>["body"]>;
export type BroadcastBreakoutInput = z.infer<typeof broadcastBreakoutSchema>["body"];

export const BreakoutValidation = {
    meetingCodeSchema,
    createBreakoutSchema,
    joinBreakoutSchema,
    broadcastBreakoutSchema,
};
