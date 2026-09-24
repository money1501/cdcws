import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  /** Full URL or data-URL of the avatar image. */
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000) // data-URLs can be large
  avatarUrl?: string;
}
