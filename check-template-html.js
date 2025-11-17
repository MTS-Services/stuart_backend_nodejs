const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'registration_approved' }
    });
    
    if (template) {
      console.log('Template Name:', template.name);
      console.log('Subject:', template.subject);
      console.log('Has htmlTemplate:', !!template.htmlTemplate);
      console.log('HTML length:', template.htmlTemplate?.length || 0);
      console.log('\nFirst 1000 characters of HTML:');
      console.log(template.htmlTemplate?.substring(0, 1000));
      console.log('\n\nChecking for style tags and inline styles:');
      console.log('Has <style> tags:', template.htmlTemplate?.includes('<style>') || false);
      console.log('Has inline style attributes:', template.htmlTemplate?.includes('style=') || false);
      console.log('Has background colors:', template.htmlTemplate?.includes('background') || false);
    } else {
      console.log('Template not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
