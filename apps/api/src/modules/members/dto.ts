import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
  @IsBoolean()
  isLiving?: boolean;
}
