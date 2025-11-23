const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    console.log('🔍 Checking email templates...');
    
    const templates = await prisma.emailTemplate.findMany();
    
    console.log(`📊 Found ${templates.length} templates:`);
    
    for (const template of templates) {
      console.log(`\n📧 Template: ${template.name}`);
      console.log(`   - Subject: ${template.subject}`);
      console.log(`   - Variables type:`, typeof template.variables);
      console.log(`   - Components type:`, typeof template.components);
      console.log(`   - Settings type:`, typeof template.settings);
      
      // Check if variables is an object or string
      if (template.variables) {
        console.log(`   - Variables content:`, JSON.stringify(template.variables).substring(0, 100) + '...');
      }
      
      // Fix any string variables that should be objects
      if (typeof template.variables === 'string') {
        console.log(`   ⚠️  Variables is a string, converting to object...`);
        try {
          const parsedVariables = JSON.parse(template.variables);
          await prisma.emailTemplate.update({
            where: { id: template.id },
            data: { variables: parsedVariables }
          });
          console.log(`   ✅ Fixed variables for ${template.name}`);
        } catch (e) {
          console.log(`   ❌ Failed to parse variables for ${template.name}:`, e.message);
        }
      }
      
      // Fix any string components that should be objects
      if (typeof template.components === 'string') {
        console.log(`   ⚠️  Components is a string, converting to object...`);
        try {
          const parsedComponents = JSON.parse(template.components);
          await prisma.emailTemplate.update({
            where: { id: template.id },
            data: { components: parsedComponents }
          });
          console.log(`   ✅ Fixed components for ${template.name}`);
        } catch (e) {
          console.log(`   ❌ Failed to parse components for ${template.name}:`, e.message);
        }
      }
      
      // Fix any string settings that should be objects
      if (typeof template.settings === 'string') {
        console.log(`   ⚠️  Settings is a string, converting to object...`);
        try {
          const parsedSettings = JSON.parse(template.settings);
          await prisma.emailTemplate.update({
            where: { id: template.id },
            data: { settings: parsedSettings }
          });
          console.log(`   ✅ Fixed settings for ${template.name}`);
        } catch (e) {
          console.log(`   ❌ Failed to parse settings for ${template.name}:`, e.message);
        }
      }
    }
    
    console.log('\n✨ Template check completed!');
    
  } catch (error) {
    console.error('❌ Error checking templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();