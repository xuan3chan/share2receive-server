import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from 'src/mailer/mailer.service';

@Processor('send-email')
export class MailConsumer {
  constructor(private readonly mailerService: MailerService) {}
  @Process('send-email-notification')
  async sendEmail(job: Job<{ email: string; productName: string,approveStatus:string }>) {
    const { email, productName, approveStatus } = job.data;
    console.log('Sending email to', email);
    this.mailerService.sendEmailApprovedProduct(email,productName,approveStatus);
  }
}