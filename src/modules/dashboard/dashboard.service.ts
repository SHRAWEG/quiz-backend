import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Role } from 'src/common/enums/roles.enum';
import { Repository } from 'typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { QuestionSetAttempt } from '../question-set-attempt/entities/question-set-attempt.entity';
import { Question } from '../questions/entities/question.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,

    @InjectRepository(QuestionSetAttempt)
    private readonly questionSetAttemptRepo: Repository<QuestionSetAttempt>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async getAdminDashboard() {
    const now = new Date();
    const startOfTheWeek = new Date(now);
    startOfTheWeek.setDate(now.getDate() - now.getDay());

    const userQuery = this.userRepo.createQueryBuilder('user');
    const questionSetAttemptQuery =
      this.questionSetAttemptRepo.createQueryBuilder('questionSetAttempt');

    const totalStudents = await userQuery
      .where('user.role = :role', { role: Role.STUDENT })
      .getCount();

    const totalTeachers = await userQuery
      .where('user.role = :role', { role: Role.TEACHER })
      .getCount();

    const newStudentsThisWeek = await userQuery
      .where('user.role = :role', { role: Role.STUDENT })
      .andWhere('user.createdAt BETWEEN :start AND :end', {
        start: startOfTheWeek,
        end: now,
      })
      .getCount();

    const newTeachersThisWeek = await userQuery
      .where('user.role = :role', { role: Role.TEACHER })
      .andWhere('user.createdAt BETWEEN :start AND :end', {
        start: startOfTheWeek,
        end: now,
      })
      .getCount();

    const totalQuestionSetAttempts = await questionSetAttemptQuery.getCount();

    const averageQuestionsPerTeacherRaw = await this.questionRepo
      .createQueryBuilder('outer')
      .select('AVG(sub.count)', 'avg')
      .from((subQb) => {
        return subQb
          .select('question.createdById', 'teacherId')
          .addSelect('COUNT(*)', 'count')
          .from(Question, 'question')
          .groupBy('question.createdById');
      }, 'sub')
      .getRawOne<{ avg: string }>();
    const averageQuestionsPerTeacher = parseFloat(
      averageQuestionsPerTeacherRaw?.avg ?? '0',
    );

    return {
      success: 'true',
      data: {
        totalStudents,
        totalTeachers,
        newStudentsThisWeek,
        newTeachersThisWeek,
        totalQuestionSetAttempts,
        averageQuestionsPerTeacher,
      },
    };
  }

  async getStudentDashboard() {
    const user = this.request.user;

    const questionSetAttemptQuery =
      this.questionSetAttemptRepo.createQueryBuilder('questionSetAttempt');

    // ✅ Total attempts
    const totalAttempts = await questionSetAttemptQuery
      .clone()
      .where('questionSetAttempt.userId = :userId', { userId: user.sub })
      .getCount();

    // ✅ Completed attempts
    const completedCount = await questionSetAttemptQuery
      .clone()
      .where('questionSetAttempt.userId = :userId', { userId: user.sub })
      .andWhere('questionSetAttempt.isCompleted = true')
      .getCount();

    // ✅ Incomplete attempts
    const incompleteCount = await questionSetAttemptQuery
      .clone()
      .where('questionSetAttempt.userId = :userId', { userId: user.sub })
      .andWhere('questionSetAttempt.isCompleted = false')
      .getCount();

    // ✅ Total time spent in seconds
    const totalTimeResult = await questionSetAttemptQuery
      .clone()
      .select(
        `SUM(EXTRACT(EPOCH FROM ("questionSetAttempt"."completed_at" - "questionSetAttempt"."started_at")))`,
        'totalTime',
      )
      .where('"questionSetAttempt"."user_id" = :userId', { userId: user.sub })
      .andWhere('"questionSetAttempt"."is_completed" = true')
      .getRawOne<{ totalTime: string }>();

    const totalTimeInSeconds = parseFloat(totalTimeResult?.totalTime || '0');

    return {
      success: true,
      data: {
        totalQuestionSetsAttempted: totalAttempts,
        completedQuestionSets: completedCount,
        incompleteQuestionSets: incompleteCount,
        timeSpentInSeconds: totalTimeInSeconds,
      },
    };
  }

  async getTeacherDashboard() {
    const user = this.request.user;

    const questionQuery = this.questionRepo.createQueryBuilder('question');

    // ✅ Total questions authored
    const totalAuthored = await questionQuery
      .clone()
      .where('question.created_by_id = :teacherId', { teacherId: user.sub })
      .getCount();

    // ✅ Total questions used in question sets
    const usedInQuestionSets = await questionQuery
      .clone()
      .innerJoin('question.questionSets', 'qs')
      .where('question.created_by_id = :teacherId', { teacherId: user.sub })
      .getCount();

    // ✅ Total approved questions filtered by status string
    const approvedQuestions = await questionQuery
      .clone()
      .where('question.created_by_id = :teacherId', { teacherId: user.sub })
      .andWhere('question.status = :status', { status: 'approved' })
      .getCount();

    return {
      success: 'true',
      data: {
        totalQuestionsAuthored: totalAuthored,
        totalUsedInQuestionSets: usedInQuestionSets,
        totalApprovedQuestions: approvedQuestions,
      },
    };
  }

  async getLeaderboard() {
    const currentUserId = this.request.user?.sub;
    if (!currentUserId) {
      return { success: true, data: [] };
    }

    type LeaderboardRow = {
      id: string;
      name: string;
      score: number;
      attempts: number;
      profilepicture: string;
    };

    // 1. Get all users with at least one completed attempt and their stats
    const allRanked: LeaderboardRow[] = await this.userRepo
      .createQueryBuilder('user')
      .leftJoin(
        QuestionSetAttempt,
        'qsa',
        'qsa.userId = user.id AND qsa.isCompleted = true',
      )
      .leftJoin(QuestionAttempt, 'qa', 'qa.questionSetAttemptId = qsa.id')
      .select([
        'user.id AS id',
        'user.profilePicture AS profilePicture',
        `CONCAT(user.firstName, ' ', user.lastName) AS name`,
        `COALESCE(
          ROUND(
            (SUM(CASE WHEN qa.isCorrect = TRUE THEN 1 ELSE 0 END)::decimal / 
            NULLIF(COUNT(qa.id), 0)
            ) * 100, 2
          ), 0
        ) AS score`,
        'COUNT(DISTINCT qsa.id) AS attempts',
      ])
      .where('user.role = :role', { role: Role.STUDENT })
      .groupBy('user.id')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.profilePicture')
      .having('COUNT(qsa.id) > 0')
      .getRawMany();

    // 2. Sort and rank in JS
    allRanked.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.attempts - b.attempts;
    });

    const formatted = allRanked.map((u, idx) => ({
      id: u.id,
      rank: idx + 1,
      name: u.name,
      score: Number(u.score) || 0,
      attempts: Number(u.attempts) || 0,
      isCurrentUser: u.id === currentUserId,
      profilePicture: u.profilepicture || null,
    }));

    // 3. Prepare leaderboard: top 10 + current user if not in top 10
    let data = formatted.slice(0, 10);
    const currentUserEntry = formatted.find((u) => u.id === currentUserId);
    if (currentUserEntry && !data.some((u) => u.id === currentUserId)) {
      data = [...data, currentUserEntry];
    }

    return {
      success: true,
      data,
    };
  }
}
