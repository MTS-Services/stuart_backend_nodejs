const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initPasswordResetTemplate() {
  try {
    console.log('🔄 Initializing password reset email template...');

    const template = {
      name: 'password_reset',
      subject: '🔐 Reset Your Password - Scan Me Maybe',
      body: 'You requested to reset your password. Click the button below to set a new password for your account.',
      htmlTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #2c2c2c; 
            color: #ffffff; 
            line-height: 1.6; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #333333; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3); 
        }
        .header { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            text-align: center; 
            padding: 30px 20px; 
            color: #ffffff; 
        }
        .header h1 { 
            color: #ffffff; 
            font-size: 28px; 
            margin: 0; 
            font-weight: bold; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .content { 
            padding: 30px 20px; 
            font-size: 16px; 
            line-height: 1.8; 
            color: #ffffff; 
        }
        .info-box { 
            background: linear-gradient(135deg, #4facfe, #00f2fe); 
            color: #000000; 
            padding: 25px; 
            border-radius: 12px; 
            margin: 25px 0; 
            text-align: center;
            box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
        }
        .info-box h2 { 
            margin: 0 0 15px 0; 
            font-size: 24px; 
            font-weight: bold;
            color: #000000;
        }
        .info-box p {
            margin: 10px 0;
            color: #000000;
        }
        .footer { 
            background-color: #2c2c2c;
            text-align: center; 
            padding: 20px; 
            font-size: 12px; 
            color: #cccccc; 
        }
        .reset-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            color: #ffffff !important; 
            padding: 18px 35px; 
            text-decoration: none; 
            border-radius: 30px; 
            font-weight: bold; 
            font-size: 16px;
            margin: 25px auto;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            transition: transform 0.3s ease;
            text-align: center;
            min-width: 200px;
            display: block;
            width: fit-content;
        }
        .reset-button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
        }
        .security-box {
            background-color: #404040;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .security-box h3 {
            color: #ffc107;
            margin-top: 0;
            font-size: 18px;
        }
        .security-box ul {
            color: #ffffff;
            margin: 10px 0;
            padding-left: 20px;
        }
        .link-box {
            background-color: #404040;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            word-break: break-all;
        }
        .link-box p {
            margin: 5px 0;
            font-size: 12px;
            color: #cccccc;
        }
        .link-box a {
            color: #667eea;
            text-decoration: none;
            font-family: monospace;
            font-size: 11px;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                margin: 0;
                border-radius: 8px;
            }
            .content {
                padding: 20px 15px;
            }
            .header {
                padding: 25px 15px;
            }
            .info-box {
                padding: 20px 15px;
                margin: 20px 0;
            }
            .reset-button {
                padding: 16px 25px;
                font-size: 14px;
                width: calc(100% - 30px);
                max-width: 100%;
                margin: 25px auto;
            }
            .security-box, .link-box {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Scan Me Maybe</h1>
        </div>
        <div class="content">
            <div class="info-box">
                <h2>Password Reset Request</h2>
                <p>Hi {{userName}},</p>
                <p>We received a request to reset your password.</p>
            </div>
            
            <p>{{body}}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetPasswordUrl}}" class="reset-button">
                    🔑 Set New Password
                </a>
            </div>
            
            <div class="link-box">
                <p>Or copy and paste this link into your browser:</p>
                <a href="{{resetPasswordUrl}}">{{resetPasswordUrl}}</a>
            </div>
            
            <div class="security-box">
                <h3>🛡️ Security Tips:</h3>
                <ul>
                    <li>This link will expire in 24 hours for your security</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share your password with anyone</li>
                    <li>Use a strong, unique password for your account</li>
                </ul>
            </div>
            
            <p style="text-align: center; color: #cccccc; font-size: 14px; margin-top: 30px;">
                Need help? Contact our support team at support@scanmemaybe.com
            </p>
        </div>
        <div class="footer">
            <p>© {{currentYear}} Scan Me Maybe. All rights reserved.</p>
            <p style="margin-top: 10px;">This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>`
    };

    // Insert the template
    await prisma.$executeRaw`
      INSERT INTO email_templates (name, subject, body, html_template, is_active, created_at, updated_at)
      VALUES (${template.name}, ${template.subject}, ${template.body}, ${template.htmlTemplate}, true, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE 
      SET subject = ${template.subject}, 
          body = ${template.body}, 
          html_template = ${template.htmlTemplate}, 
          updated_at = NOW()
    `;

    console.log('✅ Password reset email template initialized successfully!');
    
    // Verify the template
    const result = await prisma.$queryRaw`
      SELECT name, subject, is_active FROM email_templates WHERE name = ${template.name}
    `;
    
    console.log('\n📧 Template details:');
    console.log(result);

  } catch (error) {
    console.error('❌ Error initializing template:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initPasswordResetTemplate()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
