import { StatusCodes } from "http-status-codes";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import { ensureHost, getMeetingByCodeOrThrow, getParticipantOrThrow } from "../Meetings/meetings.helpers";
import { pollRepository } from "../../repositories/poll.repository";
import type { CreatePollInput, SubmitVoteInput } from "./polls.validation";

const createPoll = async (code: string, payload: CreatePollInput, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);
    const poll = await pollRepository.createWithOptions(
        meeting.id,
        payload.question,
        payload.options,
    );

    return poll;
};

const listPolls = async (code: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

    const polls = await pollRepository.listByMeetingId(meeting.id);

    return polls.map((poll) => ({
        ...poll,
        options: poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            voteCount: option.votes.length,
        })),
    }));
};

const submitPollVote = async (code: string, pollId: string, payload: SubmitVoteInput, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    if (poll.is_closed) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Poll is closed");
    }

    const option = poll.options.find((item) => item.id === payload.optionId);
    if (!option) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll option not found");
    }

    const existingVote = await prisma.pollVote.findUnique({
        where: {
            poll_id_voter_id: {
                poll_id: poll.id,
                voter_id: currentUserId,
            },
        },
    });

    if (existingVote) {
        return prisma.pollVote.update({
            where: { id: existingVote.id },
            data: { option_id: option.id },
        });
    }

    return prisma.pollVote.create({
        data: {
            poll_id: poll.id,
            option_id: option.id,
            voter_id: currentUserId,
        },
    });
};

const getPollResults = async (code: string, pollId: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
            options: { include: { votes: true } },
        },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    const results = poll.options.map((option) => ({
        id: option.id,
        text: option.text,
        voteCount: option.votes.length,
    }));

    const totalVotes = results.reduce((sum, item) => sum + item.voteCount, 0);

    return {
        pollId: poll.id,
        question: poll.question,
        is_closed: poll.is_closed,
        totalVotes,
        results,
    };
};

const closePoll = async (code: string, pollId: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    return prisma.poll.update({
        where: { id: pollId },
        data: {
            is_closed: true,
            closed_at: new Date(),
        },
    });
};

export const PollServices = {
    createPoll,
    listPolls,
    submitPollVote,
    getPollResults,
    closePoll,
};
