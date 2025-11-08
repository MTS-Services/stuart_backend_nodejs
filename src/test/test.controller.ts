// Create a test endpoint to directly test email sending
// This will show us exactly what's happening with the email service

import { Controller, Get, Query } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Controller('test')
export class TestController {
  constructor(private emailService: EmailService) {}

  @Get('send-registration-email')
  async testSendRegistrationEmail(
    @Query('email') email: string = 'test@example.com',
    @Query('name') name: string = 'TestUser'
  ) {
    console.log('🧪 Testing registration email sending...');
    
    try {
      const result = await this.emailService.sendCustomizableEmail('registration_approved', email, {
        userName: name,
        paymentUrl: `https://stuart05frontend.mtscorporate.com/checkout/${email}`,
        currentYear: new Date().getFullYear().toString(),
      });

      return {
        success: true,
        message: 'Email sent successfully',
        result,
        note: 'Check server console logs for detailed email output'
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('check-template')
  async checkTemplate(@Query('name') templateName: string = 'registration_approved') {
    try {
      const template = await this.emailService.getCustomizableTemplate(templateName);
      
      if (!template) {
        return { error: 'Template not found' };
      }

      return {
        success: true,
        template: {
          name: template.name,
          subject: template.subject,
          hasHtmlTemplate: !!template.html_template,
          hasButtonStructure: template.html_template?.includes('{{paymentButtonText}}'),
          hasPaymentUrl: template.html_template?.includes('{{paymentUrl}}'),
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}