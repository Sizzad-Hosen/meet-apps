import jwt, { type Secret, type JwtPayload, type SignOptions } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../app/errors/ApiError";

export interface TokenClaims {
  userId: string;
  email: string;
  role: string;
  purpose?: "password_reset";
}

export interface AppJwtPayload extends JwtPayload, TokenClaims {}

export const generateToken = (
  payload: TokenClaims,
  secret: string,
  expiresIn: string,
): string => {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret, options);
};

export const verifyToken = async (token: string, secret: Secret): Promise<AppJwtPayload> => {
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication token is missing");
  }

  try {
    return jwt.verify(token, secret) as AppJwtPayload;
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired token");
  }
};
