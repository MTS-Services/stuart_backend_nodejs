// Run this with: npx ts-node fix-qr-maxscans.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMaxScans() {
  console.log('🔧 Fixing QR Card maxScans...\n');

  try {
    // Get all cards with wrong maxScans
    const wrongCards = await prisma.qRCard.findMany({
      where: {
        maxScans: {
          not: 250
        }
      },
      select: {
        id: true,
        qrCode: true,
        maxScans: true,
        scanCount: true
      }
    });

    console.log(`Found ${wrongCards.length} cards with incorrect maxScans:\n`);
    
    wrongCards.forEach(card => {
      console.log(`  - Card ${card.qrCode.substring(0, 20)}... : maxScans=${card.maxScans} (should be 250), scanCount=${card.scanCount}`);
    });

    if (wrongCards.length === 0) {
      console.log('\n✅ All cards already have maxScans=250. Nothing to fix!');
      return;
    }

    console.log(`\n🔄 Updating ${wrongCards.length} cards to maxScans=250...`);

    // Fix all cards
    const result = await prisma.qRCard.updateMany({
      where: {
        maxScans: {
          not: 250
        }
      },
      data: {
        maxScans: 250
      }
    });

    console.log(`\n✅ Successfully updated ${result.count} cards!`);

    // Verify the fix
    const stillWrong = await prisma.qRCard.count({
      where: {
        maxScans: {
          not: 250
        }
      }
    });

    if (stillWrong === 0) {
      console.log('✅ Verification passed: All cards now have maxScans=250\n');
    } else {
      console.log(`⚠️  Warning: ${stillWrong} cards still have incorrect maxScans\n`);
    }

    // Show summary
    const summary = await prisma.qRCard.groupBy({
      by: ['maxScans'],
      _count: true
    });

    console.log('📊 Current maxScans distribution:');
    summary.forEach(group => {
      console.log(`  - maxScans=${group.maxScans}: ${group._count} cards`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMaxScans()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
