import { AuthValidation } from "../../src/app/modules/Auth/auth.validation";
import { BreakoutValidation } from "../../src/app/modules/Breakout/breakout.validation";
import { LiveKitValidation } from "../../src/app/modules/LiveKit/livekit.validation";
import { MeetingsValidation } from "../../src/app/modules/Meetings/meetings.validation";
import { PollsValidation } from "../../src/app/modules/Polls/polls.validation";
import { RecordValidation } from "../../src/app/modules/Record/record.validation";
import { ScreenShareValidation } from "../../src/app/modules/ScreenShare/screenShare.validation";

describe("module request validation", () => {
  test("auth accepts valid registration and requires a reset token", () => {
    expect(AuthValidation.registerUserSchema.safeParse({
      body: { name: "Ada Lovelace", email: "ADA@example.com", password: "secret12" },
    }).success).toBe(true);
    expect(AuthValidation.resetPasswordSchema.safeParse({
      body: { email: "ada@example.com", newPassword: "new-secret" },
    }).success).toBe(false);
    expect(AuthValidation.resetPasswordSchema.safeParse({
      body: { token: "signed-token", newPassword: "new-secret" },
    }).success).toBe(true);
  });

  test("meeting join codes are normalized", () => {
    const parsed = MeetingsValidation.joinMeetingSchema.parse({
      body: { joinCode: "ab12-cd34" },
    });
    expect(parsed.body.joinCode).toBe("AB12CD34");
  });

  test("meeting updates reject an empty body", () => {
    expect(MeetingsValidation.updateMeetingSchema.safeParse({
      params: { code: "ABCD1234" },
      body: {},
    }).success).toBe(false);
  });

  test("breakout rooms validate participant UUIDs", () => {
    expect(BreakoutValidation.createBreakoutSchema.safeParse({
      params: { code: "ABCD1234" },
      body: { rooms: [{ name: "Room A", participantIds: ["not-a-uuid"] }] },
    }).success).toBe(false);
  });

  test("polls require at least two non-empty options", () => {
    expect(PollsValidation.createPollSchema.safeParse({
      params: { code: "ABCD1234" },
      body: { question: "Choose", options: ["Only one"] },
    }).success).toBe(false);
  });

  test("recording, screen-share, and LiveKit identifiers are bounded", () => {
    expect(RecordValidation.recordingIdSchema.safeParse({
      params: { recordingId: "not-a-uuid" },
    }).success).toBe(false);
    expect(ScreenShareValidation.userActionSchema.safeParse({
      params: { code: "ABCD1234", userId: "not-a-uuid" },
    }).success).toBe(false);
    expect(LiveKitValidation.tokenSchema.safeParse({
      body: { joinCode: "x" },
    }).success).toBe(false);
  });
});
