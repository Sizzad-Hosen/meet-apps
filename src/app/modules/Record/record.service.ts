import { EncodedFileOutput, S3Upload } from 'livekit-server-sdk';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StatusCodes } from 'http-status-codes';
import prisma from '../../../lib/prisma';
import { clientes } from '../../../helpers/s3';
import ApiError from '../../errors/ApiError';
import { logger } from '../../../shared/logger';
import config from '../../config';

const hasErrorCode = (error: unknown, code: string): boolean => (
  typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === code
);

const getStorageConfig = () => {
  const storage = config.recording_storage;
  if (!storage) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, 'Recording storage is not configured');
  }

  return {
    region: storage.region,
    accessKey: storage.access_key_id,
    secret: storage.secret_access_key,
    bucket: storage.bucket,
  };
};

const createS3Client = () => {
  const storage = getStorageConfig();
  return {
    storage,
    client: new S3Client({
      region: storage.region,
      credentials: { accessKeyId: storage.accessKey, secretAccessKey: storage.secret }
    })
  };
};

const getMeetingByCode = async (code: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  return meeting;
};

export const startRecording = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCode(code);

  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host can start recording');
  }

  const existingRecording = await prisma.recording.findFirst({
    where: {
      meeting_id: meeting.id,
      status: 'recording'
    }
  });

  if (existingRecording) {
    throw new ApiError(StatusCodes.CONFLICT, 'Recording already in progress');
  }

  const admittedCount = await prisma.meetingParticipant.count({
    where: {
      meeting_id: meeting.id,
      status: 'admitted',
      left_at: null
    }
  });

  if (admittedCount === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot start recording without any admitted participants');
  }

  try {
    await clientes.roomServiceClient.createRoom({
      name: meeting.livekit_room_name,
      maxParticipants: meeting.max_participants
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }

  const filePath = `recordings/${meeting.id}/${Date.now()}.mp4`;
  const storage = getStorageConfig();

  const output = new EncodedFileOutput({
    filepath: filePath,
    output: {
      case: 's3',
      value: new S3Upload({
        accessKey: storage.accessKey,
        secret: storage.secret,
        region: storage.region,
        bucket: storage.bucket
      })
    }
  });

  let egressInfo;
  try {
    egressInfo = await clientes.egressClient.startRoomCompositeEgress(
      meeting.livekit_room_name,
      output
    );
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `Failed to start recording egress: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!egressInfo?.egressId) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, 'Egress failed to start properly');
  }

  try {
    return await prisma.recording.create({
      data: {
        meeting_id: meeting.id,
        egress_id: egressInfo.egressId,
        s3_key: filePath,
        status: 'recording'
      }
    });
  } catch (error: unknown) {
    if (hasErrorCode(error, 'P2002')) {
      throw new ApiError(StatusCodes.CONFLICT, 'Recording already in progress');
    }
    throw error;
  }
};

const stopRecording = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCode(code);

  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host can stop recording');
  }

  const recording = await prisma.recording.findFirst({
    where: { meeting_id: meeting.id, status: 'recording' }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No active recording found');
  }

  let durationSeconds: number | null = null;
  let status: 'completed' | 'failed' = 'completed';

  try {
    await clientes.egressClient.stopEgress(recording.egress_id);
    durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(recording.started_at).getTime()) / 1000)
    );
  } catch (error) {
    status = 'failed';
    logger.error('recording_egress_stop_failed', {
      recordingId: recording.id,
      egressId: recording.egress_id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return prisma.recording.update({
    where: { id: recording.id },
    data: {
      status,
      ended_at: new Date(),
      ...(typeof durationSeconds === "number" ? { duration_seconds: durationSeconds } : {}),
    }
  });
};

const getRecordings = async (meetingId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meetingId, user_id: currentUserId }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  return prisma.recording.findMany({
    where: { meeting_id: meetingId },
    orderBy: { created_at: 'desc' }
  });
};

const getDownloadUrl = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recording not found');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: recording.meeting_id, user_id: currentUserId }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  if (!recording.s3_key) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recording file is not available');
  }

  const sanitizedPath = recording.s3_key.replace(/\\/g, '/').replace(/^\/+/, '').replace(/^(\.\.\/)+/, '');
  const { client, storage } = createS3Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: storage.bucket, Key: sanitizedPath }),
    { expiresIn: 900 }
  );

  return {
    url,
    path: sanitizedPath,
    expires_in: 900
  };
};

const getRecordingForDownload = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recording not found');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: recording.meeting_id, user_id: currentUserId }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  return recording;
};

const deleteRecording = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recording not found');
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: recording.meeting_id }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host can delete');
  }

  if (recording.status === 'recording') {
    try {
      await clientes.egressClient.stopEgress(recording.egress_id);
    } catch (error) {
      logger.error('recording_egress_stop_failed', {
        recordingId: recording.id,
        egressId: recording.egress_id,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new ApiError(StatusCodes.CONFLICT, 'Cannot delete active recording; failed to stop egress');
    }
  }

  if (recording.s3_key) {
    try {
      const { client, storage } = createS3Client();
      await client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: recording.s3_key }));
    } catch (error) {
      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        `Failed to delete recording object: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return prisma.recording.delete({
    where: { id: recordingId }
  });
};

export const RecordingServices = {
  startRecording,
  stopRecording,
  getRecordings,
  getDownloadUrl,
  getRecordingForDownload,
  deleteRecording
};
