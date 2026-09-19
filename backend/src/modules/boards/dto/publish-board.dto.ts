import { IsArray, IsString, MaxLength } from 'class-validator';

export class PublishBoardDto {
  @IsString()
  @MaxLength(255)
  postTitle!: string;

  @IsString()
  @MaxLength(20000)
  postDetails!: string;

  @IsArray()
  @IsString({ each: true })
  postTags!: string[];

  @IsArray()
  postMedia!: { name: string; type: string; url: string }[];
}
