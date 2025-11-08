const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyTemplates() {
  console.log('🔍 Verifying email templates in database...\n');

  const templates = await prisma.emailTemplate.findMany({
    select: {
      id: true,
      name: true,
      subject: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      name: 'asc'
    }
  });

  if (templates.length === 0) {
    console.log('❌ No templates found in database!\n');
    return;
  }

  console.log(`✅ Found ${templates.length} email template(s):\n`);
  
  templates.forEach((template, index) => {
    console.log(`${index + 1}. Template: ${template.name}`);
    console.log(`   Subject: ${template.subject}`);
    console.log(`   Active: ${template.isActive ? '✅' : '❌'}`);
    console.log(`   Created: ${template.createdAt.toISOString()}`);
    console.log('');
  });

  // Check specifically for the registration_approved template
  const registrationTemplate = templates.find(t => t.name === 'registration_approved');
  if (registrationTemplate) {
    console.log('✅ registration_approved template is available and ready to use!\n');
  } else {
    console.log('❌ registration_approved template NOT found!\n');
  }
}

verifyTemplates()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
