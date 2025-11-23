import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
// Categories
import { Category } from '../../modules/categories/entities/category.entity';
// Credit
import { CreditPurchase } from '../../modules/credit/entities/credit-purchase.entity';
import { CreditTransaction } from '../../modules/credit/entities/credit-transaction.entity';
import { UserCredit } from '../../modules/credit/entities/user-credit.entity';
// Feedbacks
import { Feedback } from '../../modules/feedbacks/entities/feedback.entity';
// Notices
import { Notice } from '../../modules/notices/entities/notice.entity';
// OAuth
import { OAuthAuthorizationCode } from '../../modules/oauth/entities/oauth-authorization-code.entity';
import { OAuthClient } from '../../modules/oauth/entities/oauth-client.entity';
import { UserOAuthId } from '../../modules/oauth/entities/user-oauth-id.entity';
// Options
import { Option } from '../../modules/options/entities/option.entity';
// Question Attempt
import { QuestionAttempt } from '../../modules/question-attempt/entities/question-attempt.entity';
// Question Sets
import { QuestionSetAttempt } from '../../modules/question-set-attempt/entities/question-set-attempt.entity';
import { QuestionSetPurchase } from '../../modules/question-sets/entities/question-set-purchase.entity';
import { QuestionSet } from '../../modules/question-sets/entities/question-set.entity';
// Question Stats
import { QuestionStats } from '../../modules/question-stats/entities/question-stat.entity';
// Questions
import { Question } from '../../modules/questions/entities/question.entity';
// Subjects
import { SubSubject } from '../../modules/sub-subjects/entities/sub-subject.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
// Subscription Plans
import { SubscriptionPlan } from '../../modules/subscription-plans/entities/subscription-plan.entity';
// User Subscriptions
import { UserSubscription } from '../../modules/user-subscriptions/entities/user-subscription.entity';
// Users
import { PasswordResetToken } from '../../modules/users/entities/password-reset-token.entity';
import { User } from '../../modules/users/entities/user.entity';
import { VerificationToken } from '../../modules/users/entities/verification-token.entity';

// Load environment variables from .env file
dotenv.config();

async function seedOAuthIds() {
  // Ensure required environment variables are set
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
  ];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const dataSource = new DataSource({
    type: 'postgres',
    namingStrategy: new SnakeNamingStrategy(),
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      // Categories
      Category,
      // Credit
      CreditPurchase,
      CreditTransaction,
      UserCredit,
      // Feedbacks
      Feedback,
      // Notices
      Notice,
      // OAuth
      OAuthAuthorizationCode,
      OAuthClient,
      UserOAuthId,
      // Options
      Option,
      // Question Attempt
      QuestionAttempt,
      // Question Sets
      QuestionSet,
      QuestionSetAttempt,
      QuestionSetPurchase,
      // Question Stats
      QuestionStats,
      // Questions
      Question,
      // Subjects
      Subject,
      SubSubject,
      // Subscription Plans
      SubscriptionPlan,
      // User Subscriptions
      UserSubscription,
      // Users
      PasswordResetToken,
      User,
      VerificationToken,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();

    const userRepo = dataSource.getRepository(User);
    const oauthIdRepo = dataSource.getRepository(UserOAuthId);

    // Get all users
    const users = await userRepo.find({
      select: ['id', 'email'],
    });

    console.log(`Found ${users.length} users. Seeding OAuth IDs...`);

    let created = 0;
    let existing = 0;

    for (const user of users) {
      const existingOAuthId = await oauthIdRepo.findOne({
        where: { userId: user.id },
      });

      if (!existingOAuthId) {
        const oauthId = oauthIdRepo.create({ userId: user.id });
        await oauthIdRepo.save(oauthId);
        created++;
      } else {
        existing++;
      }
    }

    console.log(
      `OAuth IDs seeded successfully: ${created} created, ${existing} existing, ${users.length} total users`,
    );

    await dataSource.destroy();

    process.exit(0);
  } catch (error) {
    console.error('Error seeding OAuth IDs:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run the seed
void seedOAuthIds();
