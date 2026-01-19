'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

const faqSections: FaqSection[] = [
  {
    title: '1. O ECOSSISTEMA MEOWW',
    items: [
      {
        question: 'O que é a Meoww e qual o papel dela na negociação?',
        answer: (
          <>
            <p>
              A Meoww não é uma loja, é um <strong>ecossistema de intermediação</strong>. Nós
              fornecemos a tecnologia e a segurança (Custódia/Escrow) para que jogadores negociem
              ativos digitais entre si. Nós seguramos o dinheiro do comprador e só liberamos ao
              vendedor quando o produto é entregue e validado. Somos o "juiz" que garante que
              ninguém saia no prejuízo.
            </p>
          </>
        ),
      },
      {
        question: 'Por que a Meoww é mais segura que grupos de Facebook/Discord?',
        answer: (
          <>
            <p className="mb-3">Em grupos externos, você conta com a sorte. Na Meoww, você conta com tecnologia.</p>
            <ol className="ml-4 list-decimal space-y-2">
              <li><strong>Custódia Financeira:</strong> O dinheiro fica travado conosco até a finalização do pedido.</li>
              <li><strong>Verificação KYC:</strong> Vendedores passam por checagem de documentos.</li>
              <li><strong>Rastro Digital:</strong> Tudo fica registrado para fins jurídicos em caso de golpes.</li>
            </ol>
          </>
        ),
      },
      {
        question: 'Posso ter mais de uma conta na plataforma?',
        answer: (
          <p>
            <strong>Não.</strong> Nossa política é estrita: 1 CPF = 1 Conta. Nosso sistema de
            segurança detecta contas duplicadas (multi-accounting) e bane todas as envolvidas
            automaticamente para prevenir fraudes e manipulação de avaliações.
          </p>
        ),
      },
    ],
  },
  {
    title: '2. PARA COMPRADORES (JORNADA DE COMPRA)',
    items: [
      {
        question: 'Como funciona a "Garantia de Recebimento"?',
        answer: (
          <p>
            Ao pagar, seu dinheiro <strong>não vai</strong> para o vendedor. Ele fica no cofre da
            Meoww. Após o vendedor entregar o item e você conferir, o saldo é liberado. Se ele não
            entregar, você recebe 100% de volta. Simples assim.
          </p>
        ),
      },
      {
        question: 'O que é "Entrega Automática" vs. "Entrega Manual"?',
        answer: (
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>Automática (Raio):</strong> O sistema da Meoww entrega os dados do produto
              (login/senha ou chave) imediatamente no chat após a aprovação do pagamento, mesmo que
              o vendedor esteja offline.
            </li>
            <li>
              <strong>Manual:</strong> Você precisa aguardar o vendedor ficar online no chat da
              compra para te passar o item ou realizar o serviço.
            </li>
          </ul>
        ),
      },
      {
        question: 'Comprei e me arrependi ou o produto veio com defeito. E agora?',
        answer: (
          <>
            <p className="mb-2">
              Você tem o botão <strong>"Abrir Mediação"</strong> (ou Reclamação). Ao clicar nele, o
              dinheiro congela e nossa equipe de moderação entra no chat para analisar as provas. Se
              o vendedor estiver errado, você é reembolsado.
            </p>
            <p className="text-amber-700 bg-amber-50 p-2 rounded-lg text-sm">
              <strong>Nota:</strong> Não libere o pagamento/avalie positivamente se não tiver
              recebido o produto, pois isso encerra a garantia da Meoww.
            </p>
          </>
        ),
      },
      {
        question: 'Por que existe uma taxa extra em compras pequenas?',
        answer: (
          <p>
            Para compras abaixo de <strong>R$ 25,00</strong>, existe uma pequena taxa operacional de
            processamento. Isso ocorre porque os custos bancários e de gateway para microtransações
            são altos. Acima desse valor, a taxa é zero para o comprador.
          </p>
        ),
      },
    ],
  },
  {
    title: '3. PARA VENDEDORES (JORNADA DE VENDA)',
    items: [
      {
        question: 'Quais são as taxas para vender na Meoww?',
        answer: (
          <p>
            Nós só ganhamos se você ganhar. O cadastro e o anúncio são gratuitos. Cobramos apenas
            uma <strong>Comissão de Sucesso</strong> sobre o valor da venda realizada. A porcentagem
            varia conforme o plano de exposição que você escolher (Padrão, Premium ou Deluxe) no
            momento de criar o anúncio. Consulte a tabela atualizada no seu painel.
          </p>
        ),
      },
      {
        question: 'Quanto tempo demora para eu sacar meu dinheiro?',
        answer: (
          <p>
            Para garantir que a conta vendida não seja recuperada (resgate via suporte do jogo),
            existe um <strong>Ciclo de Liberação</strong> (prazo de retenção). Esse prazo varia de
            acordo com sua reputação e a categoria do produto. Vendedores verificados e com alta
            reputação possuem prazos reduzidos.
          </p>
        ),
      },
      {
        question: 'O que é proibido vender? (Lista Vermelha)',
        answer: (
          <>
            <p className="mb-2">
              Diferente de outros sites, a Meoww preza pela qualidade.{' '}
              <strong>Não aceitamos:</strong>
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Contas NFA (Sem acesso ao e-mail original).</li>
              <li>Pirataria, Contas de Streaming (Netflix/Globo) ou Painéis IPTV.</li>
              <li>Métodos de Apostas, Cartões Clonados ou Scripts de Hack.</li>
            </ul>
            <p className="mt-2 text-red-600 font-semibold">
              Tentar vender esses itens gera banimento imediato.
            </p>
          </>
        ),
      },
      {
        question: 'Como posso divulgar minha loja?',
        answer: (
          <p>
            Use a nossa aba <strong>Comunidade</strong>. Lá você pode postar atualizações sobre seu
            estoque e criar autoridade. Lembre-se: A comunidade é para promover sua loja{' '}
            <strong>dentro</strong> da Meoww. Divulgar links externos gera punição.
          </p>
        ),
      },
    ],
  },
  {
    title: '4. SEGURANÇA E REGRAS DE OURO',
    items: [
      {
        question: 'O que é "Evasão de Chat" e por que isso me bane?',
        answer: (
          <p>
            Se um usuário pedir seu Discord/WhatsApp ou tentar negociar "por fora" para economizar
            taxas, <strong>denuncie</strong>. Se você aceitar ou passar seu contato, nosso sistema
            de inteligência artificial detecta a evasão e bane ambas as partes. Negociar por fora
            remove toda a proteção da Meoww e te deixa vulnerável a golpes.
          </p>
        ),
      },
      {
        question: 'Encontrei um bug no site. Posso usar?',
        answer: (
          <p>
            <strong>Não.</strong> A exploração de falhas (glitches de preço, bugs de cupom, etc.) é
            monitorada. Se você encontrar um erro, reporte ao suporte e poderá ser recompensado (Bug
            Bounty). Se você <strong>abusar</strong> da falha para lucrar, sua conta será banida e
            os valores bloqueados permanentemente.
          </p>
        ),
      },
      {
        question: 'O que acontece se eu for banido?',
        answer: (
          <p>
            O banimento na Meoww é, em regra, <strong>permanente</strong>. Se você foi banido,
            significa que violou gravemente nossos Termos (fraude, preconceito na comunidade, venda
            de item ilícito). Você pode preencher o Formulário de Revisão uma única vez, mas a
            reversão é rara.
          </p>
        ),
      },
    ],
  },
  {
    title: '5. FINANCEIRO E RETIRADAS',
    items: [
      {
        question: 'Quais as formas de saque disponíveis?',
        answer: <p>Trabalhamos exclusivamente com <strong>PIX</strong>. É rápido, seguro e funciona 24/7.</p>,
      },
      {
        question: 'Meu saque foi estornado/cancelado. Por quê?',
        answer: (
          <>
            <p className="mb-2">Geralmente ocorre por dois motivos:</p>
            <ol className="ml-4 list-decimal space-y-2">
              <li>
                <strong>Dados Divergentes:</strong> A Chave Pix deve estar, obrigatoriamente, no
                mesmo CPF cadastrado na conta Meoww. Não pagamos em contas de terceiros (segurança
                contra lavagem de dinheiro).
              </li>
              <li>
                <strong>Verificação Pendente:</strong> Você precisa concluir o envio de documentos
                (RG/CNH) para liberar a função de saque.
              </li>
            </ol>
          </>
        ),
      },
    ],
  },
  {
    title: '6. MEOWW COINS (FIDELIDADE)',
    items: [
      {
        question: 'O que são Meoww Coins?',
        answer: (
          <p>
            É o nosso sistema de <em>cashback</em>. A cada compra realizada, você ganha uma quantia
            de moedas virtuais.
          </p>
        ),
      },
      {
        question: 'Para que servem?',
        answer: (
          <>
            <p className="mb-2">
              Você pode usar seus Meoww Coins para abater o valor de futuras compras (desconto
              direto no carrinho) ou trocar por recompensas exclusivas na loja de skins da
              plataforma.
            </p>
            <p className="text-emerald-700 bg-emerald-50 p-2 rounded-lg text-sm">
              <strong>Dica:</strong> Anúncios de vendedores "Ouro" e "Diamante" dão mais Coins de
              volta.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: '7. SUPORTE E PARCERIAS',
    items: [
      {
        question: 'Como falar com um humano?',
        answer: (
          <p>
            Nossa equipe não usa robôs no atendimento final. Abra um <strong>Ticket de Suporte</strong> através
            do menu do usuário. O prazo de resposta é de até 24h úteis, mas geralmente respondemos
            em minutos.
          </p>
        ),
      },
      {
        question: 'Sou Influencer/Streamer. Quero parceria!',
        answer: (
          <p>
            Adoramos criadores de conteúdo! Envie seu mídia kit para{' '}
            <strong>parcerias@meoww.com.br</strong>. Se seu público tiver fit com nosso mercado,
            entraremos em contato. (Nota: Não usamos este e-mail para suporte).
          </p>
        ),
      },
    ],
  },
];

const FaqItemComponent = ({ item }: { item: FaqItem }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-meow-red/10 bg-white overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-meow-charcoal">{item.question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-meow-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="border-t border-meow-red/10 px-5 py-4 text-sm text-meow-charcoal/80 leading-relaxed">
          {item.answer}
        </div>
      ) : null}
    </div>
  );
};

export default function Page() {
  return (
    <section className="bg-meow-50/50 px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Ajuda &gt; Central de ajuda
        </div>
        <h1 className="mt-6 text-3xl font-black text-meow-charcoal">Central de Ajuda</h1>
        <p className="mt-2 text-sm text-meow-muted">
          Encontre respostas rápidas sobre compras, vendas, pagamentos e muito mais.
        </p>

        <div className="mt-8 space-y-8">
          {faqSections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-4 text-lg font-bold text-meow-charcoal">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <FaqItemComponent key={item.question} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-meow-red/20 bg-white p-6 text-center">
          <h3 className="text-lg font-bold text-meow-charcoal">Não encontrou sua resposta?</h3>
          <p className="mt-2 text-sm text-meow-muted">
            Abra um ticket de suporte e nossa equipe irá te ajudar.
          </p>
          <Link
            href="/conta/tickets"
            className="mt-4 inline-flex rounded-full bg-meow-linear px-6 py-2 text-sm font-bold text-white"
          >
            Abrir ticket de suporte
          </Link>
        </div>
      </div>
    </section>
  );
}
