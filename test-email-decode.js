const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEmailRendering() {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'registration_approved' }
    });
    
    if (!template) {
      console.log('Template not found');
      return;
    }

    let html = template.htmlTemplate;
    
    // Simulate the preDecode function
    const preDecode = (html) => {
      html = html
        .replace(/&#123;/g, '{')
        .replace(/&#125;/g, '}')
        .replace(/&amp;#123;/g, '{')
        .replace(/&amp;#125;/g, '}')
        .replace(/%7B/gi, '{')
        .replace(/%7D/gi, '}')
        .replace(/%257B/gi, '{')
        .replace(/%257D/gi, '}');
      return html;
    };
    
    html = preDecode(html);
    
    // Check if variables are now properly formatted
    const hasProperVars = html.includes('{{userName}}') || html.includes('{{userEmail}}');
    const hasEncodedVars = html.includes('&#123;') || html.includes('&#125;');
    
    console.log('After decoding:');
    console.log('Has proper variables ({{var}}):', hasProperVars);
    console.log('Still has encoded variables:', hasEncodedVars);
    console.log('\nSample of decoded HTML (first 1000 chars):');
    console.log(html.substring(0, 1000));
    
    // Test variable replacement
    const testVariables = {
      userName: 'John Doe',
      userEmail: 'john@example.com',
      appName: 'Scan Me Maybe',
      currentYear: '2026',
      body: 'Welcome to our platform!'
    };
    
    Object.entries(testVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, value);
    });
    
    const stillHasVars = html.includes('{{');
    console.log('\nAfter replacing test variables:');
    console.log('Still has unreplaced variables:', stillHasVars);
    
    if (stillHasVars) {
      const remainingVars = html.match(/\{\{[^}]+\}\}/g);
      console.log('Remaining variables:', remainingVars);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailRendering();
