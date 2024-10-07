import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      from: 'support@daiquangia.com',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendEmailWithCode(email: string, code: string): Promise<void> {
    const mailOptions = {
      to: email,
      subject: 'Share2Receive - Password Reset Instructions',
      html: `
      <body style="background-color: #f9f4eb; font-family: Arial, sans-serif; padding: 50px; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #388e3c; text-align: center; color: #fff; padding: 30px 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; font-family: 'Arial Black', Gadget, sans-serif;">
  <h1 style="text-transform: uppercase; margin: 0; font-size: 36px; letter-spacing: 3px;">Share2Receive</h1>
</div>
      <div style="padding: 20px; color: #333;">
        <h4 style="margin-bottom: 10px;">Dear user,</h4>
        <p style="margin-bottom: 10px; line-height: 1.6;">We received a request to reset your password for your Share2Receive account.</p>
        <p style="margin-bottom: 10px; line-height: 1.6;">Here is your password reset code:</p>
        <div style="margin-bottom: 20px; font-size: 46px; font-weight: bold; letter-spacing: 10px; color: #333; background-color: #f5f5f5; border: 2px solid #333; padding: 10px; border-radius: 5px; display: inline-block;">
          ${code}
        </div>
        <p style="margin-top: 5px; font-size: 14px; color: #999;">Please note this code is only valid for 5 minutes.</p>
        <p style="margin-bottom: 10px; line-height: 1.6;">If you did not request a password reset, please ignore this email or reply to let us know.</p>
        <p style="line-height: 1.6;">Thank you, Share2Receive Support Team</p>
      </div>
      <div style="margin-top: 30px; font-size: 14px; color: #555;">
        <p>Have questions or trouble logging in? Just reply to this email or contact <a href="mailto:support@share2receive.com" style="color: #7367f0; text-decoration: none;">support@share2receive.com</a>.</p>
      </div>
    </div>
  </body>`,
    };

    const info = await this.transporter.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId, code);
  }
  async sendEmailBlocked(email: string): Promise<void> {
    const mailOptions = {
      to: email,
      subject: 'Share2Receive - Your account has been blocked',
      html: `
    <body style="background-color: #f9f4eb; font-family: Arial, sans-serif; padding: 50px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #388e3c; text-align: center; color: #fff; padding: 30px 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; font-family: 'Arial Black', Gadget, sans-serif;">
          <h1 style="text-transform: uppercase; margin: 0; font-size: 36px; letter-spacing: 3px;">Share2Receive</h1>
        </div>
        <div style="padding: 20px; color: #333;">
          <h4 style="margin-bottom: 10px;">Dear user,</h4>
          <p style="margin-bottom: 10px; line-height: 1.6;">We regret to inform you that your account has been blocked due to suspicious activities.</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">If you believe this is an error, please contact our support team immediately.</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">Thank you, Share2Receive Support Team</p>
        </div>
        <div style="margin-top: 30px; font-size: 14px; color: #555;">
          <p>Have questions or trouble logging in? Just reply to this email or contact <a href="mailto:support@share2receive.com" style="color: #7367f0; text-decoration: none;">support@share2receive.com</a>.</p>
        </div>
      </div>
    </body>`,
    };

    const info = await this.transporter.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId);
  }
  async sendEmailBlockedProduct(
    email: string,
    productName: string,
  ): Promise<void> {
    const mailOptions = {
      to: email,
      subject: 'Share2Receive - Your product has been blocked',
      html: `
    <body style="background-color: #f9f4eb; font-family: Arial, sans-serif; padding: 50px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #388e3c; text-align: center; color: #fff; padding: 30px 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; font-family: 'Arial Black', Gadget, sans-serif;">
          <h1 style="text-transform: uppercase; margin: 0; font-size: 36px; letter-spacing: 3px;">Share2Receive</h1>
        </div>
        <div style="padding: 20px; color: #333;">
          <h4 style="margin-bottom: 10px;">Dear user,</h4>
          <p style="margin-bottom: 10px; line-height: 1.6;">We regret to inform you that your product <strong>${productName}</strong> has been blocked due to suspicious activities.</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">If you believe this is an error, please contact our support team immediately.</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">Thank you, Share2Receive Support Team</p>
        </div>
        <div style="margin-top: 30px; font-size: 14px; color: #555;">
          <p>Have questions or trouble logging in? Just reply to this email or contact <a href="mailto:support@share2receive.com" style="color: #7367f0; text-decoration: none;">support@share2receive.com</a>.</p>
        </div>
      </div>
    </body>
    `,
    };

    // Assuming you have a method to send the email
    const info = await this.transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  }
  async sendEmailUnblockedProduct(
    email: string,
    productName: string,
  ): Promise<void> {
    const mailOptions = {
      to: email,
      subject: 'Share2Receive - Your product has been unblocked',
      html: `
    <body style="background-color: #f9f4eb; font-family: Arial, sans-serif; padding: 50px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #388e3c; text-align: center; color: #fff; padding: 30px 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; font-family: 'Arial Black', Gadget, sans-serif;">
          <h1 style="text-transform: uppercase; margin: 0; font-size: 36px; letter-spacing: 3px;">Share2Receive</h1>
        </div>
        <div style="padding: 20px; color: #333;">
          <h4 style="margin-bottom: 10px;">Dear user,</h4>
          <p style="margin-bottom: 10px; line-height: 1.6;">We are pleased to inform you that your product <strong>${productName}</strong> has been unblocked.</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">Thank you for your cooperation.</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">Thank you, Share2Receive Support Team</p>
        </div>
        <div style="margin-top: 30px; font-size: 14px; color: #555;">
          <p>Have questions or trouble logging in? Just reply to this email or contact <a href="mailto:support@share2receive.com" style="color: #7367f0; text-decoration: none;">
          support@share2receive.com</a>.</p>
            </div>
                </div>
              </body>
              `,
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  }
}
