import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import config from "../../config";
import { generateToken } from "../../../helpers/jwtHelpers";
const registerUser = async (payload: RegisterInput) => {

  // 1. Email check
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, 'Email already in use', );
  }

  // 2. password → passwordHash convert করো
  const passwordHash = await bcrypt.hash(payload.password, config.salt_round as string);

  // 3. new user create
  const newUser = await prisma.user.create({
    data: {
      name:         payload.name,
      email:        payload.email,
      passwordHash,           
    },
    select: {
      id:         true,
      name:       true,
      email:      true,
      role:       true,
      avatarUrl:  true,
      isVerified: true,
      createdAt:  true,
     
    },
  });
 const payloadUser = {
    userId: newUser.id,
    email:  newUser.email,
    role:   newUser.role,
 }
  // 4. Token generate
  const tokens = generateToken({
    payloadUser,
    secret :config.jwt.jwt_secret,
    expiresIn: config.jwt.expires_in as string

  });

  return { user: newUser, tokens };
};

const loginUser = async (payload: any) => {
    // 1. check user exists
    const existingUser = await prisma.user.findUnique({
        where: {
            email: payload.email
        }
    });

    if (!existingUser) {
        throw new Error("User does not exist!");
    }

    // 2. check password
    if (existingUser) {
        throw new Error("Invalid password!");
    }

    return existingUser;
};


export const AuthServices ={
    registerUser,
    loginUser
}