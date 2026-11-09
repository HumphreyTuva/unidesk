import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;

  // Give an email, a username, or both. The service checks that at least one is present.
  @IsOptional() @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(120) email?: string;

  @IsOptional()
  @Matches(/^[A-Za-z0-9_.]{3,20}$/, { message: 'Username must be 3-20 letters, numbers, dots or underscores' })
  username?: string;

  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(100) password: string;
}

export class LoginDto {
  // An email or a username (not case sensitive).
  @IsString() @MinLength(3) @MaxLength(120) identifier: string;
  @IsString() @MinLength(1) @MaxLength(100) password: string;
}

export class GoogleDto {
  @IsString() @MinLength(20) credential: string;
}
