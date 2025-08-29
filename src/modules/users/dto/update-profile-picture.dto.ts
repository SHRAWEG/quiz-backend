import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfilePictureDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile picture image file',
  })
  profilePicture: Express.Multer.File;
}
