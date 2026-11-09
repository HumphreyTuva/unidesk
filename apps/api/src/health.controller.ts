import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// Render pings this to know the service is alive.
@Controller('health')
export class HealthController {
  @SkipThrottle()
  @Get()
  ok() {
    return { ok: true };
  }
}
