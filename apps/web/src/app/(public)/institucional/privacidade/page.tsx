import Link from 'next/link';

export default function Page() {
  return (
    <section className="bg-white px-6 py-12">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="text-xs text-meow-muted">
          <Link href="/" className="font-semibold text-meow-deep">
            Inicio
          </Link>{' '}
          &gt; Institucional &gt; Politica de privacidade
        </div>
        <h1 className="mt-6 text-2xl font-black text-meow-charcoal">
          POLÍTICA DE TRANSPARÊNCIA E PRIVACIDADE
        </h1>
        <p className="mt-4 text-sm text-meow-muted">
          Na <strong>Meoww</strong>, acreditamos que a confiança é a base de qualquer
          negociação. Este documento explica, de forma resumida e honesta, como
          tratamos as informações que você compartilha conosco ao usar nosso marketplace.
        </p>

        <h2 className="mt-8 text-lg font-black text-meow-charcoal">1. O QUE NÓS COLETAMOS (E QUANDO)</h2>
        <p className="mt-3 text-sm text-meow-muted">
          Nós só pedimos o que é essencial para o site funcionar e para garantir que você não caia em golpes.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-meow-muted">
          <li>
            <strong>Quando você navega:</strong> Mesmo sem logar, nossos sistemas identificam informações básicas do
            seu dispositivo (tipo de celular/computador, localização aproximada e navegador). Isso serve para ajustar
            o site à sua tela e garantir que o acesso é legítimo.
          </li>
          <li>
            <strong>Quando você cria conta:</strong> Precisamos saber quem você é. Coletamos seu <strong>Nome, CPF,
            Data de Nascimento, E-mail e Celular</strong>. Esses dados são sua "identidade digital" dentro da Meoww.
          </li>
          <li>
            <strong>Quando você compra ou vende:</strong> Para processar pagamentos, coletamos dados transacionais.
            <strong> Importante:</strong> Nós não guardamos os números completos do seu cartão de crédito. Quem faz isso
            são os parceiros financeiros (bancos e gateways), que possuem segurança específica para isso.
          </li>
        </ul>

        <h2 className="mt-8 text-lg font-black text-meow-charcoal">2. PARA QUE USAMOS ESSES DADOS?</h2>
        <p className="mt-3 text-sm text-meow-muted">Não vendemos seus dados para ninguém. Usamos suas informações apenas para:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-meow-muted">
          <li>
            <strong>Segurança (Anti-Fraude):</strong> O mercado digital exige cuidado. Cruzamos seus dados para garantir
            que você é você mesmo e impedir que fraudadores usem cartões clonados ou contas falsas.
          </li>
          <li>
            <strong>Processar Pedidos:</strong> Precisamos saber quem pagou e quem deve receber o produto ou o dinheiro.
          </li>
          <li>
            <strong>Suporte:</strong> Se você tiver um problema, nossa equipe precisa acessar seu histórico para ajudar
            a resolver a disputa.
          </li>
          <li>
            <strong>Cumprir a Lei:</strong> Somos uma empresa brasileira e precisamos guardar registros de acesso e
            vendas para prestar contas à Receita Federal e obedecer ao Marco Civil da Internet.
          </li>
        </ol>

        <h2 className="mt-8 text-lg font-black text-meow-charcoal">3. COMO PROTEGEMOS VOCÊ?</h2>
        <p className="mt-3 text-sm text-meow-muted">
          Pode ficar tranquilo. Tratamos seus dados como se fossem nossos.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-meow-muted">
          <li>
            <strong>Cofre Digital:</strong> Utilizamos tecnologia de proteção de nível bancário. Todas as informações
            que viajam do seu computador até nossos servidores são "embaralhadas" (criptografia), tornando impossível
            que terceiros as leiam no caminho.
          </li>
          <li>
            <strong>Acesso Restrito:</strong> Dentro da Meoww, apenas funcionários autorizados e com necessidade real
            podem ver seus dados.
          </li>
          <li>
            <strong>Monitoramento 24h:</strong> Nossos sistemas vigiam atividades suspeitas o tempo todo para bloquear
            tentativas de invasão.
          </li>
        </ul>

        <h2 className="mt-8 text-lg font-black text-meow-charcoal">4. COM QUEM COMPARTILHAMOS?</h2>
        <p className="mt-3 text-sm text-meow-muted">
          Seus dados não saem da Meoww, exceto em três situações obrigatórias:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-meow-muted">
          <li><strong>Parceiros de Pagamento:</strong> Para que o dinheiro saia da sua conta e chegue ao vendedor.</li>
          <li><strong>Ferramentas de Verificação:</strong> Usamos serviços externos apenas para validar se o seu CPF e sua identidade são verdadeiros (KYC).</li>
          <li><strong>Justiça e Polícia:</strong> Se recebermos uma ordem judicial ou identificarmos um crime flagrante (como fraude, estelionato ou pirataria), colaboramos total e imediatamente com as autoridades, fornecendo os dados dos envolvidos.</li>
        </ul>

        <h2 className="mt-8 text-lg font-black text-meow-charcoal">5. SEUS DIREITOS</h2>
        <p className="mt-3 text-sm text-meow-muted">
          Você é o dono dos seus dados. Pelo painel da sua conta, você pode:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-meow-muted">
          <li><strong>Atualizar:</strong> Corrigir informações que mudaram (como endereço ou telefone).</li>
          <li><strong>Consultar:</strong> Ver o histórico do que você fez na plataforma.</li>
          <li><strong>Sair:</strong> Você pode solicitar a exclusão da sua conta.</li>
        </ul>
        <p className="mt-3 text-sm text-meow-muted">
          <strong>Atenção:</strong> Se você tiver vendas pendentes, saldo na carteira ou histórico de fraudes/disputas,
          a exclusão não será imediata. Manteremos os dados bloqueados pelo tempo exigido por lei para garantir a
          segurança jurídica de todos.
        </p>

        <h2 className="mt-8 text-lg font-black text-meow-charcoal">6. COOKIES</h2>
        <p className="mt-3 text-sm text-meow-muted">
          Usamos "cookies" (pequenos arquivos de texto) para lembrar de você, manter seu login ativo e entender quais
          páginas você mais gosta. Você pode limpar ou bloquear os cookies no seu navegador a qualquer momento, mas
          algumas partes do site podem parar de funcionar corretamente.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-meow-muted">
          <strong>Ficou com dúvida?</strong>
          <p className="mt-1">
            Nossa equipe está pronta para conversar. Se quiser saber mais sobre seus dados, abra um ticket em nossa
            central de ajuda.
          </p>
        </div>
      </div>
    </section>
  );
}
