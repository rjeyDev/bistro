import { PartialType } from '@nestjs/swagger';
import { CreateModificatorDto } from './create-modificator.dto';

export class UpdateModificatorDto extends PartialType(CreateModificatorDto) {}
