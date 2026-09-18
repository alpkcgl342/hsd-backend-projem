import { PartialType } from '@nestjs/mapped-types';
import { CreateEventPhotoDto } from './create-event-photo.dto';

export class UpdateEventPhotoDto extends PartialType(CreateEventPhotoDto) {}
