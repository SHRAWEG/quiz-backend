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

    try {
      // 1. Get top 10 users ordered by score (desc) then attempts (asc)
      type LeaderboardRow = {
        id: string;
        name: string;
        score: string;
        attempts: string;
      };

      const top10: LeaderboardRow[] = await this.userRepo
        .createQueryBuilder('user')
        .leftJoin(
          QuestionSetAttempt,
          'qsa',
          'qsa.userId = user.id AND qsa.isCompleted = true',
        )
        .leftJoin(QuestionAttempt, 'qa', 'qa.questionSetAttemptId = qsa.id')
        .select([
          'user.id AS id',
          `CONCAT(user.firstName, ' ', user.lastName) AS name`,
          `ROUND(
          (SUM(CASE WHEN qa.isCorrect = TRUE THEN 1 ELSE 0 END)::decimal / 
          NULLIF(COUNT(qa.id), 0)) * 100, 
          2
        ) AS score`,
          'COUNT(DISTINCT qsa.id) AS attempts',
        ])
        .where('user.role = :role', { role: Role.STUDENT })
        .groupBy('user.id')
        .addGroupBy('user.firstName')
        .addGroupBy('user.lastName')
        .orderBy('score', 'DESC')
        .addOrderBy('attempts', 'ASC')
        .limit(10)
        .getRawMany();

      // 2. Get current user's stats
      type UserStats =
        | {
            score: string;
            attempts: string;
          }
        | undefined;

      const currentUserStats: UserStats = await this.userRepo
        .createQueryBuilder('user')
        .leftJoin(
          QuestionSetAttempt,
          'qsa',
          'qsa.userId = user.id AND qsa.isCompleted = true',
        )
        .leftJoin(QuestionAttempt, 'qa', 'qa.questionSetAttemptId = qsa.id')
        .select([
          `ROUND(
          (SUM(CASE WHEN qa.isCorrect = TRUE THEN 1 ELSE 0 END)::decimal / 
          NULLIF(COUNT(qa.id), 0)) * 100, 
          2
        ) AS score`,
          'COUNT(DISTINCT qsa.id) AS attempts',
        ])
        .where('user.id = :id', { id: currentUserId })
        .groupBy('user.id')
        .getRawOne();

      // 3. Format top 10 with ranks
      const formattedTop10 = top10.map((user, index) => ({
        id: user.id,
        rank: index + 1,
        name: user.name,
        score: Number(user.score) || 0,
        attempts: Number(user.attempts) || 0,
        isCurrentUser: user.id === currentUserId,
      }));

      // 4. Calculate current user's rank if not in top 10
      let currentUserData: {
        id: string;
        rank: number;
        name: string;
        score: number;
        attempts: number;
        isCurrentUser: boolean;
      } | null = null;

      if (currentUserStats) {
        const parsedScore = Number(currentUserStats.score) || 0;
        const parsedAttempts = Number(currentUserStats.attempts) || 0;

        // Count users with better scores or same score but fewer attempts
        const betterUsersCount = await this.userRepo
          .createQueryBuilder('user')
          .leftJoin(
            QuestionSetAttempt,
            'qsa',
            'qsa.userId = user.id AND qsa.isCompleted = true',
          )
          .leftJoin(QuestionAttempt, 'qa', 'qa.questionSetAttemptId = qsa.id')
          .select('user.id', 'id')
          .addSelect(
            `ROUND(
            (SUM(CASE WHEN qa.isCorrect = TRUE THEN 1 ELSE 0 END)::decimal / 
            NULLIF(COUNT(qa.id), 0)) * 100, 
            2
          )`,
            'score',
          )
          .addSelect('COUNT(DISTINCT qsa.id)', 'attempts')
          .where('user.role = :role', { role: Role.STUDENT })
          .andWhere('user.id != :currentUserId', { currentUserId })
          .groupBy('user.id')
          .addGroupBy('user.firstName')
          .addGroupBy('user.lastName')
          .having(
            `(ROUND(
            (SUM(CASE WHEN qa.isCorrect = TRUE THEN 1 ELSE 0 END)::decimal / 
            NULLIF(COUNT(qa.id), 0)) * 100, 
            2
          ) > :score)
          OR (
            ROUND(
              (SUM(CASE WHEN qa.isCorrect = TRUE THEN 1 ELSE 0 END)::decimal / 
              NULLIF(COUNT(qa.id), 0)) * 100, 
              2
            ) = :score
            AND COUNT(DISTINCT qsa.id) < :attempts
          )`,
            {
              score: parsedScore,
              attempts: parsedAttempts,
            },
          )
          .getCount();

        currentUserData = {
          id: currentUserId,
          rank: betterUsersCount + 1,
          name: await this.getUserName(currentUserId),
          score: parsedScore,
          attempts: parsedAttempts,
          isCurrentUser: true,
        };
      }

      return {
        success: true,
        data:
          currentUserData && !formattedTop10.some((u) => u.id === currentUserId)
            ? [...formattedTop10, currentUserData]
            : formattedTop10,
      };
    } catch {
      return { success: false, message: 'Error fetching leaderboard' };
    }
  }

  // Helper function to get user name
  private async getUserName(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['firstName', 'lastName'],
    });
    return user ? `${user.firstName} ${user.lastName}` : 'Current User';
  }
}
