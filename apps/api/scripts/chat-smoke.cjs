const { randomUUID } = require('crypto');
const { io } = require('socket.io-client');

const DEFAULT_BASE_URL = 'http://localhost:3001';
const DEFAULT_TIMEOUT_MS = 8000;

const baseUrl = process.env.API_BASE_URL || process.argv[2] || DEFAULT_BASE_URL;
const timeoutMs = Number(process.env.CHAT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
const chatUrl = `${baseUrl}/chat`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (method, path, token, body) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${path}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(chatUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connection timed out.'));
    }, timeoutMs);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });

const emitWithAck = (socket, event, payload) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event} ack.`));
    }, timeoutMs);

    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });

    socket.once('exception', (error) => {
      clearTimeout(timer);
      reject(new Error(error?.message || error?.error || 'Socket exception.'));
    });
  });

const waitForEvent = (socket, event) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}.`));
    }, timeoutMs);

    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const main = async () => {
  console.log('== Chat smoke test ==');
  console.log(`Base URL: ${baseUrl}`);

  console.log('== Login seed users ==');
  const admin = await request('POST', '/auth/login', null, {
    email: 'admin@email.com',
    password: '12345678',
  });
  const seller = await request('POST', '/auth/login', null, {
    email: 'seller@email.com',
    password: '12345678',
  });
  const buyer = await request('POST', '/auth/login', null, {
    email: 'buyer@email.com',
    password: '12345678',
  });

  console.log('== Fetch seller listings ==');
  const listings = await request(
    'GET',
    '/listings?status=PUBLISHED',
    seller.accessToken,
  );
  const list = Array.isArray(listings) ? listings : [];
  if (list.length === 0) {
    throw new Error('No published listings for seller.');
  }
  const listing = list[0];
  console.log(`Using listing: ${listing.id}`);

  console.log('== Create order (buyer) ==');
  const order = await request('POST', '/orders', buyer.accessToken, {
    listingId: listing.id,
    quantity: 1,
  });
  const orderId = order.id;
  console.log(`Order created: ${orderId}`);

  console.log('== Register outsider user ==');
  const outsiderEmail = `outsider-${randomUUID()}@test.com`;
  const outsider = await request('POST', '/auth/register', null, {
    email: outsiderEmail,
    password: 'password123',
  });

  console.log('== Connect buyer/seller sockets ==');
  const buyerSocket = await connectSocket(buyer.accessToken);
  const sellerSocket = await connectSocket(seller.accessToken);

  console.log('== Join room ==');
  await emitWithAck(buyerSocket, 'joinRoom', orderId);
  await emitWithAck(sellerSocket, 'joinRoom', orderId);

  console.log('== Send and receive message ==');
  const messageText = `hello ${Date.now()}`;
  const messageEvent = waitForEvent(sellerSocket, 'messageCreated');
  const messageAck = await emitWithAck(buyerSocket, 'sendMessage', {
    orderId,
    text: messageText,
  });
  const messageBroadcast = await messageEvent;

  if (messageAck?.text !== messageText || messageBroadcast?.text !== messageText) {
    throw new Error('Message payload mismatch.');
  }
  console.log('Message created and broadcast OK.');

  console.log('== Verify outsider blocked ==');
  const outsiderSocket = await connectSocket(outsider.accessToken);
  const blockPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Expected outsider to be blocked.'));
    }, timeoutMs);

    outsiderSocket.once('exception', (error) => {
      clearTimeout(timer);
      resolve(error);
    });
  });
  outsiderSocket.emit('joinRoom', orderId);
  await blockPromise;

  buyerSocket.disconnect();
  sellerSocket.disconnect();
  outsiderSocket.disconnect();

  console.log('== Done ==');
};

main().catch(async (error) => {
  console.error('Chat smoke failed:', error?.message || error);
  await sleep(200);
  process.exit(1);
});
