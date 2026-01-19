import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Institucional &gt; Termos de uso
        </div>
        <h1 className="mt-6 text-3xl font-black text-meow-charcoal">
          Termos e Condições Gerais de Uso
        </h1>
        <p className="mt-2 text-sm text-meow-muted">
          Última atualização: 18 de Janeiro de 2026.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-meow-charcoal/90">
          <p>
            Bem-vindo à <strong>Meoww</strong>. Este documento regula a relação contratual entre a{' '}
            <strong>MEOWW INTERMEDIAÇÕES DIGITAIS LTDA</strong> (doravante referida como "MEOWW" ou
            "PLATAFORMA") e você (doravante referido como "USUÁRIO"), estabelecendo as regras para
            utilização do nosso ecossistema de intermediação de ativos digitais.
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <strong>AVISO LEGAL:</strong> Ao criar uma conta ou utilizar qualquer serviço da Meoww,
            o Usuário declara ter lido, compreendido e aceito integralmente as cláusulas abaixo.
            Caso não concorde com qualquer disposição, o Usuário deve abster-se de utilizar a
            Plataforma imediatamente.
          </div>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              1. NATUREZA DO SERVIÇO E DEFINIÇÕES
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>1.1. O Papel da Meoww:</strong> A Meoww não é fornecedora de produtos, nem
                proprietária dos itens anunciados. Atuamos exclusivamente como uma{' '}
                <strong>prestadora de serviços de intermediação</strong>, conectando vendedores
                independentes e compradores interessados em ativos digitais (contas de jogos, chaves
                de ativação, itens virtuais, etc.) e fornecendo a tecnologia de custódia de
                pagamento (escrow) para segurança das partes.
              </p>
              <p>
                <strong>1.2. Capacidade Civil:</strong> O serviço é restrito a pessoas físicas
                residentes no Brasil, portadoras de CPF regular e com capacidade civil plena
                (maiores de 18 anos ou emancipados). Menores de idade só poderão utilizar a
                plataforma se devidamente assistidos ou representados por seus tutores legais, que
                responderão solidariamente por quaisquer atos praticados.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              2. CREDENCIAIS, ACESSO E SEGURANÇA DA CONTA
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>2.1. Unicidade de Cadastro:</strong> É permitido apenas 1 (um) cadastro por
                CPF. A Meoww utiliza sistemas avançados de "fingerprinting" digital. A detecção de
                múltiplas contas vinculadas ao mesmo indivíduo resultará no banimento de todas as
                contas envolvidas.
              </p>
              <p>
                <strong>2.2. Intransferibilidade:</strong> A conta de Usuário (User ID) é uma
                licença de uso pessoal, intransferível e não comercializável. É estritamente
                proibido vender, alugar ou emprestar sua conta Meoww a terceiros.
              </p>
              <p>
                <strong>2.3. Veracidade dos Dados:</strong> O Usuário garante que todas as
                informações fornecidas (Nome, Endereço, Data de Nascimento) são exatas e
                verdadeiras. A Meoww reserva-se o direito de solicitar, a qualquer momento, prova de
                identidade (KYC) através de envio de documentos físicos originais (RG, CNH).
                Documentos digitais ou cópias não autenticadas poderão ser rejeitados.
              </p>
              <p>
                <strong>2.4. Segurança de Acesso:</strong> O uso de VPNs, Proxies, Rede TOR ou
                navegadores "Anti-Detect" (como Dolphin, Incogniton, etc.) é proibido, pois mascara
                a real localização e identidade do usuário, violando nossos protocolos de segurança.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              3. POLÍTICA DE ANÚNCIOS E COMERCIALIZAÇÃO
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>3.1. Responsabilidade do Anunciante:</strong> Ao criar um anúncio, o
                Vendedor declara possuir a titularidade, posse legítima e o direito de venda do
                ativo digital. O Vendedor é o único responsável pela entrega, qualidade, procedência
                e garantia do item.
              </p>
              <p>
                <strong>3.2. Venda de Bens Digitais Usados:</strong> O Vendedor reconhece que a
                transação, em sua maioria, trata-se de venda de bens digitais usados entre
                particulares. Cabe ao Vendedor o cumprimento de obrigações tributárias e fiscais
                decorrentes de suas vendas.
              </p>
              <p>
                <strong>3.3. Proibição de "Evasão de Chat":</strong> É terminantemente proibido
                utilizar o chat ou campos de perguntas da Meoww para divulgar contatos externos
                (WhatsApp, Discord, Facebook, E-mail) ou direcionar a transação para fora da
                plataforma. A detecção desta prática acarretará na suspensão imediata da conta.
              </p>
              <p>
                <strong>3.4. Integridade do Anúncio:</strong> É vedado alterar o produto ofertado
                dentro de um mesmo anúncio após a realização de vendas (ex: vender uma conta de
                "Jogo A" e depois editar o mesmo anúncio para vender "Jogo B" para aproveitar a
                reputação). Anúncios devem ser individuais e específicos.
              </p>
              <p>
                <strong>3.5. Propósito da Comunidade:</strong> A Meoww disponibiliza um espaço de
                "Comunidade" (Feed/Fórum) com o objetivo exclusivo de fomentar o ecossistema da
                plataforma. Este espaço deve ser utilizado pelos Vendedores estritamente para a
                divulgação lícita de sua própria loja (vitrine virtual) e para a interação saudável
                entre usuários sobre o mercado de games e ativos digitais.
              </p>
              <p>
                <strong>3.6. Tolerância Zero para Discriminação:</strong> A Meoww preza pela
                diversidade e respeito. É estritamente proibido publicar conteúdo, comentários ou
                imagens que incitem ódio, preconceito ou discriminação com base em: Origem étnica,
                raça ou cor; Orientação sexual ou identidade de gênero; Religião, crença ou
                convicção política; Condição física ou nacionalidade.
              </p>
              <p className="rounded-lg bg-red-50 p-3 text-red-700">
                <strong>Sanção:</strong> A violação desta cláusula, confirmada por denúncia (report)
                e verificada pela moderação, resultará no BANIMENTO PERMANENTE e irreversível da
                conta do infrator, sem prejuízo da colaboração com as autoridades competentes
                conforme a legislação brasileira (Lei nº 7.716/89 e equiparados).
              </p>
              <p>
                <strong>3.7. Conteúdo Ilícito na Comunidade:</strong> É vedada a utilização da
                Comunidade para apologia a crimes, divulgação de pornografia, venda de substâncias
                ilícitas ou qualquer atividade que afronte a moral e os bons costumes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              4. ESTRUTURA DE TARIFAS E FATURAMENTO
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>4.1. Gratuidade para Compradores:</strong> O acesso e a navegação na Meoww
                são gratuitos para compradores, ressalvadas taxas operacionais específicas descritas
                abaixo.
              </p>
              <p>
                <strong>4.2. Comissionamento de Vendas:</strong> O Vendedor concorda em pagar à
                Meoww uma <strong>Taxa de Intermediação</strong> sobre o valor final de cada venda
                concluída, conforme o plano de exposição escolhido no momento do anúncio (ex: Plano
                Standard, Plano Pro, Plano Elite). As alíquotas vigentes estão disponíveis no painel
                de controle do vendedor e podem sofrer reajustes mediante aviso prévio.
              </p>
              <p>
                <strong>4.3. Taxa de Processamento de Pequeno Valor:</strong> Para cobrir custos
                bancários e de gateways parceiros, compras com valor total inferior a{' '}
                <strong>R$ 25,00 (Vinte e cinco reais)</strong> sofrerão a incidência de uma "Taxa
                de Processamento". Esta taxa é apresentada no checkout e não é reembolsável em caso
                de cancelamento da compra por arrependimento, visto que o serviço de processamento
                financeiro foi executado.
              </p>
              <p>
                <strong>4.4. Retenção Preventiva:</strong> A Meoww reserva-se o direito de reter
                saldos de vendas por até 180 dias em casos de:
              </p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Suspeita de fraude ou lavagem de dinheiro;</li>
                <li>Alto índice de disputas/reclamações (Chargebacks);</li>
                <li>
                  Denúncias de recuperação de contas vendidas (Recuperação via suporte do jogo).
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              5. LISTA RESTRITIVA (ITENS E CONDUTAS PROIBIDAS)
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                Para garantir a legalidade e a "saúde" do ecossistema, é{' '}
                <strong>expressamente proibido</strong> anunciar ou solicitar:
              </p>
              <ol className="ml-6 list-decimal space-y-2">
                <li>
                  <strong>Ferramentas de Trapaça:</strong> Hacks, Cheats, Aimbots, Scripts, Macros
                  ou qualquer software que viole os Termos de Serviço de terceiros.
                </li>
                <li>
                  <strong>Fraude Financeira:</strong> Cartões clonados (CC), Bins, Métodos de
                  aprovação, Contas bancárias de laranjas.
                </li>
                <li>
                  <strong>Conteúdo Pirata:</strong> Cursos rateados, E-books sem licença de revenda,
                  Software crackeado.
                </li>
                <li>
                  <strong>Acesso Ilegítimo:</strong> Contas obtidas via Brute Force, Phishing ou NFA
                  (Non-Full Access/Sem acesso ao e-mail original).
                </li>
                <li>
                  <strong>Serviços de Streaming Irregulares:</strong> Listas IPTV, Painéis de
                  revenda de canais, contas compartilhadas de serviços como Globoplay, Netflix, etc.
                </li>
                <li>
                  <strong>Aleatoriedade:</strong> Produtos do tipo "Mystery Box" ou "Key Aleatória"
                  onde o comprador não sabe exatamente o que está adquirindo (salvo categorias
                  explicitamente permitidas pela moderação).
                </li>
                <li>
                  <strong>Moedas de Jogos Específicas:</strong> Robux (Roblox) ou outros itens que
                  violem diretamente a economia dos jogos conforme diretrizes internas da Meoww.
                </li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              6. SISTEMA DE PROTEÇÃO E RESOLUÇÃO DE DISPUTAS
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>6.1. Intervenção Moderadora:</strong> Em caso de divergência entre Comprador
                e Vendedor, qualquer parte poderá acionar a "Mediação Meoww". Neste ato, o Usuário
                concede à equipe de moderação da Meoww poderes de arbitragem para decidir o destino
                dos valores transacionados (liberação ao vendedor ou reembolso ao comprador).
              </p>
              <p>
                <strong>6.2. Provas e Evidências:</strong> A decisão da mediação será baseada
                exclusivamente nas provas contidas <strong>dentro da plataforma</strong> (logs de
                chat, entrega automática, vídeo da compra). Acordos ou provas geradas em aplicativos
                externos (Discord, WhatsApp) não serão considerados válidos.
              </p>
              <p>
                <strong>6.3. Prazo de Garantia:</strong> O Comprador deve conferir o produto digital
                imediatamente após o recebimento. A liberação dos valores ao Vendedor ocorre após a
                confirmação de recebimento ou decurso do prazo automático. Após a liberação do saldo
                ao Vendedor, a Meoww encerra sua responsabilidade de custódia, e qualquer problema
                futuro (ex: recuperação de conta após 3 meses) deverá ser tratado diretamente entre
                as partes, salvo dolo comprovado do vendedor.
              </p>
              <p>
                <strong>6.4. Chargebacks Indevidos:</strong> O Usuário que realizar contestação de
                pagamento junto ao cartão de crédito (Chargeback) após ter recebido o produto será
                processado judicialmente por fraude e enriquecimento ilícito, além de ter seus dados
                inseridos em listas de restrição de crédito e a conta banida permanentemente.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              7. LIMITAÇÃO DE RESPONSABILIDADE CIVIL
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>7.1. Isenção Tecnológica:</strong> A Meoww não garante que a plataforma
                estará livre de erros, interrupções ou bugs, nem que os servidores estão livres de
                componentes nocivos. O serviço é fornecido "no estado em que se encontra" (as is).
              </p>
              <p>
                <strong>7.2. Responsabilidade por Terceiros:</strong> A Meoww não se responsabiliza
                por:
              </p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Danos causados por conduta de terceiros ou outros usuários;</li>
                <li>
                  Bans aplicados pelas desenvolvedoras de jogos (Riot, Valve, Epic Games, etc.) nas
                  contas comercializadas. O Comprador assume inteiramente o risco de que a compra e
                  venda de contas pode violar os termos da desenvolvedora do jogo (EULA).
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">
              8. PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)
            </h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>8.1. Tratamento de Dados:</strong> Ao utilizar a Meoww, o Usuário consente
                com a coleta e tratamento de seus dados (IP, Device ID, Documentos, Histórico de
                Transações) para fins de:
              </p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Execução do contrato de intermediação;</li>
                <li>Prevenção à fraude e segurança (Legítimo Interesse);</li>
                <li>Cumprimento de obrigações legais (Marco Civil da Internet e normas fiscais).</li>
              </ul>
              <p>
                <strong>8.2. Compartilhamento Judicial:</strong> A Meoww coopera ativamente com
                autoridades policiais e judiciais. Dados de usuários envolvidos em fraudes,
                estelionato ou venda de produtos ilícitos serão entregues às autoridades mediante
                requisição, independentemente de ordem judicial prévia quando houver flagrante
                delito ou risco iminente.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-meow-charcoal">9. DISPOSIÇÕES FINAIS E FORO</h2>
            <div className="mt-4 space-y-3">
              <p>
                <strong>9.1. Alterações:</strong> A Meoww pode alterar estes termos a qualquer
                momento. O uso contínuo da plataforma após as alterações implica na aceitação tácita
                dos novos termos.
              </p>
              <p>
                <strong>9.2. Comunicação:</strong> O canal oficial de suporte é o sistema de
                "Tickets" dentro da plataforma.
              </p>
              <p>
                <strong>9.3. Foro de Eleição:</strong> Para dirimir quaisquer dúvidas ou litígios
                oriundos deste contrato, as partes elegem, com renúncia a qualquer outro, o Foro da
                Comarca de <strong>[CIDADE DE SUA EMPRESA] - [UF]</strong>, Brasil.
              </p>
            </div>
          </section>

          <div className="rounded-xl border border-meow-red/20 bg-meow-50 p-4 text-center text-meow-charcoal">
            Ao clicar em "Criar Conta" ou "Aceitar", você confirma que leu e concorda com todos os
            termos acima descritos pela Meoww.
          </div>
        </div>
      </div>
    </section>
  );
}
