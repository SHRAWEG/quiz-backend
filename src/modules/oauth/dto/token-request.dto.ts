import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  REFRESH_TOKEN = 'refresh_token',
}

export class TokenRequestDto {
  @IsNotEmpty()
  @IsEnum(GrantType)
  grant_type: GrantType;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;

  @IsOptional()
  @IsString()
  code_verifier?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;
}
