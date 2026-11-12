import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// UniDesk serves one university for now. When a second one is added, this is the single place that decides which one a request is for.
@Injectable()
export class UniversityService {
  private cached?: string;
  constructor(private db: PrismaService) {}

  async defaultId(): Promise<string> {
    if (this.cached) return this.cached;
    const u = await this.db.university.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!u) throw new Error('No university in the database. Run: npm run db:seed');
    this.cached = u.id;
    return u.id;
  }
}
