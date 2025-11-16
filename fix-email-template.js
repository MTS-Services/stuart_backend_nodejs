const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplate() {
  try {
    console.log('Fixing email template issues...\n');

    const fixedHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
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
      <body>
        <div class="email-container">

            <div class="header" style="background-color: #667eea; color: #ffffff; text-align: center; padding: 40px 20px;">
              <h1 style="margin: 0; font-size: 32px;">{{appName}}</h1>
              <p style="margin: 10px 0 0 0;">Welcome to our platform</p>
            </div>

            <div class="text-block" style="background-color: #ffa8a8; color: #000000; text-align: left; padding: 20px; font-size: 16px;">
              <p style="margin: 0 0 16px 0;">{{body}}</p>
            </div>

            <div class="footer" style="background-color: #f8f8f8; color: #666666; text-align: center; padding: 20px; font-size: 12px;">
              © {{currentYear}} {{appName}}. All rights reserved.
            </div>

        </div>
      </body>
      </html>
    `;

    const fixedBody = `Hello {{userEmail}},

This is your main email body content. You can write your message here and use variables like {{checkoutUrl}} and {{currentYear}}.

Best regards,
The {{appName}} Team`;

    // Update the template
    const result = await prisma.$executeRaw`
      UPDATE email_templates 
      SET 
        body = ${fixedBody},
        html_template = ${fixedHtml},
        updated_at = NOW()
      WHERE name = 'registration_approved'
    `;

    console.log('✅ Template updated successfully!');
    console.log(`   - Rows affected: ${result}`);
    console.log('\nFixes applied:');
    console.log('1. ❌ Removed hardcoded "Scan Me Maybe" from header → ✅ Now uses {{appName}} variable');
    console.log('2. ❌ Changed text color from #ffffff (white) → ✅ Changed to #000000 (black) for better visibility');
    console.log('3. ❌ Fixed HTML-encoded variables (&#123;&#123;) → ✅ Now uses proper {{variable}} syntax');
    console.log('4. ✅ Body now uses {{body}} variable instead of hardcoded text');

    // Verify the changes
    const updated = await prisma.$queryRaw`
      SELECT name, subject, body, LEFT(html_template, 300) as html_preview 
      FROM email_templates 
      WHERE name = 'registration_approved'
    `;

    console.log('\n=== UPDATED TEMPLATE PREVIEW ===');
    if (updated && updated.length > 0) {
      console.log('Body:', updated[0].body);
      console.log('\nHTML Preview:', updated[0].html_preview + '...');
    }

  } catch (error) {
    console.error('❌ Error fixing template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplate();
