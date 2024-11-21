import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
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

  async sendEmailApprovedProduct(
    email: string,
    productName: string,
    approveStatus: string,
  ): Promise<void> {
    // Xác định nội dung và màu sắc tiêu đề dựa trên trạng thái phê duyệt
    const isApproved = approveStatus === 'approved';
    const subject = `Share2Receive - Your product has been ${isApproved ? 'approved' : 'rejected'}`;
    const statusColor = isApproved ? '#388e3c' : '#d32f2f';
    const statusMessage = isApproved
      ? `We are pleased to inform you that your product <strong>${productName}</strong> has been approved.`
      : `We regret to inform you that your product <strong>${productName}</strong> has been rejected.`;
    const additionalMessage = isApproved
      ? `Thank you for your cooperation.`
      : `For more information, please contact our support team.`;

    // Cấu hình nội dung email
    const emailBody = `
      <body style="background-color: #f9f4eb; font-family: Arial, sans-serif; padding: 50px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
          <div style="background-color: ${statusColor}; text-align: center; color: #fff; padding: 30px 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; font-family: 'Arial Black', Gadget, sans-serif;">
            <h1 style="text-transform: uppercase; margin: 0; font-size: 36px; letter-spacing: 3px;">Share2Receive</h1>
          </div>
          <div style="padding: 20px; color: #333;">
            <h4 style="margin-bottom: 10px;">Dear user,</h4>
            <p style="margin-bottom: 10px; line-height: 1.6;">${statusMessage}</p>
            <p style="margin-bottom: 10px; line-height: 1.6;">${additionalMessage}</p>
            <p style="margin-bottom: 10px; line-height: 1.6;">Best regards, Share2Receive Support Team</p>
          </div>
          <div style="margin-top: 30px; font-size: 14px; color: #555;">
            <p>Have questions or trouble logging in? Just reply to this email or contact <a href="mailto:support@share2receive.com" style="color: #7367f0; text-decoration: none;">support@share2receive.com</a>.</p>
          </div>
        </div>
      </body>
    `;

    // Cấu hình và gửi email
    const mailOptions = {
      to: email,
      from: 'support@share2receive.com',
      subject,
      html: emailBody,
    };

    // Gửi email và log thông tin
    const info = await this.transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  }
  //viet ham mail có đơn hàng mới
  async sendEmailNewOrder(
    email: string,
    orderId: string,
    orderInfo: string,
  ): Promise<void> {
    const mailOptions = {
      to: email,
      subject: 'Share2Receive - New Order Confirmation',
      html: `
    <body style="background-color: #f9f4eb; font-family: Arial, sans-serif; padding: 50px; text-align: center;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #388e3c; text-align: center; color: #fff; padding: 30px 20px; border-top-left-radius: 10px; border-top-right-radius: 10px; font-family: 'Arial Black', Gadget, sans-serif;">
          <h1 style="text-transform: uppercase; margin: 0; font-size: 36px; letter-spacing: 3px;">Share2Receive</h1>
        </div>
        <div style="padding: 20px; color: #333;">
          <h4 style="margin-bottom: 10px;">Dear user,</h4>
          <p style="margin-bottom: 10px; line-height: 1.6;">We have received your order <strong>${orderId}</strong> with the following details:</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">${orderInfo}</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">Thank you for shopping with us!</p>
          <p style="margin-bottom: 10px; line-height: 1.6;">Share2Receive Support Team</p>
        </div>
        <div style="margin-top: 30px; font-size: 14px; color: #555;">
                  <p>Have questions or trouble with your order? Just reply to this email or contact <a href="mailto:support@share2receive.com" style="color: #7367f0; text-decoration: none;">support@share2receive.com</a>.</p>
                </div>
              </div>
            </body>
            `,
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  }
}
