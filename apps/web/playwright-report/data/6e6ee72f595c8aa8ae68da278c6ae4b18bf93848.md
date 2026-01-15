# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Nova conta
      - paragraph [ref=e6]: Cadastro
      - paragraph [ref=e7]: Crie sua conta para acessar a plataforma.
    - generic [ref=e8]:
      - link "Continuar com Google" [ref=e9] [cursor=pointer]:
        - /url: /api/auth/google/start?next=%2F&role=USER
      - link "Continuar com Discord" [ref=e10] [cursor=pointer]:
        - /url: /api/auth/discord/start?next=%2F
      - generic [ref=e11]: ou
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: E-mail
          - textbox "E-mail" [ref=e17]: buyer-1768438557135@test.com
        - generic [ref=e18]:
          - generic [ref=e19]: Senha
          - textbox "Senha" [ref=e20]: "12345678"
        - generic [ref=e21]:
          - generic [ref=e22]: Perfil
          - combobox "Perfil" [ref=e23] [cursor=pointer]:
            - option "Comprador" [selected]
            - option "Vendedor"
        - paragraph [ref=e24]: Internal Server Error
        - button "Criar conta" [ref=e25] [cursor=pointer]
        - link "Ja tenho conta" [ref=e27] [cursor=pointer]:
          - /url: /login
      - link "Voltar para home" [ref=e28] [cursor=pointer]:
        - /url: /
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - img [ref=e35]
  - alert [ref=e38]
```