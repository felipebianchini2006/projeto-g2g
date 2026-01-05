const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const hashPassword = (value) => bcrypt.hash(value, 12);

const upsertUser = async ({ email, role, password, payoutPixKey }) => {
  const passwordHash = await hashPassword(password);
  return prisma.user.upsert({
    where: { email },
    update: { role, passwordHash, payoutPixKey },
    create: {
      email,
      role,
      passwordHash,
      payoutPixKey,
    },
  });
};

async function main() {
  const admin = await upsertUser({
    email: 'admin@email.com',
    role: 'ADMIN',
    password: '12345678',
  });
  const seller = await upsertUser({
    email: 'seller@email.com',
    role: 'SELLER',
    password: '12345678',
    payoutPixKey: 'pix-key-seller',
  });
  const buyer = await upsertUser({
    email: 'buyer@email.com',
    role: 'USER',
    password: '12345678',
  });

  const categories = [
    {
      name: 'Consoles',
      slug: 'consoles',
      description: 'Colecao de consoles e bundles gamer.',
    },
    {
      name: 'Perifericos',
      slug: 'perifericos',
      description: 'Teclados, mouses, headsets e mais.',
    },
    {
      name: 'Colecionaveis',
      slug: 'colecionaveis',
      description: 'Itens especiais e edicoes limitadas.',
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
  }

  const consoleCategory = await prisma.category.findUnique({
    where: { slug: 'consoles' },
  });
  const peripheralCategory = await prisma.category.findUnique({
    where: { slug: 'perifericos' },
  });

  if (!consoleCategory || !peripheralCategory) {
    throw new Error('Categorias base nao encontradas.');
  }

  const listingAuto = await prisma.listing.upsert({
    where: { slug: 'console-neon' },
    update: {
      title: 'Console Neon',
      description: 'Bundle premium com design compacto e desempenho silencioso.',
      priceCents: 424900,
      status: 'PUBLISHED',
      deliverySlaHours: 24,
      refundPolicy: 'Reembolso disponivel em ate 7 dias apos a compra.',
    },
    create: {
      sellerId: seller.id,
      categoryId: consoleCategory.id,
      title: 'Console Neon',
      slug: 'console-neon',
      description: 'Bundle premium com design compacto e desempenho silencioso.',
      priceCents: 424900,
      currency: 'BRL',
      status: 'PUBLISHED',
      deliveryType: 'AUTO',
      deliverySlaHours: 24,
      refundPolicy: 'Reembolso disponivel em ate 7 dias apos a compra.',
    },
  });

  const listingManual = await prisma.listing.upsert({
    where: { slug: 'teclado-rgb-pro' },
    update: {
      title: 'Teclado RGB Pro',
      description: 'Switches mecanicos, RGB personalizavel e base em aluminio.',
      priceCents: 31900,
      status: 'PUBLISHED',
      deliverySlaHours: 48,
      refundPolicy: 'Reembolso sob analise quando a entrega for manual.',
    },
    create: {
      sellerId: seller.id,
      categoryId: peripheralCategory.id,
      title: 'Teclado RGB Pro',
      slug: 'teclado-rgb-pro',
      description: 'Switches mecanicos, RGB personalizavel e base em aluminio.',
      priceCents: 31900,
      currency: 'BRL',
      status: 'PUBLISHED',
      deliveryType: 'MANUAL',
      deliverySlaHours: 48,
      refundPolicy: 'Reembolso sob analise quando a entrega for manual.',
    },
  });

  await prisma.listingMedia.deleteMany({ where: { listingId: listingAuto.id } });
  await prisma.listingMedia.createMany({
    data: [
      {
        listingId: listingAuto.id,
        url: '/assets/meoow/highlight-01.webp',
        type: 'IMAGE',
        position: 0,
      },
    ],
  });

  await prisma.listingMedia.deleteMany({ where: { listingId: listingManual.id } });
  await prisma.listingMedia.createMany({
    data: [
      {
        listingId: listingManual.id,
        url: '/assets/meoow/highlight-02.webp',
        type: 'IMAGE',
        position: 0,
      },
    ],
  });

  await prisma.inventoryItem.deleteMany({ where: { listingId: listingAuto.id } });
  await prisma.inventoryItem.createMany({
    data: [
      { listingId: listingAuto.id, code: 'KEY-NEON-001', status: 'AVAILABLE' },
      { listingId: listingAuto.id, code: 'KEY-NEON-002', status: 'AVAILABLE' },
      { listingId: listingAuto.id, code: 'KEY-NEON-003', status: 'AVAILABLE' },
    ],
  });

  const orderId = 'seed-order-1';
  const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });

  if (!existingOrder) {
    await prisma.order.create({
      data: {
        id: orderId,
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'PAID',
        totalAmountCents: listingAuto.priceCents,
        currency: 'BRL',
        items: {
          create: [
            {
              id: 'seed-order-item-1',
              listingId: listingAuto.id,
              sellerId: seller.id,
              title: listingAuto.title,
              unitPriceCents: listingAuto.priceCents,
              quantity: 1,
              deliveryType: listingAuto.deliveryType,
              currency: 'BRL',
            },
          ],
        },
        events: {
          create: [
            {
              id: 'seed-order-event-1',
              type: 'CREATED',
              userId: buyer.id,
              payload: { seed: true },
              metadata: { from: null, to: 'CREATED' },
            },
            {
              id: 'seed-order-event-2',
              type: 'PAID',
              userId: buyer.id,
              payload: { seed: true },
              metadata: { from: 'CREATED', to: 'PAID' },
            },
          ],
        },
      },
    });
  }

  const payment = await prisma.payment.upsert({
    where: { txid: 'seed-txid-0001' },
    update: { status: 'CONFIRMED' },
    create: {
      id: 'seed-payment-1',
      orderId,
      payerId: buyer.id,
      provider: 'EFI',
      txid: 'seed-txid-0001',
      status: 'CONFIRMED',
      amountCents: listingAuto.priceCents,
      currency: 'BRL',
      paidAt: new Date(),
    },
  });

  await prisma.ledgerEntry.upsert({
    where: { id: 'seed-ledger-1' },
    update: { status: 'POSTED' },
    create: {
      id: 'seed-ledger-1',
      userId: seller.id,
      orderId,
      paymentId: payment.id,
      type: 'HELD',
      status: 'POSTED',
      amountCents: listingAuto.priceCents,
      currency: 'BRL',
      description: 'Seed held funds',
    },
  });

  const chatRoomId = 'seed-chat-room-1';
  const chatRoom = await prisma.chatRoom.findUnique({ where: { id: chatRoomId } });
  if (!chatRoom) {
    await prisma.chatRoom.create({ data: { id: chatRoomId, orderId } });
    await prisma.chatMessage.create({
      data: {
        roomId: chatRoomId,
        senderId: buyer.id,
        type: 'TEXT',
        content: 'Ola, obrigado pela entrega rapida!',
      },
    });
  }

  const ticketId = 'seed-ticket-1';
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    await prisma.ticket.create({
      data: {
        id: ticketId,
        orderId,
        openedById: buyer.id,
        status: 'OPEN',
        subject: 'Duvida sobre o pedido',
        messages: {
          create: [
            {
              senderId: buyer.id,
              message: 'Como acesso a entrega automatica?',
            },
          ],
        },
      },
    });
  }

  await prisma.notification.upsert({
    where: { id: 'seed-notification-1' },
    update: {
      userId: buyer.id,
      type: 'ORDER',
      title: 'Pedido confirmado',
      body: 'Seu pedido foi confirmado e esta em processamento.',
    },
    create: {
      id: 'seed-notification-1',
      userId: buyer.id,
      type: 'ORDER',
      title: 'Pedido confirmado',
      body: 'Seu pedido foi confirmado e esta em processamento.',
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 'seed-audit-1' },
    update: {
      adminId: admin.id,
      action: 'CREATE',
      entityType: 'listing',
      entityId: listingAuto.id,
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      payload: { seed: true },
    },
    create: {
      id: 'seed-audit-1',
      adminId: admin.id,
      action: 'CREATE',
      entityType: 'listing',
      entityId: listingAuto.id,
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      payload: { seed: true },
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
