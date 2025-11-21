import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UserOAuthId } from '../../modules/oauth/entities/user-oauth-id.entity';
import { User } from '../../modules/users/entities/user.entity';

async function seedOAuthIds() {
  // Load environment variables
  void ConfigModule.forRoot();

  const configService = new ConfigService();
  const dataSource = new DataSource({
    type: 'postgres',
    host: configService.getOrThrow<string>('DB_HOST'),
    port: configService.getOrThrow<number>('DB_PORT'),
    username: configService.getOrThrow<string>('DB_USERNAME'),
    password: configService.getOrThrow<string>('DB_PASSWORD'),
    database: configService.getOrThrow<string>('DB_NAME'),
    entities: [User, UserOAuthId],
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

    for (const user of users) {
      const existingOAuthId = await oauthIdRepo.findOne({
        where: { userId: user.id },
      });

      if (!existingOAuthId) {
        const oauthId = oauthIdRepo.create({ userId: user.id });
        await oauthIdRepo.save(oauthId);
      }
    }

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
