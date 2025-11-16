const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    // First list all templates
    const allTemplates = await prisma.$queryRaw`
      SELECT name FROM email_templates
    `;
    console.log('Available templates:', allTemplates.map(t => t.name));
    
    const result = await prisma.$queryRaw`
      SELECT name, subject, body, html_template 
      FROM email_templates 
      LIMIT 1
    `;
    
    if (result && result.length > 0) {
      const template = result[0];
      console.log('Template Name:', template.name);
      console.log('\n=== SUBJECT ===');
      console.log(template.subject);
      console.log('\n=== BODY ===');
      console.log(template.body);
      console.log('\n=== HTML TEMPLATE ===');
      console.log(template.html_template);
      
      // Check for issues
      console.log('\n=== ANALYSIS ===');
      const bodyHasScanMeMaybe = template.body.includes('Scan Me Maybe');
      const htmlHasScanMeMaybe = template.html_template.includes('Scan Me Maybe');
      
      console.log('Body contains "Scan Me Maybe":', bodyHasScanMeMaybe);
      console.log('HTML contains "Scan Me Maybe":', htmlHasScanMeMaybe);
      
      // Check for text color in body
      const bodyMatches = template.body.match(/Hello.*?chainor\.com/s);
      if (bodyMatches) {
        console.log('\nBody text snippet:', bodyMatches[0]);
      }
      
      // Check for style issues in HTML
      const styleMatches = template.html_template.match(/style="[^"]*color[^"]*"/gi);
      if (styleMatches) {
        console.log('\nColor styles found:', styleMatches);
      }
    } else {
      console.log('No template found with name "welcome"');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
