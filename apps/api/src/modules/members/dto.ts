import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  generation?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  alias?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  deathDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsBoolean()
  isLiving!: boolean;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  generation?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  alias?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  deathDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isLiving?: boolean;
}

export class CreateRelationDto {
  @IsUUID()
  toMemberId!: string;

  @IsEnum(['parent_of', 'spouse_of'])
  type!: 'parent_of' | 'spouse_of';
}
