# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Area restrita
      - paragraph [ref=e6]: Login
      - paragraph [ref=e7]: Use seu e-mail cadastrado para continuar.
    - generic [ref=e8]:
      - link "Continuar com Google" [ref=e9] [cursor=pointer]:
        - /url: /api/auth/google/start?next=%2F
      - link "Continuar com Discord" [ref=e10] [cursor=pointer]:
        - /url: /api/auth/discord/start?next=%2F
      - generic [ref=e11]: ou
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: E-mail
          - textbox "E-mail" [ref=e17]: admin@email.com
        - generic [ref=e18]:
          - generic [ref=e19]: Senha
          - textbox "Senha" [ref=e20]: "12345678"
        - paragraph [ref=e21]: Internal Server Error
        - button "Entrar" [ref=e22] [cursor=pointer]
        - generic [ref=e23]:
          - link "Esqueci minha senha" [ref=e24] [cursor=pointer]:
            - /url: /forgot
          - link "Criar conta" [ref=e25] [cursor=pointer]:
            - /url: /register
      - link "Voltar para home" [ref=e26] [cursor=pointer]:
        - /url: /
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e36]
```