const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function activateAllEmailTemplates() {
  console.log('🔧 Activating all email templates...');

  try {
    // Update all email templates to be active
    const result = await prisma.emailTemplate.updateMany({
      data: {
        isActive: true
      }
    });

    console.log(`✅ Successfully activated ${result.count} email templates`);

    // Show current status of all templates
    const templates = await prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        subject: true,
        isActive: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('\n📋 Current template status:');
    templates.forEach(template => {
      const status = template.isActive ? '✅ Active' : '❌ Inactive';
      console.log(`  ${status} - ${template.name}: ${template.subject}`);
    });

    console.log('\n🎉 All templates are now active!');
    
  } catch (error) {
    console.error('❌ Error activating templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
activateAllEmailTemplates()
  .catch(console.error);