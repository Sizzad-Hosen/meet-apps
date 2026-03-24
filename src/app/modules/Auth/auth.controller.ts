
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

export const AuthControllers = {
  register,
  login,
  forgotPassword
};