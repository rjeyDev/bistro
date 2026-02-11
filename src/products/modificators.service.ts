import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Modificator } from './modificator.entity';
import { CreateModificatorDto } from './dto/create-modificator.dto';
import { UpdateModificatorDto } from './dto/update-modificator.dto';

@Injectable()
export class ModificatorsService {
  constructor(
    @InjectRepository(Modificator)
    private readonly modificatorRepository: Repository<Modificator>,
  ) {}

  async create(createModificatorDto: CreateModificatorDto): Promise<Modificator> {
    const modificator = this.modificatorRepository.create(createModificatorDto);
    return await this.modificatorRepository.save(modificator);
  }

  async findAll(): Promise<Modificator[]> {
    return await this.modificatorRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Modificator> {
    const modificator = await this.modificatorRepository.findOne({
      where: { id },
    });
    if (!modificator) {
      throw new NotFoundException(`Modificator with ID ${id} not found`);
    }
    return modificator;
  }

  async findByIds(ids: number[]): Promise<Modificator[]> {
    if (!ids?.length) return [];
    return await this.modificatorRepository.find({ where: { id: In(ids) } });
  }

  async update(id: number, updateModificatorDto: UpdateModificatorDto): Promise<Modificator> {
    const modificator = await this.findOne(id);
    Object.assign(modificator, updateModificatorDto);
    return await this.modificatorRepository.save(modificator);
  }

  async remove(id: number): Promise<void> {
    const modificator = await this.findOne(id);
    await this.modificatorRepository.softRemove(modificator);
  }
}
