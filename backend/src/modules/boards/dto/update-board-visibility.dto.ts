import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BoardVisibility } from '../../../database/entities/board.entity';

export class UpdateBoardVisibilityDto {
  @IsIn([BoardVisibility.PRIVATE, BoardVisibility.PUBLIC, BoardVisibility.PUBLISHED])
  visibility!: BoardVisibility;

  @IsOptional()
  @IsBoolean()
  anyoneCanEdit?: boolean;
}
