import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/common/enums/roles.enum';
import { Repository } from 'typeorm';
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
    private readonly questionSetAttmptRepo: Repository<QuestionSetAttempt>,
  ) {}

  async getAdminDashboard() {
    const now = new Date();
    const startOfTheWeek = new Date(now);
    startOfTheWeek.setDate(now.getDate() - now.getDay());

    const userQuery = this.userRepo.createQueryBuilder('user');
    const questionSetAttemptQuery =
      this.questionSetAttmptRepo.createQueryBuilder('questionSetAttempt');

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

    const averageQuestionsPerTeacher = await this.questionRepo
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
}
