
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { catchAsync }   from '../../../shared/catchAsync';
import { AuthServices } from './auth.service';
import { sendResponse } from '../../../shared/sendResponse';
import httpStatus from "http-status";
// REGISTER

const register = catchAsync(async (req: Request, res: Response) => {

const result = await AuthServices.registerUser(req.body);
  const { refreshToken } = result;

  res.cookie("refreshToken", refreshToken, {
    secure: false,
    httpOnly: true,
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'User registered successfully',
    data: {
      user: result.user
    },
  });
});


// LOGIN
const login= catchAsync(async (req: Request, res: Response) => {

    
  const result = await AuthServices.loginUser(req.body);
  console.log("result", result)
  const { refreshToken } = result;

  res.cookie("refreshToken", refreshToken, {
    secure: false,
    httpOnly: true,
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Login successful!",
    data: result,
  });
});

const forgotPassword = catchAsync(async(req:Request, res:Response)=>{

  const result = await AuthServices.forgotPasswordUser(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password reset link sent to your email!",
    data: result,
  });
})

const resetPassword = catchAsync(
    async (req: Request, res: Response) => {

        await AuthServices.resetPassword(req.body);

   
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password reset successfully!",
  });
})
    
const refreshToken = catchAsync(async(req,res)=>{
  
  const {refreshToken} = req.cookies;

  console.log('refresh token', req.cookies)

  const result =  await AuthServices.refreshToken(refreshToken);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token is retrieved successfully!',
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  // ✅ Guard: if no cookie, just clear and return
  if (!refreshToken) {
    res.clearCookie('refreshToken');
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
    return;
  }

  await AuthServices.logoutUser(refreshToken);

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});


export const AuthControllers = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
};
