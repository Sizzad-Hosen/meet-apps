import z from "zod";

const codeParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
});

const userIdParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
  userId: z.string().uuid(),
});

const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(255),
    type: z.enum(["instant", "scheduled"]).default("instant"),
    max_participants: z.number().int().min(2).max(500).optional(),
    waiting_room_on: z.boolean().optional(),
    allow_screenshare: z.boolean().optional(),
    screenshare_needs_approval: z.boolean().optional(),
    is_recorded: z.boolean().optional(),
    scheduled_at: z.string().datetime().optional(),
  }),
});

const joinMeetingSchema = z.object({
  body: z.object({
    joinCode: z.string()
      .transform((code) => code.replace(/[^a-z0-9]/gi, "").toUpperCase())
      .pipe(z.string().min(4).max(12)),
  }),
});

const meetingCodeSchema = z.object({
  params: codeParamSchema,
});

const participantActionSchema = z.object({
  params: userIdParamSchema,
});

const updateMeetingSchema = z.object({
  params: codeParamSchema,
  body: z.object({
    title: z.string().trim().min(2).max(255).optional(),
    waiting_room_on: z.boolean().optional(),
    max_participants: z.number().int().min(2).max(500).optional(),
    allow_screenshare: z.boolean().optional(),
    screenshare_needs_approval: z.boolean().optional(),
    is_recorded: z.boolean().optional(),
    scheduled_at: z.string().datetime().nullable().optional(),
  }).refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  }),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>["body"];
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>["body"];

export const MeetingsValidation = {
  createMeetingSchema,
  joinMeetingSchema,
  meetingCodeSchema,
  participantActionSchema,
  updateMeetingSchema,
};
