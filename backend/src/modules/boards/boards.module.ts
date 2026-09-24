import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../../database/entities/board.entity';
import { BoardCollaborator } from '../../database/entities/board-collaborator.entity';
import { UserProfile } from '../../database/entities/user-profile.entity';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { BoardsGateway } from './boards.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Board, BoardCollaborator, UserProfile])],
  controllers: [BoardsController, CollaboratorsController],
  providers: [BoardsService, CollaboratorsService, BoardsGateway],
})
export class BoardsModule {}
