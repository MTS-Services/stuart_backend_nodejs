import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter (use your preferred email service)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendSignupLink(email: string, name: string, signupToken: string) {
    const signupUrl = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/complete-signup?token=${signupToken}`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: email,
      subject: '💕 Complete Your QR Card Dating App Signup',
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

    return this.transporter.sendMail(mailOptions);
  }

  async sendOrderConfirmation(email: string, name: string, orderId: string, deliveryETA: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@qrcardating.com',
      to: email,
      subject: '🎉 Payment Successful! Your QR Cards Are Coming',
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
          
          <a href="${process.env.FRONTEND_URL || 'https://yourapp.com'}/profile" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
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
          
          <a href="${editLink}" style="background: #ffc107; color: #212529; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Edit Profile →
          </a>
          
          <p>Need help? Reply to this email and our team will assist you!</p>
        </div>
      `,
    };

    return this.transporter.sendMail(mailOptions);
  }
}