import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV!: string;

  @IsNumberString()
  PORT!: string;

  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsNotEmpty()
  BETTER_AUTH_SECRET!: string;

  @IsNotEmpty()
  BETTER_AUTH_URL!: string;

  @IsNotEmpty()
  FRONTEND_URL!: string;

  GOOGLE_CLIENT_ID?: string;

  GOOGLE_CLIENT_SECRET?: string;

  RESEND_API_KEY?: string;

  RESEND_FROM_EMAIL?: string;

  EMAIL_FROM?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }

  return validatedConfig;
}
