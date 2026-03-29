export enum MeetingStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  ENDED = "ended"
}

export enum MeetingType {
  INSTANT = "instant",
  SCHEDULED = "scheduled"
}

export enum ParticipantRole {
  HOST = "host",
  COHOST = "cohost",
  GUEST = "guest"
}

export enum ParticipantStatus {
  WAITING = "waiting",
  ADMITTED = "admitted",
  DENIED = "denied",
  LEFT = "left"
}

export interface Meeting {
  id: number;
  title: string;
  description: string;
  date: Date;

  joinCode: string;
  hostId: string;
  userId: string;

  livekitRoomName: string;

  status: MeetingStatus;
  type: MeetingType;

  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;

  waitingRoomOn: boolean;
  passwordHash?: string;

  maxParticipants: number;

  allowScreenshare: boolean;
  screenshareNeedsApproval: boolean;
  isRecorded: boolean;

  createdAt?: Date;
}