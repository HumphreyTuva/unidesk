import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ListPapersQuery {
  @IsOptional() @IsString() @MaxLength(60) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1990) @Max(2100) year?: number;
  @IsOptional() @IsString() @MaxLength(80) school?: string;
  @IsOptional() @IsString() @MaxLength(40) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) take?: number;
}

export class UploadPaperDto {
  @IsString() @MinLength(4) @MaxLength(14) unitCode: string;
  @IsString() @MinLength(3) @MaxLength(150) title: string;
  @Type(() => Number) @IsInt() @Min(1990) @Max(2100) year: number;
  @IsOptional() @IsString() @MaxLength(60) sitting?: string;
  @IsOptional() @IsString() @MaxLength(80) school?: string;
  @IsOptional() @IsString() @MaxLength(40) requestId?: string;
}

export class UpdatePaperDto {
  @IsOptional() @IsString() @MinLength(4) @MaxLength(14) unitCode?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(150) title?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1990) @Max(2100) year?: number;
  @IsOptional() @IsString() @MaxLength(60) sitting?: string;
  @IsOptional() @IsString() @MaxLength(80) school?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class AdminListQuery {
  @IsOptional() @IsString() @MaxLength(60) q?: string;
}

export class CreateRequestDto {
  @IsString() @MinLength(4) @MaxLength(14) unitCode: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class UpdateRequestDto {
  @IsIn(['OPEN', 'REJECTED']) status: 'OPEN' | 'REJECTED';
}
