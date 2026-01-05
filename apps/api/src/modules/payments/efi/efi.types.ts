export type EfiOauthTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type EfiCobRequest = {
  calendario: { expiracao: number };
  valor: { original: string };
  chave: string;
  solicitacaoPagador?: string;
  infoAdicionais?: { nome: string; valor: string }[];
};

export type EfiCobResponse = {
  txid: string;
  status?: string;
  calendario?: { expiracao?: number };
  loc?: { id?: number; location?: string };
  location?: string;
};

export type EfiQrCodeResponse = {
  qrcode: string;
  imagemQrcode?: string;
  linkVisualizacao?: string;
};
