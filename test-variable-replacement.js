// Test template variable replacement
const { PrismaClient } = require('@prisma/client');

async function testTemplateVariables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Template Variable Replacement...');
    
    // First, make sure we have the registration_approved template
    const template = await prisma.$queryRaw`
      SELECT * FROM email_templates WHERE name = 'registration_approved'
    `;
    
    if (template.length === 0) {
      console.log('❌ Template not found - initializing...');
      return;
    }
    
    const t = template[0];
    console.log('\n📧 Template Found:');
    console.log(`Subject: ${t.subject}`);
    console.log(`Body: ${t.body}`);
    console.log(`HTML Template Length: ${t.html_template?.length || 0} chars`);
    
    // Test variable replacement
    const variables = {
      currentYear: '2025',
      appName: 'QR Dating App',
      subject: t.subject,
      body: t.body,
      userName: 'John Doe',
      dashboardUrl: 'https://app.example.com/dashboard',
      editProfileUrl: 'https://app.example.com/profile/edit',
      rejectionReason: 'Test rejection reason'
    };
    
    let finalHtml = t.html_template;
    let finalSubject = t.subject;
    let finalBody = t.body;
    
    console.log('\n🔄 Variables to Replace:');
    Object.entries(variables).forEach(([key, value]) => {
      console.log(`  {{${key}}} → ${value}`);
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      finalSubject = finalSubject.replace(regex, String(value || ''));
      finalBody = finalBody.replace(regex, String(value || ''));
      finalHtml = finalHtml.replace(regex, String(value || ''));
    });
    
    console.log('\n✅ After Replacement:');
    console.log(`Final Subject: ${finalSubject}`);
    console.log(`Final Body: ${finalBody}`);
    
    // Check if all variables were replaced
    const remainingVars = finalHtml.match(/\\{\\{[^}]+\\}\\}/g);
    if (remainingVars) {
      console.log('❌ Unreplaced variables found:', remainingVars);
    } else {
      console.log('✅ All variables replaced successfully!');
    }
    
    // Show a snippet of the final HTML
    const snippet = finalHtml.substring(0, 300) + '...';
    console.log('\n📄 HTML Preview:');
    console.log(snippet);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTemplateVariables();