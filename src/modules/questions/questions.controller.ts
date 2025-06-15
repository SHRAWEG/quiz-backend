import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { QuestionStatus } from 'src/common/enums/question.enum';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class QuestionsController {
  constructor(private readonly questionService: QuestionsService) {}
  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  addQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Term to search for subjects',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Statuss to filter subjects',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: String,
    description: 'Subject Id to filter subjects',
  })
  @ApiQuery({
    name: 'subSubjectId',
    required: false,
    type: String,
    description: 'Sub Subject Id to filter sub-subjects',
  })
  get(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: QuestionStatus,
    @Query('subjectId') subjectId?: string,
    @Query('subSubjectId') subSubjectId?: string,
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.questionService.get(
      pageNumber,
      limitNumber,
      search,
      status,
      subjectId,
      subSubjectId,
    );
  }

  @Get('search')
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
  })
  @ApiQuery({
    name: 'subSubjectId',
    required: false,
  })
  search(
    @Query('search') search: string = '',
    @Query('subjectId') subjectId: string = '',
    @Query('subSubjectId') subSubjectId: string = '',
  ) {
    return this.questionService.search(search, subjectId, subSubjectId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  findOne(@Param('id') id: string) {
    return this.questionService.getById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  @Patch('approve/:id')
  @ApiBearerAuth()
  updateStatus(@Param('id') id: string) {
    return this.questionService.approveQuestion(id);
  }

  @Patch('reject/:id')
  @ApiBearerAuth()
  rejectStatus(@Param('id') id: string) {
    return this.questionService.rejectQuestion(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  delete(@Param('id') id: string) {
    return this.questionService.delete(id);
  }

  // BULK UPLOAD
  @Post('/upload-csv')
  // @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      // Optional: Add file size limits, file type validation here
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv)$/)) {
          return cb(
            new BadRequestException('Only CSV files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a CSV file containing questions' })
  @ApiConsumes('multipart/form-data') // Important: Specifies the content type for file uploads
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // Tells Swagger that this is a file upload
          description: 'CSV file containing question data',
        },
      },
    },
  })
  uploadQuestionCsv(@UploadedFile() file: Express.Multer.File) {
    // **Recommended: Explicitly check if the file exists**
    if (!file) {
      throw new BadRequestException('No CSV file uploaded.');
    } else {
      const csvBuffer: Buffer = file.buffer;
      return this.questionService.bulkUploadQuestions(csvBuffer);
    }
  }
}
