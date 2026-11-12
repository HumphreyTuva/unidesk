import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { JwtGuard } from './auth/guards';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { HealthController } from './health.controller';
import { PapersController } from './papers/papers.controller';
import { AdminPapersController } from './papers/admin-papers.controller';
import { PapersService } from './papers/papers.service';
import { StorageService } from './storage/storage.service';
import { SettingsService } from './settings/settings.service';
import { UniversityService } from './common/university.service';
import { MpesaService } from './payments/mpesa.service';
import { PaymentsService } from './payments/payments.service';
import { PaymentsController } from './payments/payments.controller';
import { AdminPaymentsController } from './payments/admin-payments.controller';
import { LinksController } from './links/links.controller';
import { CampusService } from './campus/campus.service';
import { CampusController, AdminCampusController } from './campus/campus.controller';
import { AiService } from './ai/ai.service';
import { AiController } from './ai/ai.controller';
import { ChatService } from './chat/chat.service';
import { ChatController, AdminChatController } from './chat/chat.controller';
import { VenuesService } from './venues/venues.service';
import { VenuesController, AdminVenuesController } from './venues/venues.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { TimetableService } from './timetable/timetable.service';
import { TimetableController, AdminTimetableController } from './timetable/timetable.controller';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
    // Default limit for every route; sign-in and sign-up have stricter limits of their own.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [AuthController, HealthController, PapersController, AdminPapersController, PaymentsController, AdminPaymentsController, LinksController, TimetableController, AdminTimetableController, VenuesController, AdminVenuesController, ChatController, AdminChatController, AiController, CampusController, AdminCampusController, AdminUsersController],
  providers: [
    PrismaService, AuthService, PapersService, StorageService, SettingsService, UniversityService, MpesaService, PaymentsService, TimetableService, VenuesService, ChatService, AiService, CampusService, JwtGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [PrismaService, StorageService, SettingsService, UniversityService],
})
export class AppModule {}
