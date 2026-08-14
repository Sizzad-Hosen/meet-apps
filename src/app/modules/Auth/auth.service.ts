import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import { generateToken, verifyToken } from "../../../helpers/jwtHelpers";
import prisma from "../../../lib/prisma";
import { sendEmail } from "../../../shared/sendEmail";
import type {
  ForgotPasswordInput,
  LoginUserInput,
  RegisterUserInput,
  ResetPasswordInput,
} from "./auth.validation";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isVerified: true,
  createdAt: true,
} as const;

type TokenUser = {
  id: string;
  email: string;
  role: string;
};

const createSessionTokens = (user: TokenUser) => {
  const claims = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return {
    accessToken: generateToken(claims, config.jwt.jwt_secret, config.jwt.expires_in),
    refreshToken: generateToken(
      claims,
      config.jwt.refresh_token_secret,
      config.jwt.refresh_token_expires_in,
    ),
  };
};

const registerUser = async (payload: RegisterUserInput) => {
  const email = payload.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "An account with this email already exists. Sign in instead.",
    );
  }

  const password = await bcrypt.hash(payload.password, config.salt_round);
  const user = await prisma.user.create({
    data: {
      name: payload.name.trim(),
      email,
      password,
    },
    select: publicUserSelect,
  });

  return {
    user,
    ...createSessionTokens(user),
  };
};

const loginUser = async (payload: LoginUserInput) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email.trim().toLowerCase() },
  });

  if (!user?.password || !(await bcrypt.compare(payload.password, user.password))) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const { password: _password, ...safeUser } = user;
  return {
    user: safeUser,
    ...createSessionTokens(user),
  };
};

const forgotPasswordUser = async (payload: ForgotPasswordInput) => {
  const email = payload.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Return the same response for known and unknown addresses to prevent account enumeration.
  if (!user) {
    return { accepted: true };
  }

  const resetToken = generateToken(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      purpose: "password_reset",
    },
    config.jwt.reset_pass_secret,
    config.jwt.reset_pass_token_expires_in,
  );
  const resetLink = `${config.reset_pass_link}?token=${encodeURIComponent(resetToken)}`;

  await sendEmail(
    user.email,
    `<p>Use this link to reset your password: <a href="${resetLink}">Reset password</a>.</p>`,
  );

  return { accepted: true };
};

const resetPassword = async (payload: ResetPasswordInput) => {
  const claims = await verifyToken(payload.token, config.jwt.reset_pass_secret);

  if (claims.purpose !== "password_reset" || !claims.userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid password reset token");
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid password reset token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(payload.newPassword, config.salt_round) },
  });

  return { reset: true };
};

const refreshToken = async (token: string) => {
  const claims = await verifyToken(token, config.jwt.refresh_token_secret);
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: publicUserSelect,
  });

  if (!user || user.email !== claims.email) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired refresh token");
  }

  return {
    user,
    ...createSessionTokens(user),
  };
};

export const AuthServices = {
  registerUser,
  loginUser,
  forgotPasswordUser,
  resetPassword,
  refreshToken,
};
