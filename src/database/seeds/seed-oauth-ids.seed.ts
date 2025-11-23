import { DataSource } from 'typeorm';
import { UserOAuthId } from '../../modules/oauth/entities/user-oauth-id.entity';
import { User } from '../../modules/users/entities/user.entity';

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
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
