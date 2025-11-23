const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedNewSignupTemplate() {
  try {
    console.log('🌱 Seeding new_user_signup email template...');

    // Check if template already exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { name: 'new_user_signup' }
    });

    if (existingTemplate) {
      console.log('✅ Template already exists, updating...');
      
      await prisma.emailTemplate.update({
        where: { name: 'new_user_signup' },
        data: {
          subject: 'Welcome to Scan Me Maybe! 🎉',
          body: 'Thank you for signing up! Your registration is now under review.',
          htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
<style>
  body { 
    font-family: Arial, sans-serif; 
    margin: 0; 
    padding: 0; 
    background-color: #2c2c2c; 
    line-height: 1.6;
  }
  * {
    box-sizing: border-box;
  }
  .email-container { 
    max-width: 600px; 
    margin: 0 auto; 
    background-color: #ffffff; 
    font-size: 0;
    display: block;
  }
  .component { 
    margin: 0; 
    padding: 0; 
    font-size: 14px;
    line-height: 1.6; 
    display: block;
  }
  .header { 
    padding: 40px 20px; 
    text-align: center; 
    margin: 0; 
    display: block; 
    font-size: 14px;
    line-height: 1.4;
  }
  .header h1 {
    margin: 0 0 10px 0;
    font-size: 32px;
    line-height: 1.2;
    font-weight: bold;
  }
  .header p {
    margin: 10px 0 0 0;
    font-size: 16px;
    line-height: 1.4;
  }
  .text-block { 
    padding: 20px; 
    margin: 0; 
    display: block; 
    font-size: 14px;
    line-height: 1.6;
  }
  .text-block p {
    margin: 0 0 16px 0;
    line-height: 1.6;
  }
  .button-container { 
    padding: 20px; 
    margin: 0; 
    display: block; 
    text-align: center;
  }
  .button { 
    display: inline-block; 
    text-decoration: none; 
    border-radius: 8px; 
    padding: 15px 30px; 
    font-weight: bold; 
    font-size: 16px;
    line-height: 1;
  }
  .image-container { 
    padding: 20px; 
    text-align: center; 
    margin: 0; 
    display: block; 
  }
  .divider { 
    margin: 20px 0; 
    display: block; 
  }
  .footer { 
    padding: 20px; 
    text-align: center; 
    font-size: 12px; 
    margin: 0; 
    display: block; 
    line-height: 1.6;
  }
</style>

</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #2c2c2c; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-size: 0; display: block;">
          
      <div class="header" style="background-color: #2c2c2c; color: #d59a5e; text-align: center; padding: 40px 20px;">
        <h1 style="margin: 0; font-size: 32px; color: #d59a5e;">🎉 Welcome to Scan Me Maybe!</h1>
        
      </div>
    
      <div class="text-block" style="background-color: #2c2c2c; color: #ffffff; text-align: center; padding: 20px; font-size: 16px;">
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Hello {{userName}},</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Thank you for signing up for Scan Me Maybe! We're excited to have you join our community.</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Your registration has been received and is currently under review by our admin team. You'll receive an email notification once your account has been approved.</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Once approved, you'll be able to:</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">• Create your unique dating profile</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">• Get your personalized QR cards</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">• Start connecting with amazing people!</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">If you have any questions, feel free to contact our support team.</p>
      </div>
    
      <div class="footer" style="background-color: #2c2c2c; color: #ffffff; text-align: center; padding: 20px; font-size: 12px;">
        <p style="margin: 5px 0; color: #ffffff; font-size: 12px;">© {{currentYear}} Scan Me Maybe. All rights reserved.</p>
      </div>
    
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
          preheader: 'Welcome to Scan Me Maybe! Your registration is under review.',
          variables: [
            {
              "key": "currentYear",
              "label": "Current Year",
              "description": "Current year (auto-generated)",
              "defaultValue": "2025"
            },
            {
              "key": "appName",
              "label": "App Name",
              "description": "Application name",
              "defaultValue": "Scan Me Maybe"
            },
            {
              "key": "userName",
              "label": "User Name",
              "description": "User's full name",
              "defaultValue": "John Doe"
            },
            {
              "key": "userEmail",
              "label": "User Email",
              "description": "Recipient email address",
              "defaultValue": "user@example.com"
            },
            {
              "key": "email",
              "label": "Email (alias)",
              "description": "Same as userEmail",
              "defaultValue": "user@example.com"
            },
            {
              "key": "subject",
              "label": "Email Subject",
              "description": "Template subject line",
              "defaultValue": "Welcome to Scan Me Maybe! 🎉"
            },
            {
              "key": "body",
              "label": "Email Body",
              "description": "Template body content",
              "defaultValue": "Thank you for signing up! Your registration is now under review."
            }
          ],
          components: [
            {
              "id": Date.now() + 1,
              "type": "header",
              "props": {
                "title": "🎉 Welcome to Scan Me Maybe!",
                "padding": "40px 20px",
                "subtitle": "",
                "alignment": "center",
                "textColor": "#d59a5e",
                "backgroundColor": "#2c2c2c"
              }
            },
            {
              "id": Date.now() + 2,
              "type": "text",
              "props": {
                "content": "Hello {{userName}},\n\nThank you for signing up for Scan Me Maybe! We're excited to have you join our community.\n\nYour registration has been received and is currently under review by our admin team. You'll receive an email notification once your account has been approved.\n\nOnce approved, you'll be able to:\n• Create your unique dating profile\n• Get your personalized QR cards\n• Start connecting with amazing people!\n\nIf you have any questions, feel free to contact our support team.",
                "padding": "20px",
                "fontSize": "16px",
                "alignment": "left",
                "textColor": "#ffffff",
                "backgroundColor": "#2c2c2c"
              }
            },
            {
              "id": Date.now() + 3,
              "type": "footer",
              "props": {
                "content": "© {{currentYear}} {{appName}}. All rights reserved.",
                "padding": "20px",
                "fontSize": "12px",
                "alignment": "center",
                "textColor": "#ffffff",
                "backgroundColor": "#2c2c2c"
              }
            }
          ],
          settings: {
            "subject": "Welcome to Scan Me Maybe! 🎉",
            "preheader": "Welcome to Scan Me Maybe! Your registration is under review.",
            "fontFamily": "Arial, sans-serif",
            "containerWidth": 600,
            "backgroundColor": "#2c2c2c"
          },
          isActive: true
        }
      });

      console.log('✅ Template updated successfully!');
    } else {
      console.log('📝 Creating new template...');
      
      await prisma.emailTemplate.create({
        data: {
          name: 'new_user_signup',
          subject: 'Welcome to Scan Me Maybe! 🎉',
          body: 'Thank you for signing up! Your registration is now under review.',
          htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
<style>
  body { 
    font-family: Arial, sans-serif; 
    margin: 0; 
    padding: 0; 
    background-color: #2c2c2c; 
    line-height: 1.6;
  }
  * {
    box-sizing: border-box;
  }
  .email-container { 
    max-width: 600px; 
    margin: 0 auto; 
    background-color: #ffffff; 
    font-size: 0;
    display: block;
  }
  .component { 
    margin: 0; 
    padding: 0; 
    font-size: 14px;
    line-height: 1.6; 
    display: block;
  }
  .header { 
    padding: 40px 20px; 
    text-align: center; 
    margin: 0; 
    display: block; 
    font-size: 14px;
    line-height: 1.4;
  }
  .header h1 {
    margin: 0 0 10px 0;
    font-size: 32px;
    line-height: 1.2;
    font-weight: bold;
  }
  .header p {
    margin: 10px 0 0 0;
    font-size: 16px;
    line-height: 1.4;
  }
  .text-block { 
    padding: 20px; 
    margin: 0; 
    display: block; 
    font-size: 14px;
    line-height: 1.6;
  }
  .text-block p {
    margin: 0 0 16px 0;
    line-height: 1.6;
  }
  .button-container { 
    padding: 20px; 
    margin: 0; 
    display: block; 
    text-align: center;
  }
  .button { 
    display: inline-block; 
    text-decoration: none; 
    border-radius: 8px; 
    padding: 15px 30px; 
    font-weight: bold; 
    font-size: 16px;
    line-height: 1;
  }
  .image-container { 
    padding: 20px; 
    text-align: center; 
    margin: 0; 
    display: block; 
  }
  .divider { 
    margin: 20px 0; 
    display: block; 
  }
  .footer { 
    padding: 20px; 
    text-align: center; 
    font-size: 12px; 
    margin: 0; 
    display: block; 
    line-height: 1.6;
  }
</style>

</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #2c2c2c; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; font-size: 0; display: block;">
          
      <div class="header" style="background-color: #2c2c2c; color: #d59a5e; text-align: center; padding: 40px 20px;">
        <h1 style="margin: 0; font-size: 32px; color: #d59a5e;">🎉 Welcome to Scan Me Maybe!</h1>
        
      </div>
    
      <div class="text-block" style="background-color: #2c2c2c; color: #ffffff; text-align: center; padding: 20px; font-size: 16px;">
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Hello {{userName}},</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Thank you for signing up for Scan Me Maybe! We're excited to have you join our community.</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Your registration has been received and is currently under review by our admin team. You'll receive an email notification once your account has been approved.</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">Once approved, you'll be able to:</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">• Create your unique dating profile</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">• Get your personalized QR cards</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">• Start connecting with amazing people!</p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;"></p>
        <p style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">If you have any questions, feel free to contact our support team.</p>
      </div>
    
      <div class="footer" style="background-color: #2c2c2c; color: #ffffff; text-align: center; padding: 20px; font-size: 12px;">
        <p style="margin: 5px 0; color: #ffffff; font-size: 12px;">© {{currentYear}} Scan Me Maybe. All rights reserved.</p>
      </div>
    
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`,
          preheader: 'Welcome to Scan Me Maybe! Your registration is under review.',
          variables: [
            {
              "key": "currentYear",
              "label": "Current Year",
              "description": "Current year (auto-generated)",
              "defaultValue": "2025"
            },
            {
              "key": "appName",
              "label": "App Name",
              "description": "Application name",
              "defaultValue": "Scan Me Maybe"
            },
            {
              "key": "userName",
              "label": "User Name",
              "description": "User's full name",
              "defaultValue": "John Doe"
            },
            {
              "key": "userEmail",
              "label": "User Email",
              "description": "Recipient email address",
              "defaultValue": "user@example.com"
            },
            {
              "key": "email",
              "label": "Email (alias)",
              "description": "Same as userEmail",
              "defaultValue": "user@example.com"
            },
            {
              "key": "subject",
              "label": "Email Subject",
              "description": "Template subject line",
              "defaultValue": "Welcome to Scan Me Maybe! 🎉"
            },
            {
              "key": "body",
              "label": "Email Body",
              "description": "Template body content",
              "defaultValue": "Thank you for signing up! Your registration is now under review."
            }
          ],
          components: [
            {
              "id": Date.now() + 1,
              "type": "header",
              "props": {
                "title": "🎉 Welcome to Scan Me Maybe!",
                "padding": "40px 20px",
                "subtitle": "",
                "alignment": "center",
                "textColor": "#d59a5e",
                "backgroundColor": "#2c2c2c"
              }
            },
            {
              "id": Date.now() + 2,
              "type": "text",
              "props": {
                "content": "Hello {{userName}},\n\nThank you for signing up for Scan Me Maybe! We're excited to have you join our community.\n\nYour registration has been received and is currently under review by our admin team. You'll receive an email notification once your account has been approved.\n\nOnce approved, you'll be able to:\n• Create your unique dating profile\n• Get your personalized QR cards\n• Start connecting with amazing people!\n\nIf you have any questions, feel free to contact our support team.",
                "padding": "20px",
                "fontSize": "16px",
                "alignment": "left",
                "textColor": "#ffffff",
                "backgroundColor": "#2c2c2c"
              }
            },
            {
              "id": Date.now() + 3,
              "type": "footer",
              "props": {
                "content": "© {{currentYear}} {{appName}}. All rights reserved.",
                "padding": "20px",
                "fontSize": "12px",
                "alignment": "center",
                "textColor": "#ffffff",
                "backgroundColor": "#2c2c2c"
              }
            }
          ],
          settings: {
            "subject": "Welcome to Scan Me Maybe! 🎉",
            "preheader": "Welcome to Scan Me Maybe! Your registration is under review.",
            "fontFamily": "Arial, sans-serif",
            "containerWidth": 600,
            "backgroundColor": "#2c2c2c"
          },
          isActive: true
        }
      });

      console.log('✅ Template created successfully!');
    }

    // Verify the template exists
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'new_user_signup' }
    });

    if (template) {
      console.log('🎯 Template verification successful:');
      console.log('   - Name:', template.name);
      console.log('   - Subject:', template.subject);
      console.log('   - Active:', template.isActive);
      console.log('   - Variables:', Object.keys(template.variables || {}));
    }

    console.log('✨ New signup email template seed completed!');

  } catch (error) {
    console.error('❌ Error seeding new signup template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedNewSignupTemplate()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedNewSignupTemplate };