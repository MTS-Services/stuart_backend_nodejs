const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...');

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
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{paymentUrl}}" class="button" style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3); display: inline-block;">
                    {{paymentButtonText}}
                </a>
            </div>
            
            <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                <h3 style="color: #4CAF50; margin-top: 0;">🎯 Next Steps:</h3>
                <ol style="color: #333; line-height: 1.6;">
                    <li>Click the payment button above</li>
                    <li>Complete your $69 setup fee</li>
                    <li>Create your amazing profile</li>
                    <li>Get your 50 physical QR cards delivered!</li>
                </ol>
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
                <a href="{{dashboardUrl}}" class="cta-button">{{dashboardButtonText}}</a>
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
                <a href="{{editProfileUrl}}" class="edit-button">{{editButtonText}}</a>
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
      name: 'password_reset',
      subject: '🔐 Password Reset Request - QR Dating App',
      body: 'You requested to reset your password. Click the button below to reset it.',
      htmlTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f0f8ff; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #F07400; margin-bottom: 30px; }
        .header h1 { color: #000044; font-size: 28px; margin: 0; font-weight: bold; }
        .content { font-size: 16px; line-height: 1.8; color: #333333; }
        .highlight-box { background: linear-gradient(135deg, #F07400, #e06600); color: white; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; }
        .highlight-box h2 { margin: 0 0 10px 0; font-size: 22px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .button { display: inline-block; background: #F07400; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #e06600; }
        .link-text { color: #666; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 15px 0; }
        .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <div class="highlight-box">
                <h2>Hi {{userName}}!</h2>
                <p>Password reset requested</p>
            </div>
            <p>{{body}}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetPasswordUrl}}" class="button" style="background: linear-gradient(135deg, #F07400, #e06600); color: white; padding: 18px 35px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 8px 25px rgba(240, 116, 0, 0.3); display: inline-block;">
                    🔐 Reset Password
                </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <div class="link-text">{{resetPasswordUrl}}</div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </div>
            
            <p>If you continue to have problems, please contact our support team.</p>
        </div>
        <div class="footer">
            <p>© {{currentYear}} QR Dating App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    }
  ];

  let seededCount = 0;
  let skippedCount = 0;

  for (const template of defaultTemplates) {
    try {
      // Check if template already exists
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      });

      if (existing) {
        console.log(`  ⏭️  Template '${template.name}' already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Create new template
      await prisma.emailTemplate.create({
        data: {
          name: template.name,
          subject: template.subject,
          body: template.body,
          htmlTemplate: template.htmlTemplate,
          isActive: true
        }
      });

      console.log(`  ✅ Created template: ${template.name}`);
      seededCount++;
    } catch (error) {
      console.error(`  ❌ Error creating template ${template.name}:`, error.message);
    }
  }

  console.log(`\n✨ Seeding complete!`);
  console.log(`   - Created: ${seededCount} templates`);
  console.log(`   - Skipped: ${skippedCount} templates`);
  console.log(`   - Total: ${defaultTemplates.length} templates\n`);
}

seedEmailTemplates()
  .catch((e) => {
    console.error('❌ Error seeding email templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
