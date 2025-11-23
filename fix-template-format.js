const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNewSignupTemplate() {
  try {
    console.log('🔧 Fixing new_user_signup template variables format...');
    
    // Update the template to match the expected array structure
    await prisma.emailTemplate.update({
      where: { name: 'new_user_signup' },
      data: {
        variables: [
          {
            key: 'userName',
            label: 'User Name',
            description: 'The name of the user who registered',
            defaultValue: 'User',
            type: 'string',
            required: true
          },
          {
            key: 'userEmail',
            label: 'User Email',
            description: 'The email address of the user',
            defaultValue: 'user@example.com',
            type: 'email',
            required: true
          },
          {
            key: 'currentYear',
            label: 'Current Year',
            description: 'Current year (auto-generated)',
            defaultValue: new Date().getFullYear().toString(),
            type: 'string',
            required: false
          }
        ],
        components: [
          {
            id: 'header',
            type: 'header',
            name: 'Header',
            properties: {
              title: '🎉 Welcome to Scan Me Maybe!',
              backgroundColor: '#2c2c2c',
              textColor: '#d59a5e',
              fontSize: '32px'
            }
          },
          {
            id: 'textBlock',
            type: 'text_block',
            name: 'Text Block',
            properties: {
              backgroundColor: '#2c2c2c',
              textColor: '#ffffff',
              content: 'Welcome message and registration confirmation',
              fontSize: '16px'
            }
          },
          {
            id: 'footer',
            type: 'footer',
            name: 'Footer',
            properties: {
              backgroundColor: '#2c2c2c',
              textColor: '#ffffff',
              fontSize: '12px'
            }
          }
        ],
        settings: [
          {
            category: 'Design',
            settings: [
              {
                key: 'backgroundColor',
                label: 'Background Color',
                type: 'color',
                value: '#2c2c2c'
              },
              {
                key: 'primaryColor',
                label: 'Primary Color',
                type: 'color',
                value: '#d59a5e'
              },
              {
                key: 'textColor',
                label: 'Text Color',
                type: 'color',
                value: '#ffffff'
              },
              {
                key: 'fontFamily',
                label: 'Font Family',
                type: 'select',
                value: 'Arial, sans-serif',
                options: ['Arial, sans-serif', 'Helvetica, sans-serif', 'Georgia, serif']
              }
            ]
          }
        ]
      }
    });

    console.log('✅ New signup template format fixed!');
    
    // Verify the fix
    const template = await prisma.emailTemplate.findUnique({
      where: { name: 'new_user_signup' }
    });
    
    if (template && Array.isArray(template.variables)) {
      console.log('🎯 Verification successful - variables is now an array');
      console.log(`   - Variables count: ${template.variables.length}`);
      console.log(`   - Variable keys: ${template.variables.map(v => v.key).join(', ')}`);
    } else {
      console.log('❌ Verification failed - variables is not an array');
    }
    
  } catch (error) {
    console.error('❌ Error fixing template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNewSignupTemplate();