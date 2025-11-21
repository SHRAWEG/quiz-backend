// time-expiry.processor.ts
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Worker } from 'bullmq';
import { QuestionAttempt } from 'src/modules/question-attempt/entities/question-attempt.entity';
import { QuestionSetAttempt } from 'src/modules/question-set-attempt/entities/question-set-attempt.entity';
import { Repository } from 'typeorm';
import { bullConfig } from '../bull.config';

@Injectable()
export class TimeExpiryProcessor implements OnModuleInit {
  private worker: Worker;
  constructor(
    @InjectRepository(QuestionSetAttempt)
    private questionSetAttemptsRepository: Repository<QuestionSetAttempt>,
    @InjectRepository(QuestionAttempt)
    private questionAttemptRepository: Repository<QuestionAttempt>,
  ) {}
  onModuleInit() {
    this.worker = new Worker(
      'question-set-timeout',
      async (job: Job<{ sessionId: string }>) => {
        const { sessionId } = job.data;

        try {
          const questionSetAttempt = await this.questionSetAttemptsRepository
            .createQueryBuilder('questionSetAttempt')
            .leftJoinAndSelect('questionSetAttempt.questionSet', 'questionSet')
            .leftJoinAndSelect('questionSet.questions', 'questions')
            .where('questionSetAttempt.id = :questionSetAttemptId', {
              sessionId,
            })
            .getOne();

          if (!questionSetAttempt || questionSetAttempt.isCompleted) {
            throw new BadRequestException({
              success: false,
              message: 'Quiz not found or already completed.',
              data: null,
            });
          }

          const attempts = await this.questionAttemptRepository
            .createQueryBuilder('questionAttempt')
            .where(
              'questionAttempt.questionSetAttemptId = :questionSetAttemptId',
              {
                sessionId,
              },
            )
            .getMany();

          const correctCount = attempts.filter((a) => a.isCorrect).length;
          // const total = attempts.length;
          const total = questionSetAttempt.questionSet.questions.length;

          questionSetAttempt.isCompleted = true;
          questionSetAttempt.completedAt = new Date();
          questionSetAttempt.score = correctCount;
          questionSetAttempt.percentage =
            total > 0 ? (correctCount / total) * 100 : 0;

          await this.questionSetAttemptsRepository.save(questionSetAttempt);
          console.error(`finishing quiz for session ${sessionId}`);
        } catch (error) {
          console.error(`Error finishing quiz for session ${sessionId}`, error);
        }
      },
      bullConfig,
    );
  }
}
