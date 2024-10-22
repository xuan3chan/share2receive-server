import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from 'src/mailer/mailer.service';

@Processor('send-email')
export class MailConsumer {
  constructor(private readonly mailerService: MailerService) {}
  @Process('send-email-notification')
  async sendEmail(job: Job<{ email: string; productName: string }>) {
    const { email,productName } = job.data;
    this.mailerService.sendEmailApprovedProduct(email,productName);
  }
}