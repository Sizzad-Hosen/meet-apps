import request from "supertest";
import app from "../../src/app";

describe("application HTTP contract", () => {
  test("health endpoint responds successfully", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ status: "ok" }),
    }));
  });

  test("validation errors use the global error format", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "invalid", password: "x" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: "Zod Validation Error",
      errorSources: expect.any(Array),
    }));
  });

  test("protected meeting routes reject missing credentials", async () => {
    const response = await request(app)
      .post("/api/v1/meetings/create")
      .send({ title: "Daily meeting", type: "instant" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: expect.stringContaining("access token"),
    }));
  });

  test("screen-share domain errors are forwarded instead of forced to 500", async () => {
    const response = await request(app)
      .post("/api/v1/screen-share/ABCD1234/screenshare/start");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
