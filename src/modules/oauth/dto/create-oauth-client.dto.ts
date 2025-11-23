import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateOAuthClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  redirectUris: string[];
}
