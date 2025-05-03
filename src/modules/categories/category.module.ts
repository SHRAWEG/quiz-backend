import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSet } from '../question-sets/entities/question-set.entity';
import { UsersModule } from '../users/users.module';
import { CategoriesController } from './category.controller';
import { CategoriesService } from './category.service';
import { Category } from './entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, QuestionSet]), // Register the User repository in this module (if it's the right place)
    UsersModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
