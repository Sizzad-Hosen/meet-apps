import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { RecordingServices } from './record.service';
import { sendResponse } from '../../../shared/sendResponse';
import { catchAsync } from '../../../shared/catchAsync';
import { requireUserId } from '../../../shared/request';

const startRecording = catchAsync(async (req: Request, res: Response) => {
  const result = await RecordingServices.startRecording(req.params.code, requireUserId(req));
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: 'Recording started successfully', data: result });
});

const stopRecording = catchAsync(async (req: Request, res: Response) => {
  const result = await RecordingServices.stopRecording(req.params.code, requireUserId(req));
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: 'Recording stopped successfully', data: result });
});

const getRecordings = catchAsync(async (req: Request, res: Response) => {
  const result = await RecordingServices.getRecordings(req.params.meetingId, requireUserId(req));
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: 'Recordings fetched successfully', data: result });
});

const downloadRecording = catchAsync(async (req: Request, res: Response) => {
  const result = await RecordingServices.getDownloadUrl(req.params.recordingId, requireUserId(req));
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: 'Download URL generated successfully', data: result });
});

const deleteRecording = catchAsync(async (req: Request, res: Response) => {
  await RecordingServices.deleteRecording(req.params.recordingId, requireUserId(req));
  sendResponse(res, { statusCode: StatusCodes.OK, success: true, message: 'Recording deleted successfully', data: null });
});

export const RecordingControllers = {
  startRecording,
  stopRecording,
  getRecordings,
  deleteRecording,
  downloadRecording,
};
