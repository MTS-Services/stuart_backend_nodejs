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
        customizableText: 'Congratulations! Your registration has been approved. You can now create your profile and start connecting with other members.',
        staticTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Registration Approved!</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Hello {{userName}}!</h2>
              <div style="background-color: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">{{customizableText}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{appUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Start Your Journey</a>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                Welcome to the QR Dating App community!<br>
                <strong>Date:</strong> {{currentDate}}
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'registration_rejected',
        subject: '❌ QR Dating App - Registration Update',
        customizableText: 'We regret to inform you that your registration has been rejected. Please review our terms and conditions and feel free to reapply.',
        staticTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Registration Update</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Hello {{userName}},</h2>
              <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">{{customizableText}}</p>
              </div>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;"><strong>Reason:</strong> {{rejectionReason}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{supportUrl}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Contact Support</a>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                Thank you for your interest in QR Dating App<br>
                <strong>Date:</strong> {{currentDate}}
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'profile_approved',
        subject: '✅ Profile Approved - You\'re Ready to Connect!',
        customizableText: 'Great news! Your profile has been approved and is now live. You can start generating QR cards and connecting with other members.',
        staticTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✅ Profile Approved!</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Congratulations {{userName}}!</h2>
              <div style="background-color: #e8f5e8; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">{{customizableText}}</p>
              </div>
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">🚀 What's Next?</h3>
                <ul style="color: #555; line-height: 1.8;">
                  <li>Generate your QR cards</li>
                  <li>Share your QR code with potential matches</li>
                  <li>Start making meaningful connections</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{profileUrl}}" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View Your Profile</a>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                Happy connecting! 💕<br>
                <strong>Approved on:</strong> {{currentDate}}
              </p>
            </div>
          </div>
        `
      },
      {
        name: 'profile_rejected',
        subject: '📝 Profile Review - Updates Required',
        customizableText: 'Your profile needs some updates before it can be approved. Please review the feedback below and resubmit your profile.',
        staticTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📝 Profile Review</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Hello {{userName}},</h2>
              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333;">{{customizableText}}</p>
              </div>
              <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #d32f2f;">Feedback:</h4>
                <p style="margin: 0; font-size: 14px; color: #666;">{{rejectionReason}}</p>
              </div>
              <div style="background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">💡 Tips for Approval:</h3>
                <ul style="color: #555; line-height: 1.8;">
                  <li>Use clear, recent photos</li>
                  <li>Write a genuine, interesting bio</li>
                  <li>Fill out all required fields</li>
                  <li>Follow community guidelines</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{editProfileUrl}}" style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Update Profile</a>
              </div>
              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                We're here to help you succeed! 🌟<br>
                <strong>Reviewed on:</strong> {{currentDate}}
              </p>
            </div>
          </div>
        `
      }
    ];

    for (const template of defaultTemplates) {
      try {
        // Try to insert, if it exists, skip
        await this.prisma.$queryRaw`
          INSERT INTO email_templates (name, subject, customizable_text, static_template, is_active, created_at, updated_at)
          VALUES (${template.name}, ${template.subject}, ${template.customizableText}, ${template.staticTemplate}, true, NOW(), NOW())
          ON CONFLICT (name) DO NOTHING
        `;
      } catch (error) {
        console.log(`Template ${template.name} already exists or error:`, error.message);
      }
    }

    console.log('✅ Customizable email templates initialized');
    return { message: 'Customizable email templates initialized successfully', count: defaultTemplates.length };
  }

  async getCustomizableTemplate(name: string) {
    const result = await this.prisma.$queryRaw`
      SELECT * FROM email_templates WHERE name = ${name}
    `;
    return (result as any[])[0] || null;
  }

  async updateCustomizableText(name: string, customizableText: string) {
    await this.prisma.$queryRaw`
      UPDATE email_templates 
      SET customizable_text = ${customizableText}, updated_at = NOW()
      WHERE name = ${name}
    `;
    return this.getCustomizableTemplate(name);
  }

  async sendCustomizableEmail(templateName: string, to: string, variables: Record<string, any>) {
    try {
      const template = await this.getCustomizableTemplate(templateName);
      if (!template || !template.is_active) {
        throw new Error(`Template '${templateName}' not found or inactive`);
      }

      // Replace variables in both customizable text and static template
      let htmlContent = template.static_template;
      let customText = template.customizable_text;

      // Replace variables in customizable text first
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        customText = customText.replace(regex, String(value));
      });

      // Now replace {{customizableText}} in the static template
      htmlContent = htmlContent.replace(/\{\{customizableText\}\}/g, customText);

      // Replace other variables in the static template
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        htmlContent = htmlContent.replace(regex, String(value));
      });

      const mailOptions = {
        from: `"QR Dating App" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to,
        subject: template.subject,
        html: htmlContent,
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