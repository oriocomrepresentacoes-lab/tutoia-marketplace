import { prisma } from './src/utils/db';

async function main() {
    await prisma.transaction.updateMany({
        data: {
            status: 'APPROVED',
            expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        }
    });
    console.log('All pending transactions were manually approved for testing.');
}

main().catch(console.error);
