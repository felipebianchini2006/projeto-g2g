'use client';

export const SiteFooter = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-col">
          <div className="brand footer-brand">
            <img src="/assets/meoow/logo.png" alt="Meoww" className="brand-mark" />
            <div className="brand-text">
              <span className="brand-name">Meoww Games</span>
              <span className="brand-tagline">A casa gamer dos gatinhos</span>
            </div>
          </div>
          <p>
            A loja gamer com curadoria felina. Consoles, jogos e colecionaveis com
            entrega rapida e segura.
          </p>
          <div className="social-links">
            <a href="#" aria-label="Facebook">
              <i className="fab fa-facebook" aria-hidden="true" />
            </a>
            <a href="#" aria-label="Instagram">
              <i className="fab fa-instagram" aria-hidden="true" />
            </a>
            <a href="#" aria-label="YouTube">
              <i className="fab fa-youtube" aria-hidden="true" />
            </a>
            <a href="#" aria-label="TikTok">
              <i className="fab fa-tiktok" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className="footer-col">
          <h4>Institucional</h4>
          <ul>
            <li>
              <a href="#">Sobre nos</a>
            </li>
            <li>
              <a href="#">Contato</a>
            </li>
            <li>
              <a href="#">Politica de privacidade</a>
            </li>
            <li>
              <a href="#">Termos de uso</a>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Categorias</h4>
          <ul>
            <li>
              <a href="#">Nintendo</a>
            </li>
            <li>
              <a href="#">PlayStation</a>
            </li>
            <li>
              <a href="#">Xbox</a>
            </li>
            <li>
              <a href="#">Colecionaveis</a>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Ajuda</h4>
          <ul>
            <li>
              <a href="#">Central de ajuda</a>
            </li>
            <li>
              <a href="#">Como comprar</a>
            </li>
            <li>
              <a href="#">Formas de pagamento</a>
            </li>
            <li>
              <a href="#">Trocas e devolucoes</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 Meoww Games. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
);