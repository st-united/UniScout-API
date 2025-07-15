import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private transporter: Mail;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<boolean>('MAIL_SECURE'),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
    this.logger.log('Nodemailer transporter initialized for MailService.');
  }

  async sendUserPassword(recipientEmail: string, password: string, recipientName: string): Promise<void> {
    const mailOptions: Mail.Options = {
      from: this.configService.get<string>('MAIL_FROM_ADDRESS'),
      to: recipientEmail,
      subject: 'Your New Account Password',
      html: `
        <p>Dear ${recipientName},</p>
        <p>Your new account has been created successfully. Here are your login details:</p>
        <p>Email: <strong>${recipientEmail}</strong></p>
        <p>Temporary Password: <strong>${password}</strong></p>
        <p>Please log in and change your password as soon as possible for security reasons.</p>
        <p>Best regards,</p>
        <p>The UNISCOUT Team</p>
      `,
      text: `
        Dear ${recipientName},

        Your new account has been created successfully. Here are your login details:

        Email: ${recipientEmail}
        Temporary Password: ${password}

        Please log in and change your password as soon as possible for security reasons.

        Best regards,
        The UNISCOUT Team
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password email sent successfully to ${recipientEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send password email to ${recipientEmail}: ${error.message}`, error.stack);
      throw new Error('Failed to send email.');
    }
  }
}
