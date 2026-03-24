
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import prisma from '../../../lib/prisma';
import ApiError from '../../errors/ApiError';
import config from '../../config';
import { generateToken, verifyToken } from '../../../helpers/jwtHelpers';
import { sendEmail } from '../../../shared/sendEmail';
// import { blockToken } from '../../../helpers/tokenBlocklist';

const registerUser = async (payload: any) => {

  const passwordHash = await bcrypt.hash(
    payload.password,
    Number(config.salt_round) 
  );

const newUser = await prisma.user.create({
  data: {
    name:     payload.name,
    email:    payload.email,
    password: passwordHash
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

  const tokenPayload = {
    userId: newUser.id,
    email:  newUser.email,
    role:   newUser.role,
  };

  const accessToken = generateToken(
    tokenPayload,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  const refreshToken = generateToken(
    tokenPayload,
    config.jwt.refresh_token_secret as string,
    config.jwt.refresh_token_expires_in as string
  );

  return {
    user: newUser,
    accessToken,
    refreshToken,
  };
};

// Login
const loginUser = async (payload: any) => {

  // 1. User exists check
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  console.log("existingUser", existingUser)
  if (!existingUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  // 2. OAuth user
  if (!existingUser.password) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Please login with Google');
  }

  // 3. Password compare
  const isMatch = await bcrypt.compare(
    payload.password,
    existingUser.password
  );

  if (!isMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');
  }

  // 4. Token payload
  const tokenPayload = {
    userId: existingUser.id,
    email:  existingUser.email,
    role:   existingUser.role,
  };

  console.log("tokenPayload", tokenPayload)
  // 5. Token generate
  const accessToken = generateToken(
    tokenPayload,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );

  console.log("accessToken", accessToken)

  const refreshToken = generateToken(
    tokenPayload,
    config.jwt.refresh_token_secret as string,
    config.jwt.refresh_token_expires_in as string
  );
  console.log("refreshToken", refreshToken)

  // 6. passwordHash 
  const { password: _, ...safeUser } = existingUser;

  return {
    user: safeUser,
    accessToken,
    refreshToken,
  };
};


const forgotPasswordUser = async(payload: { email: string })=>{

  const user = await prisma.user.findUnique({
    where:{
      email:payload.email
    }
  })
  
  if(!user){
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found with this email');
  }

  // if(!user.isVerified){
  //   throw new ApiError(StatusCodes.BAD_REQUEST, 'Please verify your email first');
  // }

  const resetLink = `${config.reset_pass_link}?token=${user.id}`;

  await sendEmail(user.email, `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`);

  return {
    resetLink
  }


}

const resetPassword = async(payload: { email: string, newPassword: string })=>{

   const isUserExist = await prisma.user.findUnique({
        where: {
            email: payload.email,
        }
    })

    if (!isUserExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    }

    // if (!isUserExist.isVerified) {
    //     throw new ApiError(StatusCodes.BAD_REQUEST, "Email not verified");
    // }


    const newHashedPassword = await bcrypt.hash(payload.newPassword, Number(config.salt_round));
    await prisma.user.update({
        where: {
            id: isUserExist.id,
        },
        data: {
            password: newHashedPassword,
        }
    });

  
}
const refreshToken = async (token: string) => {
  
  const decoded = await verifyToken(token, config.jwt.refresh_token_secret as string); // ✅ await here

  if (!decoded?.email) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: decoded.email },
  });

  if (!existingUser) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
  }

  const tokenPayload = {
    userId: existingUser.id,
    email:  existingUser.email,
    role:   existingUser.role,
  };

  const accessToken = generateToken(
    tokenPayload,
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  const newRefreshToken = generateToken(
    tokenPayload,
    config.jwt.refresh_token_secret as string,
    config.jwt.refresh_token_expires_in as string,
  );

  return { accessToken, refreshToken: newRefreshToken };
};

const logoutUser = async (token: string) => {
  const decoded = await verifyToken(token, config.jwt.refresh_token_secret as string);

  if (!decoded?.email) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  // ✅ Redis blocklist (production)
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = (decoded.exp as number) - now;

  if (expiresInSeconds > 0) {
    // await blockToken(token, expiresInSeconds);
  }
};


export const AuthServices = {
  registerUser,
  loginUser,
  forgotPasswordUser,
  resetPassword,
  refreshToken,
  logoutUser
};

