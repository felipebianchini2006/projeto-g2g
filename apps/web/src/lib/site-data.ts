export const navItems = [
  { label: 'Nintendo', href: '#' },
  { label: 'PlayStation', href: '#' },
  { label: 'Xbox', href: '#' },
  { label: 'Colecionaveis', href: '#' },
  { label: 'Pre-vendas', href: '#' },
  { label: 'Ofertas da Semana', href: '#', highlight: true },
] as const;

export const features = [
  { title: 'Frete gratis', subtitle: 'acima de R$349' },
  { title: 'Descontos felinos', subtitle: 'para lojistas' },
  { title: 'Atendimento humano', subtitle: 'suporte de verdade' },
  { title: 'Compra segura', subtitle: 'loja oficial' },
] as const;

export const franchises = [
  { name: 'Animal Crossing', image: '/assets/meoow/cat-01.png' },
  { name: 'The Legend of Zelda', image: '/assets/meoow/cat-02.png' },
  { name: 'Pokemon', image: '/assets/meoow/cat-03.png' },
  { name: 'Kirby', image: '/assets/meoow/highlight-01.webp' },
  { name: 'Metroid', image: '/assets/meoow/highlight-02.webp' },
  { name: 'Splatoon', image: '/assets/meoow/highlight-03.webp' },
] as const;

export type ProductVariant = 'red' | 'dark';

export type Product = {
  name: string;
  description: string;
  oldPrice: string;
  discount: string;
  currentPrice: string;
  variant: ProductVariant;
  image: string;
  autoDelivery: boolean;
};

export const products: Product[] = [
  {
    name: 'Console Neon',
    description: 'Bundle premium com design compacto e desempenho silencioso.',
    oldPrice: 'R$ 4.999,00',
    discount: '-15%',
    currentPrice: 'R$ 4.249,00',
    variant: 'red',
    image: '/assets/meoow/highlight-01.webp',
    autoDelivery: true,
  },
  {
    name: 'Teclado RGB Pro',
    description: 'Switches mecanicos, RGB personalizavel e base em aluminio.',
    oldPrice: 'R$ 399,00',
    discount: '-20%',
    currentPrice: 'R$ 319,00',
    variant: 'dark',
    image: '/assets/meoow/highlight-02.webp',
    autoDelivery: true,
  },
  {
    name: 'Headset Aurora',
    description: 'Som 7.1, microfone removivel e isolamento confortavel.',
    oldPrice: 'R$ 459,00',
    discount: '-12%',
    currentPrice: 'R$ 399,00',
    variant: 'red',
    image: '/assets/meoow/highlight-03.webp',
    autoDelivery: true,
  },
  {
    name: 'Mouse Pulse',
    description: 'Sensor de alta precisao com 8 botoes programaveis.',
    oldPrice: 'R$ 189,00',
    discount: '-18%',
    currentPrice: 'R$ 155,00',
    variant: 'dark',
    image: '/assets/meoow/highlight-01.webp',
    autoDelivery: true,
  },
  {
    name: 'Controle Pro',
    description: 'Gatilhos adaptativos e empunhadura emborrachada.',
    oldPrice: 'R$ 499,00',
    discount: '-10%',
    currentPrice: 'R$ 449,00',
    variant: 'red',
    image: '/assets/meoow/highlight-02.webp',
    autoDelivery: true,
  },
  {
    name: 'Cadeira Pulse XL',
    description: 'Ergonomia premium com ajuste completo e suporte lombar.',
    oldPrice: 'R$ 1.699,00',
    discount: '-25%',
    currentPrice: 'R$ 1.279,00',
    variant: 'dark',
    image: '/assets/meoow/highlight-03.webp',
    autoDelivery: true,
  },
  {
    name: 'Monitor Ultra 27',
    description: '144Hz, painel IPS e bordas ultrafinas para setups clean.',
    oldPrice: 'R$ 1.899,00',
    discount: '-14%',
    currentPrice: 'R$ 1.639,00',
    variant: 'red',
    image: '/assets/meoow/highlight-01.webp',
    autoDelivery: true,
  },
  {
    name: 'Soundbar Lite',
    description: 'Graves potentes com perfil fino para salas compactas.',
    oldPrice: 'R$ 699,00',
    discount: '-22%',
    currentPrice: 'R$ 545,00',
    variant: 'dark',
    image: '/assets/meoow/highlight-02.webp',
    autoDelivery: true,
  },
  {
    name: 'Router Warp',
    description: 'Wi-Fi 6 com baixa latencia para partidas online.',
    oldPrice: 'R$ 599,00',
    discount: '-17%',
    currentPrice: 'R$ 499,00',
    variant: 'red',
    image: '/assets/meoow/highlight-03.webp',
    autoDelivery: true,
  },
  {
    name: 'Kit Stream Pro',
    description: 'Webcam 4K, luz LED e microfone condensador.',
    oldPrice: 'R$ 1.299,00',
    discount: '-19%',
    currentPrice: 'R$ 1.059,00',
    variant: 'dark',
    image: '/assets/meoow/highlight-01.webp',
    autoDelivery: true,
  },
  {
    name: 'SSD Turbo 1TB',
    description: 'Velocidade extrema para carregar jogos em segundos.',
    oldPrice: 'R$ 649,00',
    discount: '-13%',
    currentPrice: 'R$ 565,00',
    variant: 'red',
    image: '/assets/meoow/highlight-02.webp',
    autoDelivery: true,
  },
  {
    name: 'Colecionavel Pixel',
    description: 'Figura especial com acabamento premium e base iluminada.',
    oldPrice: 'R$ 299,00',
    discount: '-16%',
    currentPrice: 'R$ 249,00',
    variant: 'dark',
    image: '/assets/meoow/highlight-03.webp',
    autoDelivery: true,
  },
];