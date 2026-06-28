const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNewSignupTemplateStructure() {
  try {
    console.log('🔧 Fixing new_user_signup template to match existing structure...');
    
    await prisma.emailTemplate.update({
      where: { name: 'new_user_signup' },
      data: {
        variables: [
          {
            "key": "currentYear",
            "label": "Current Year",
            "description": "Current year (auto-generated)",
            "defaultValue": "2026"
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
        }
      }
    });

    console.log('✅ Template structure fixed to match existing templates!');
    
    // Verify the fix
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'new_user_signup' }
    });
    
    console.log('🎯 Verification:');
    console.log(`   - Variables count: ${template.variables.length}`);
    console.log(`   - Components count: ${template.components.length}`);
    console.log(`   - Settings type: ${typeof template.settings}`);
    console.log(`   - Settings has backgroundColor: ${!!template.settings.backgroundColor}`);
    
  } catch (error) {
    console.error('❌ Error fixing template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNewSignupTemplateStructure();