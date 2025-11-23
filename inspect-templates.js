const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectExistingTemplateStructure() {
  try {
    console.log('🔍 Inspecting existing template structure...');
    
    // Get an existing working template to see the exact structure
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: { 
        name: { 
          in: ['profile_approved', 'registration_approved', 'profile_rejected'] 
        } 
      }
    });
    
    if (existingTemplate) {
      console.log(`📧 Existing template: ${existingTemplate.name}`);
      console.log('Variables structure:');
      console.log(JSON.stringify(existingTemplate.variables, null, 2));
      console.log('\nComponents structure:');
      console.log(JSON.stringify(existingTemplate.components, null, 2));
      console.log('\nSettings structure:');
      console.log(JSON.stringify(existingTemplate.settings, null, 2));
    }
    
    // Get our problematic template
    const newTemplate = await prisma.emailTemplate.findUnique({
      where: { name: 'new_user_signup' }
    });
    
    if (newTemplate) {
      console.log(`\n📧 New template: ${newTemplate.name}`);
      console.log('Variables structure:');
      console.log(JSON.stringify(newTemplate.variables, null, 2));
      console.log('\nComponents structure:');
      console.log(JSON.stringify(newTemplate.components, null, 2));
      console.log('\nSettings structure:');
      console.log(JSON.stringify(newTemplate.settings, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error inspecting templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectExistingTemplateStructure();