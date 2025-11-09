// Run this with: npx ts-node fix-image-urls.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixImageUrls() {
  console.log('🔧 Fixing image URLs (HTTPS → HTTP)...\n');

  try {
    // Get all profiles with images
    const profiles = await prisma.profile.findMany({
      select: {
        id: true,
        displayName: true,
        image: true
      }
    });

    console.log(`Found ${profiles.length} profiles with images\n`);

    let fixedCount = 0;

    for (const profile of profiles) {
      if (!profile.image || !Array.isArray(profile.image)) {
        continue;
      }

      // Check if any image URL contains HTTPS
      const needsFix = profile.image.some((url: string) => 
        typeof url === 'string' && url.includes('https://')
      );

      if (needsFix) {
        // Convert all HTTPS URLs to HTTP
        const fixedImages = profile.image.map((url: any) => {
          if (typeof url === 'string' && url.startsWith('https://')) {
            return url.replace('https://', 'http://');
          }
          return url;
        });

        // Update the profile
        await prisma.profile.update({
          where: { id: profile.id },
          data: { image: fixedImages }
        });

        console.log(`✅ Fixed: ${profile.displayName || 'User ' + profile.id}`);
        console.log(`   Before: ${JSON.stringify(profile.image[0]?.substring(0, 60))}...`);
        console.log(`   After:  ${JSON.stringify(fixedImages[0]?.substring(0, 60))}...`);
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} profiles!`);

    if (fixedCount === 0) {
      console.log('✅ All image URLs are already HTTP. Nothing to fix!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixImageUrls()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
