import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('APP_URL')}/verify-email?token=${token}`;

    await (this.transporter as nodemailer.Transporter).sendMail({
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    } as nodemailer.SendMailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('APP_URL')}/reset-password?token=${token}`;

    await (this.transporter as nodemailer.Transporter).sendMail({
      from: this.configService.get('MAIL_FROM'),
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You have requested to reset your password. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you did not request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
      `,
    } as nodemailer.SendMailOptions);
  }
}
