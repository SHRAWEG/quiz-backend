import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export enum ResponseType {
  CODE = 'code',
}

export class AuthorizeRequestDto {
  @IsNotEmpty()
  @IsString()
  client_id: string;

  @IsNotEmpty()
  @IsEnum(ResponseType)
  response_type: ResponseType;

  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  redirect_uri: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  code_challenge?: string;

  @IsOptional()
  @IsString()
  code_challenge_method?: string;
}
