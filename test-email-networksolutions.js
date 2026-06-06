/**
 * Email Test Script - Google Workspace SMTP
 * Tests SMTP connectivity for info@scanmemaybe.com
 */

const nodemailer = require('nodemailer');



const configs = [
  {
    label: 'Gmail SMTP (Port 587 TLS)',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
  },
  {
    label: 'Gmail SMTP (Port 465 SSL)',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
  },
];

async function testConfig(config) {
  console.log(`\n🔄 Trying: ${config.label}`);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS || false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    console.log('   ✅ Connection verified! Sending email...');

    const info = await transporter.sendMail({
      from: `"ScanMeMaybe" <${EMAIL_USER}>`,
      to: TO_EMAIL,
      subject: 'Test Email - ScanMeMaybe SMTP Working!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">✅ Email is Working!</h2>
          <p>This test email was sent from <strong>info@scanmemaybe.com</strong> via Google Workspace SMTP.</p>
          <hr>
          <p><strong>Host:</strong> ${config.host}:${config.port}</p>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log(`   📧 Email sent! Message ID: ${info.messageId}`);
    console.log(`\n🎉 SUCCESS! Add this to your .env:\n`);
    console.log(`   EMAIL_HOST=${config.host}`);
    console.log(`   EMAIL_PORT=${config.port}`);
    console.log(`   EMAIL_SECURE=${config.secure}`);
    console.log(`   EMAIL_USER=${EMAIL_USER}`);
    console.log(`   EMAIL_PASS=${EMAIL_PASS}`);
    console.log(`   FROM_EMAIL=${EMAIL_USER}\n`);
    return true;
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  ScanMeMaybe Email Test - Google Workspace App Password');
  console.log('='.repeat(60));
  console.log(`  From: ${EMAIL_USER}`);
  console.log(`  To:   ${TO_EMAIL}`);
  console.log('='.repeat(60));

  for (const config of configs) {
    const success = await testConfig(config);
    if (success) process.exit(0);
  }

  console.log('\n❌ All configurations failed.');
  process.exit(1);
}

main();
