import type { Request } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../src/app/errors/ApiError";
import { requireUserId } from "../../src/shared/request";

describe("requireUserId", () => {
  test("returns the authenticated user ID", () => {
    const req = { user: { userId: "user-1", email: "a@example.com", role: "USER" } } as Request;
    expect(requireUserId(req)).toBe("user-1");
  });

  test("throws a typed unauthorized error when authentication is absent", () => {
    try {
      requireUserId({} as Request);
      throw new Error("Expected requireUserId to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED);
    }
  });
});
