import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    // Check if email credentials are available
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!emailUser || !emailPass) {
      console.log('⚠️ Email credentials not configured. Email service will run in mock mode.');
      // Create a mock transporter that doesn't actually send emails
      this.transporter = {
        sendMail: async (options) => {
          console.log('📧 Mock Email Service - Would send email to:', options.to);
          console.log('📝 Subject:', options.subject);
          return { messageId: 'mock-' + Date.now() };
        }
      } as any;
    } else {
      // Configure real email transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    }

    // Log configuration for debugging (without showing password)
    console.log('📧 Email Configuration:');
    console.log('Host:', process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('Port:', process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
    console.log('User:', process.env.EMAIL_USER || process.env.SMTP_USER || 'Not configured');
    console.log('Auth configured:', !!(process.env.EMAIL_USER || process.env.SMTP_USER) && !!(process.env.EMAIL_PASS || process.env.SMTP_PASS));
  }

  private isEmailConfigured(): boolean {
    const hasUser = !!(process.env.EMAIL_USER || process.env.SMTP_USER);
    const hasPass = !!(process.env.EMAIL_PASS || process.env.SMTP_PASS);
    return hasUser && hasPass;
  }

  async sendSignupLink(email: string, name: string, signupToken: string) {
    if (!this.isEmailConfigured()) {
      console.log('⚠️ Email not configured - skipping signup link email to:', email);
      return { message: 'Email service not configured' };
    }

    try {
      const signupUrl = `${process.env.FRONTEND_URL || 'https://stuart05frontend.mtscorporate.com'}/complete-signup?token=${signupToken}`;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
        to: email,
        subject: '💕 Complete Your "Scan Me Maybe" App Signup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome ${name}! 💕</h2>
          <p>You're one step away from joining the QR Card Dating community!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>Next Steps:</h3>
            <ol>
              <li>Click the link below to complete your signup</li>
              <li>Choose your plan and make payment ($69 setup fee)</li>
              <li>Create your amazing profile</li>
              <li>Get your 50 physical QR cards delivered!</li>
            </ol>
          </div>
          
          <a href="${signupUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Complete Signup →
          </a>
          
          <p><small>This link expires in 24 hours. If you didn't request this, please ignore this email.</small></p>
        </div>
      `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Signup link email sent successfully to:', email);
      return result;
    } catch (error) {
      console.error('❌ Failed to send signup link email to:', email, error.message);
      throw new Error(`Failed to send signup link email: ${error.message}`);
    }
  }

  async sendOrderConfirmation(email: string, name: string, orderId: string, deliveryETA: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: email,
      subject: '🎉 Payment Successful!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Confirmed! 🎉</h2>
          <p>Hi ${name},</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #28a745;">
            <h3>✅ Order Confirmed</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Estimated Delivery:</strong> ${deliveryETA}</p>
            <p><strong>Items:</strong> 50 Custom QR Dating Cards</p>
          </div>
          
          <h3>What happens next?</h3>
          <ol>
            <li><strong>Create your profile</strong> - Upload photos and write your bio</li>
            <li><strong>Admin review</strong> - We'll approve your profile (usually within 24 hours)</li>
            <li><strong>Card generation</strong> - Your 50 unique QR codes will be created</li>
            <li><strong>Printing & shipping</strong> - Physical cards printed and shipped to you</li>
          </ol>
          
          <p>Start creating your profile now to speed up the process!</p>
          
          <a href="${process.env.FRONTEND_URL || 'https://stuart05frontend.mtscorporate.com'}/profile" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Create Profile →
          </a>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendApprovalEmail(email: string, name: string, trackingNumber: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: email,
      subject: '🎊 Profile Approved! Your Cards Are Being Printed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Congratulations ${name}! 🎊</h2>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #28a745;">
            <h3>✅ Profile Approved!</h3>
            <p>Your profile has been reviewed and approved by our team. Your 50 QR cards are now being printed and will be shipped soon!</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>📦 Shipping Details</h3>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            <p><strong>Status:</strong> Printing & Packaging</p>
            <p><strong>Expected Delivery:</strong> 3-5 business days</p>
          </div>
          
          <h3>Your cards include:</h3>
          <ul>
            <li>50 unique QR codes linked to your profile</li>
            <li>Each card can be scanned 5 times</li>
            <li>High-quality printing on premium card stock</li>
            <li>Scanners will see your photos, bio, and contact info</li>
          </ul>
          
          <p>Get ready to start meeting amazing people! 💕</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendRejectionEmail(email: string, name: string, reason: string, editLink: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: email,
      subject: '📝 Profile Update Needed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Profile Review Update</h2>
          <p>Hi ${name},</p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #ffc107;">
            <h3>📝 Profile Needs Updates</h3>
            <p>We've reviewed your profile and need you to make a few adjustments before we can approve it:</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <strong>Feedback:</strong><br>
              ${reason}
            </div>
          </div>
          
          <p>Don't worry - this is common! Just make the requested changes and resubmit.</p>
          
          <a href="${editLink}/checkout/setup-profile/edit/${email}"  style="background: #ffc107; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Edit Profile →
          </a>
          
          <p>Need help? Reply to this email and our team will assist you!</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, name: string) {
    if (!this.isEmailConfigured()) {
      console.log('⚠️ Email not configured - skipping welcome email to:', email);
      return { message: 'Email service not configured' };
    }

    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'https://stuart05frontend.mtscorporate.com'}/checkout/${email}`;
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
        to: email,
        subject: '🎉 Welcome to "Scan Me Maybe"!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎉 Welcome ${name}!</h2>
          <p>Congratulations! Your application has been approved and you're now part of the QR Card Dating community!</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #28a745;">
            <h3>✅ You're Approved!</h3>
            <p>Our team has reviewed your application and we're excited to have you join our community of singles looking for meaningful connections.</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>What's Next?</h3>
            <ol>
              <li>Access your dashboard to complete your profile</li>
              <li>Upload your photos and write your bio</li>
              <li>Pay the one-time setup fee ($69)</li>
              <li>Receive your 50 physical QR cards by mail</li>
            </ol>
          </div>
          
          <a href="${loginUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Payment Link →
          </a>
          
          <p>Welcome to your QR dating journey! 💕</p>
        </div>
      `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully to:', email);
      return result;
    } catch (error) {
      console.error('❌ Failed to send welcome email to:', email, error.message);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  async sendUserRejectionEmail(email: string, name: string, reason: string) {
    if (!this.isEmailConfigured()) {
      console.log('⚠️ Email not configured - skipping rejection email to:', email);
      return { message: 'Email service not configured' };
    }

    try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: email,
      subject: '📝 Application Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Application Update</h2>
          <p>Hi ${name},</p>
          
          <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #dc3545;">
            <h3>Application Status</h3>
            <p>Thank you for your interest in QR Card Dating. After reviewing your application, we're unable to approve it at this time.</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <strong>Reason:</strong><br>
              ${reason}
            </div>
          </div>
          
          <p>We appreciate your interest and wish you the best in your dating journey.</p>
          
          <p>If you have questions about this decision, please reply to this email.</p>
        </div>
      `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Rejection email sent successfully to:', email);
      return result;
    } catch (error) {
      console.error('❌ Failed to send rejection email to:', email, error.message);
      throw new Error(`Failed to send rejection email: ${error.message}`);
    }
  }

  async sendQRCodeScanned(email: string, name: string, scanDetails: {
    scanDate: string;
    scanLocation: string;
    scansRemaining: number;
    scannerEmail: string;
  }) {
    try {
      const scanDate = new Date(scanDetails.scanDate).toLocaleString();
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@qrdatingapp.com',
        to: email,
        subject: '🔍 Your QR Card Was Scanned!',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
          <h2 style="color: #e91e63;">QR Card Scan Notification</h2>
          
          <p>Hi ${name},</p>
          
          <p>Great news! Someone just scanned your QR card and viewed your profile.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">Scan Details:</h3>
            <ul>
              <li><strong>Date & Time:</strong> ${scanDate}</li>
              <li><strong>Location:</strong> ${scanDetails.scanLocation}</li>
              <li><strong>Scanner:</strong> ${scanDetails.scannerEmail}</li>
              <li><strong>Remaining Scans:</strong> ${scanDetails.scansRemaining}</li>
            </ul>
          </div>
          
          ${scanDetails.scansRemaining <= 2 ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ Low Scan Count:</strong> You have ${scanDetails.scansRemaining} scans remaining on this card.</p>
          </div>
          ` : ''}
          
          <p>If the scanner provided their email, they'll receive your contact information to potentially connect with you!</p>
          
          <p>Keep networking and making great connections! 💕</p>
        </div>
      `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 QR scan notification sent successfully to:', email);
      return result;
    } catch (error) {
      console.error('❌ Failed to send QR scan notification to:', email, error.message);
      throw new Error(`Failed to send QR scan notification: ${error.message}`);
    }
  }

  async sendProfileInfo(scannerEmail: string, profileOwnerName: string, profileInfo: {
    name: string;
    age: number;
    bio: string;
    location: string;
    contactEmail: string;
  }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@qrdatingapp.com',
        to: scannerEmail,
        subject: `📋 Profile Information for ${profileInfo.name}`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
          <h2 style="color: #e91e63;">QR Card Profile Information</h2>
          
          <p>Hi there!</p>
          
          <p>You just scanned a QR card and here's the profile information:</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">${profileInfo.name}</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin: 8px 0;"><strong>Age:</strong> ${profileInfo.age}</li>
              <li style="margin: 8px 0;"><strong>Location:</strong> ${profileInfo.location}</li>
              <li style="margin: 8px 0;"><strong>Bio:</strong> ${profileInfo.bio}</li>
            </ul>
          </div>
          
          <div style="background-color: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="color: #2e7d32; margin-top: 0;">💌 Want to Connect?</h4>
            <p style="margin: 5px 0;">You can reach out to ${profileInfo.name} at:</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${profileInfo.contactEmail}" style="color: #e91e63;">${profileInfo.contactEmail}</a></p>
          </div>
          
          <p>Good luck with your connection! 💕</p>
          
          <p><small>This information was shared because ${profileInfo.name} chose to use QR cards for networking and meeting new people.</small></p>
        </div>
      `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Profile info sent successfully to scanner:', scannerEmail);
      return result;
    } catch (error) {
      console.error('❌ Failed to send profile info to scanner:', scannerEmail, error.message);
      throw new Error(`Failed to send profile info: ${error.message}`);
    }
  }

  // ========================
  // Customizable Email Template Management
  // ========================

  async initializeCustomizableTemplates() {
    const defaultTemplates = [
      {
        name: 'registration_approved',
        subject: '🎉 Welcome to QR Dating App - Registration Approved!',
        body: 'Congratulations! Your registration has been approved. You can now create your profile and start connecting with other members.',
        htmlTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f0f8ff; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #4CAF50; margin-bottom: 30px; }
        .header h1 { color: #4CAF50; font-size: 28px; margin: 0; font-weight: bold; }
        .content { font-size: 16px; line-height: 1.8; color: #333333; }
        .highlight-box { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; }
        .highlight-box h2 { margin: 0 0 10px 0; font-size: 22px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #45a049; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 QR Dating App</h1>
        </div>
        <div class="content">
            <div class="highlight-box">
                <h2>Welcome {{userName}}!</h2>
                <p>Your registration has been approved!</p>
            </div>
            <p>{{body}}</p>
            <p>We're excited to have you join our community of singles looking for meaningful connections through QR card dating!</p>
        </div>
        <div class="footer">
            <p>© {{currentYear}} QR Dating App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
      },
      {
        name: 'registration_rejected',
        subject: '❌ QR Dating App - Registration Update',
        body: 'We regret to inform you that your registration has been rejected. Please review our terms and conditions and feel free to reapply.',
        htmlTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #fff5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #f44336; margin-bottom: 30px; }
        .header h1 { color: #f44336; font-size: 28px; margin: 0; font-weight: bold; }
        .content { font-size: 16px; line-height: 1.8; color: #333333; }
        .highlight-box { background: linear-gradient(135deg, #f44336, #d32f2f); color: white; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; }
        .highlight-box h2 { margin: 0 0 10px 0; font-size: 22px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 QR Dating App</h1>
        </div>
        <div class="content">
            <div class="highlight-box">
                <h2>Hello {{userName}}</h2>
                <p>Registration Update</p>
            </div>
            <p>{{body}}</p>
            <div class="info-box">
                <p><strong>Reason:</strong> {{rejectionReason}}</p>
            </div>
            <p>Thank you for your interest in our platform. If you have any questions, please feel free to contact our support team.</p>
        </div>
        <div class="footer">
            <p>© {{currentYear}} QR Dating App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
      },
      {
        name: 'profile_approved',
        subject: '✅ Profile Approved - You\'re Ready to Connect!',
        body: 'Great news! Your profile has been approved and is now live. You can start generating QR cards and connecting with other members.',
        htmlTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px; }
        .header { text-align: center; padding: 20px 0; margin-bottom: 30px; }
        .header h1 { color: #667eea; font-size: 32px; margin: 0; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
        .content { font-size: 16px; line-height: 1.8; color: #333333; }
        .success-box { background: linear-gradient(135deg, #56ab2f, #a8e6cf); color: white; padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; box-shadow: 0 8px 25px rgba(86, 171, 47, 0.3); }
        .success-box h2 { margin: 0 0 15px 0; font-size: 24px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #667eea; font-size: 12px; color: #666; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 25px 0; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3); transition: transform 0.3s ease; }
        .cta-button:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✨ QR Dating App</h1>
        </div>
        <div class="content">
            <div class="success-box">
                <h2>🎉 Congratulations {{userName}}!</h2>
                <p>Your profile is now approved and live!</p>
            </div>
            <p>{{body}}</p>
            <p>Your journey to meaningful connections starts now. Create QR cards and start meeting amazing people!</p>
            <div style="text-align: center;">
                <a href="{{dashboardUrl}}" class="cta-button">Generate QR Cards →</a>
            </div>
        </div>
        <div class="footer">
            <p>© {{currentYear}} QR Dating App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
      },
      {
        name: 'profile_rejected',
        subject: '📝 Profile Review - Updates Required',
        body: 'Your profile needs some updates before it can be approved. Please review the feedback below and resubmit your profile.',
        htmlTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 20px; }
        .header { text-align: center; padding: 20px 0; margin-bottom: 30px; }
        .header h1 { color: #e17055; font-size: 32px; margin: 0; font-weight: bold; }
        .content { font-size: 16px; line-height: 1.8; color: #333333; }
        .review-box { background: linear-gradient(135deg, #fdcb6e, #e17055); color: white; padding: 30px; border-radius: 12px; margin: 25px 0; box-shadow: 0 8px 25px rgba(225, 112, 85, 0.3); }
        .review-box h2 { margin: 0 0 15px 0; font-size: 24px; text-align: center; }
        .feedback-box { background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid white; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e17055; font-size: 12px; color: #666; }
        .edit-button { display: inline-block; background: linear-gradient(135deg, #00b894, #00cec9); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 25px 0; box-shadow: 0 8px 25px rgba(0, 184, 148, 0.3); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 QR Dating App</h1>
        </div>
        <div class="content">
            <div class="review-box">
                <h2>Profile Review for {{userName}}</h2>
                <p>{{body}}</p>
                <div class="feedback-box">
                    <strong>Feedback:</strong><br>
                    {{rejectionReason}}
                </div>
            </div>
            <p>Don't worry! These updates will help make your profile even better. Just make the requested changes and resubmit.</p>
            <div style="text-align: center;">
                <a href="{{editProfileUrl}}" class="edit-button">Edit Profile →</a>
            </div>
        </div>
        <div class="footer">
            <p>© {{currentYear}} QR Dating App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
      }
    ];

    for (const template of defaultTemplates) {
      try {
        // Try to insert, if it exists, skip
        await this.prisma.$queryRaw`
          INSERT INTO email_templates (name, subject, body, html_template, is_active, created_at, updated_at)
          VALUES (${template.name}, ${template.subject}, ${template.body}, ${template.htmlTemplate}, true, NOW(), NOW())
          ON CONFLICT (name) DO NOTHING
        `;
      } catch (error) {
        console.log(`Template ${template.name} already exists or error:`, error.message);
      }
    }

    console.log('✅ Customizable HTML email templates initialized');
    return { message: 'Customizable HTML email templates initialized successfully', count: defaultTemplates.length };
  }

  async getCustomizableTemplate(name: string) {
    const result = await this.prisma.$queryRaw`
      SELECT * FROM email_templates WHERE name = ${name}
    `;
    return (result as any[])[0] || null;
  }

  async updateCustomizableTemplate(name: string, subject: string, body: string, htmlTemplate?: string) {
    if (htmlTemplate) {
      await this.prisma.$queryRaw`
        UPDATE email_templates 
        SET subject = ${subject}, body = ${body}, html_template = ${htmlTemplate}, updated_at = NOW()
        WHERE name = ${name}
      `;
    } else {
      await this.prisma.$queryRaw`
        UPDATE email_templates 
        SET subject = ${subject}, body = ${body}, updated_at = NOW()
        WHERE name = ${name}
      `;
    }
    return this.getCustomizableTemplate(name);
  }

  async sendCustomizableEmail(templateName: string, to: string, variables: Record<string, any>) {
    try {
      const template = await this.getCustomizableTemplate(templateName);
      if (!template || !template.is_active) {
        throw new Error(`Template '${templateName}' not found or inactive`);
      }

      // Add default variables if not provided
      const defaultVariables = {
        currentYear: new Date().getFullYear().toString(),
        appName: 'QR Dating App',
        ...variables
      };

      // Replace variables in subject, body, and HTML template
      let finalSubject = template.subject;
      let finalBody = template.body;
      let finalHtml = template.html_template || template.htmlTemplate || '';
      
      Object.entries(defaultVariables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        finalSubject = finalSubject.replace(regex, String(value));
        finalBody = finalBody.replace(regex, String(value));
        finalHtml = finalHtml.replace(regex, String(value));
      });

      // Fallback to simple HTML if no custom template
      if (!finalHtml) {
        finalHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">QR Dating App</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">${finalBody}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
              © QR Dating App ${new Date().getFullYear()}. All rights reserved.
            </p>
          </div>
        </div>`;
      }

      const mailOptions = {
        from: `"QR Dating App" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to,
        subject: finalSubject,
        text: finalBody, // Plain text fallback
        html: finalHtml, // Full customizable HTML template
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Customizable email sent: ${templateName} to ${to}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send customizable email: ${templateName}`, error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}