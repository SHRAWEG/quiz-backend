import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QuestionType } from 'src/common/enums/question.enum';
import { DataSource, QueryRunner } from 'typeorm';
import { QuestionAttempt } from '../question-attempt/entities/question-attempt.entity';
import { QuestionSetAttempt } from '../question-set-attempt/entities/question-set-attempt.entity';

@Injectable()
export class CronTaskService {
  constructor(
    private readonly dataSource: DataSource, // required for transaction
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Cron('*/10 * * * * *')
  async handleExpiredQuizEvery30s() {
    console.log('⏰ Cron is running');
    await this.handleExpiredQuizzes();
  }

  async completeQuiz(questionSetAttemptId: string, queryRunner?: QueryRunner) {
    const manager = queryRunner?.manager || this.dataSource.manager;
    console.log('questiojnSetAttemtId : ', questionSetAttemptId);
    const questionSetAttempt = await manager
      .getRepository(QuestionSetAttempt)
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'question')
      .where('questionSetAttempt.id = :questionSetAttemptId', {
        questionSetAttemptId: questionSetAttemptId,
      })
      .getOne();

    if (!questionSetAttempt || questionSetAttempt.isCompleted) return;

    const questionAttempts = await manager
      .getRepository(QuestionAttempt)
      .createQueryBuilder('questionAttempt')
      .where('questionAttempt.questionSetAttemptId = :questionSetAttemptId', {
        questionSetAttemptId: questionSetAttemptId,
      })
      .getMany();

    const hasManuallyCheckableQuestions = questionAttempts.some(
      (questionAttempt) =>
        questionAttempt.question.type === QuestionType.SHORT ||
        questionAttempt.question.type === QuestionType.LONG,
    );

    const correctCount = questionAttempts.filter((a) => a.isCorrect).length;
    const total = questionSetAttempt.questionSet.questions.length;
    questionSetAttempt.isCompleted = true;
    questionSetAttempt.completedAt = new Date();
    questionSetAttempt.score = correctCount;
    questionSetAttempt.percentage =
      total > 0 ? (correctCount / total) * 100 : 0;
    questionSetAttempt.isChecked = hasManuallyCheckableQuestions ? false : true;

    await manager.getRepository(QuestionSetAttempt).save(questionSetAttempt);
  }

  async handleExpiredQuizzes() {
    const now = new Date();
    console.log('⏰ Running cron job at:', now.toISOString());
    const expiredAttempts = await this.dataSource.manager
      .getRepository(QuestionSetAttempt)
      .createQueryBuilder('questionSetAttempt')
      .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
      .where('questionSetAttempt.expiryAt <= :now', { now })
      .andWhere('questionSetAttempt.isCompleted = false')
      .andWhere('questionSet.isTimeLimited = true')
      .getMany();

    for (const attempt of expiredAttempts) {
      console.log(attempt.id);
      try {
        await this.completeQuiz(attempt.id);
        console.log(`Auto-completed expired quiz: ${attempt.id}`);
      } catch (error) {
        console.error(`Failed to auto-complete quiz ${attempt.id}:`, error);
      }
    }
  }
}
