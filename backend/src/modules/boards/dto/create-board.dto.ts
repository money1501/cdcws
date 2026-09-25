import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}
