import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from 'src/mailer/mailer.service';

@Processor('send-email')
export class MailConsumer {
  constructor(private readonly mailerService: MailerService) {}
  @Process('send-email-code')
  async sendEmail(job: Job<{ email: string; authCode: string }>) {
    const { email,authCode } = job.data;
    this.mailerService.sendEmailWithCode(email,authCode);
  }
}