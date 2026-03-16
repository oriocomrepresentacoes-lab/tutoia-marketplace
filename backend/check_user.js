const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'teste@teste.com' },
      include: {
        transactions: true,
        ads: true
      }
    });

    if (!user) {
      fs.writeFileSync('user_data.json', JSON.stringify({ error: 'User not found' }, null, 2));
      return;
    }

    fs.writeFileSync('user_data.json', JSON.stringify(user, null, 2));
    console.log('Data written to user_data.json');

  } catch (e) {
    fs.writeFileSync('user_data.json', JSON.stringify({ error: e.message }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

check();
