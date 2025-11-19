import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash the password once for all admins
  const hashedPassword = await bcrypt.hash('Admin123', 10);
  
  // Admin users to create
  const adminUsers = [
    {
      email: 'cheryl.tenold@gmail.com',
      username: 'cheryl.tenold',
      name: 'Cheryl Tenold',
    },
    {
      email: 'stuart.draper@gmail.com',
      username: 'stuart.draper',
      name: 'Stuart Draper',
    },
    {
      email: 'shariarhosain1315@gmail.com',
      username: 'shariarhosain1315',
      name: 'Shariar Hosain',
    },
    {
      email: 'admin@example.com',
      username: 'admin',
      name: 'Admin User',
    },
  ];

  console.log('Creating admin users...');
  
  // Create all admin users in both Admin and User tables
  for (const adminData of adminUsers) {
    // Create in Admin table
    const admin = await prisma.admin.upsert({
      where: { email: adminData.email },
      update: {
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email: adminData.email,
        username: adminData.username,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });
    console.log(`✓ Admin created/updated in Admin table: ${admin.email}`);

    // Create in User table with admin role
    const user = await prisma.user.upsert({
      where: { email: adminData.email },
      update: {
        password: hashedPassword,
        role: 'admin',
        status: 'ACTIVE',
        isApproved: true,
      },
      create: {
        email: adminData.email,
        name: adminData.name,
        password: hashedPassword,
        role: 'admin',
        status: 'ACTIVE',
        isApproved: true,
        paidSetupFee: true,
      },
    });
    console.log(`✓ Admin created/updated in User table: ${user.email}`);
  }

  console.log('\n✓ All admin users seeded successfully!');
  console.log('Password for all admins: Admin123');
  console.log('\nAdmins created in both tables:');
  console.log('- cheryl.tenold@gmail.com');
  console.log('- stuart.draper@gmail.com');
  console.log('- shariarhosain1315@gmail.com');
  console.log('- admin@example.com');

  // Seed Email Templates
  console.log('\n📧 Seeding email templates...');

  const defaultTemplates = [
    {
      name: 'registration_approved',
      subject: '🎉 Welcome to QR Dating App - Registration Approved!',
      body: 'Congratulations! Your registration has been approved. You can now create your profile and start connecting with other members.',
      htmlTemplate: `<!DOCTYPE html>
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
        </div>
        <div class="footer">
            <p>© {{currentYear}} QR Dating App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
      preheader: 'Your registration has been approved!',
      isActive: true,
    },
    {
      name: 'registration_rejected',
      subject: '❌ QR Dating App - Registration Update',
      body: 'We regret to inform you that your registration has been rejected. Please review our terms and conditions.',
      htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #fff5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #f44336; margin-bottom: 30px; }
        .header h1 { color: #f44336; font-size: 28px; margin: 0; }
        .content { font-size: 16px; line-height: 1.8; color: #333333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 QR Dating App</h1>
        </div>
        <div class="content">
            <p>Hello {{userName}},</p>
            <p>{{body}}</p>
            <p>Reason: {{rejectionReason}}</p>
        </div>
    </div>
</body>
</html>`,
      preheader: 'Registration update',
      isActive: true,
    },
    {
      name: 'profile_approved',
      subject: '✅ Your Profile Has Been Approved!',
      body: 'Great news! Your profile has been reviewed and approved. You can now start using your QR cards.',
      htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f0f8ff; }
        .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 12px; }
        .header { text-align: center; color: #4CAF50; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Profile Approved!</h1>
        </div>
        <p>Hello {{userName}},</p>
        <p>{{body}}</p>
    </div>
</body>
</html>`,
      preheader: 'Your profile is approved!',
      isActive: true,
    },
    {
      name: 'profile_rejected',
      subject: '⚠️ Profile Review Required',
      body: 'Your profile requires some updates before approval. Please review the feedback and resubmit.',
      htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #fff5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 12px; }
        .header { text-align: center; color: #f44336; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Profile Update Needed</h1>
        </div>
        <p>Hello {{userName}},</p>
        <p>{{body}}</p>
        <p>Reason: {{rejectionReason}}</p>
    </div>
</body>
</html>`,
      preheader: 'Profile review needed',
      isActive: true,
    },
    {
      name: 'password_reset',
      subject: '🔐 Reset Your Password',
      body: 'You requested to reset your password. Click the link below to create a new password.',
      htmlTemplate: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 40px; border-radius: 12px; }
        .button { display: inline-block; background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Password Reset</h1>
        <p>Hello {{userName}},</p>
        <p>{{body}}</p>
        <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
        <p>This link expires in {{expirationTime}}.</p>
    </div>
</body>
</html>`,
      preheader: 'Reset your password',
      isActive: true,
    },
  ];

  for (const template of defaultTemplates) {
    const emailTemplate = await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: {
        subject: template.subject,
        body: template.body,
        htmlTemplate: template.htmlTemplate,
        preheader: template.preheader,
        isActive: template.isActive,
      },
      create: template,
    });
    console.log(`✓ Email template created/updated: ${emailTemplate.name}`);
  }

  console.log('\n✓ All email templates seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });