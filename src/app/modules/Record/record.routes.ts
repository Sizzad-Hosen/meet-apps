import { Router } from 'express';
import { auth } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { RecordingControllers } from './record.controller';
import { RecordValidation } from './record.validation';

const router = Router();

router.post('/:code/start', validateRequest(RecordValidation.codeOnlySchema), auth(), RecordingControllers.startRecording);
router.post('/:code/stop', validateRequest(RecordValidation.codeOnlySchema), auth(), RecordingControllers.stopRecording);

router.get('/:meetingId', validateRequest(RecordValidation.meetingIdSchema), auth(), RecordingControllers.getRecordings);
router.get('/:recordingId/download', validateRequest(RecordValidation.recordingIdSchema), auth(), RecordingControllers.downloadRecording);
router.delete('/:recordingId', validateRequest(RecordValidation.recordingIdSchema), auth(), RecordingControllers.deleteRecording);

export const RecordingRoutes = router;
