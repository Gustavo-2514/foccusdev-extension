# FoccusDEV

[English version](README.en.md) | [Site Oficial](https://www.foccusdev.xyz/)

FoccusDEV é uma extensão para VS Code que monitora sua atividade de codificação e exibe métricas de produtividade em um painel local.

![Dashboard - FoccusDEV](src/media/dashboard.png)

## Recursos

- Dashboard com tempo de código de hoje, ontem, semana e mês.
- Comparativo com a semana passada.
- Top linguagens e top projetos.
- Visão por dia da semana com detalhamento por linguagem, arquivo e projeto.
- Controle de limite do banco local (15 MB a 100 MB).
- Limpeza total de dados diretamente pela interface.
- Atalho por status bar para abrir o painel.

## Como Instalar

### Via VS Code Marketplace

1. Abra o VS Code e pressione `Ctrl+P` (Quick Open).
2. Cole o seguinte comando e pressione Enter:
   ```bash
   ext install gustavo-2514.foccusdev
   ```

Ou acesse diretamente: [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=gustavo-2514.foccusdev)

### Via Open VSX

Se você utiliza o Cursor, Antigravity, VSCodium ou outra versão open-source:

[Open VSX Registry](https://open-vsx.org/extension/gustavo-2514/foccusdev)

## Como usar

1. Instale a extensão.
2. Abra a barra lateral e clique em **FoccusDEV**.
3. Navegue entre as abas:
   - **Dashboard**: métricas de codificação.
   - **Configurações**: limite do banco local e limpeza de dados.
   - **Documentação**: link para o repositório.

Você também pode abrir o painel pelo comando:

- `FoccusDEV: Abrir Painel`

## Armazenamento e privacidade

- Extensão 100% local, os dados são salvos localmente no armazenamento global da extensão.
- Nenhum envio para servidor externo é feito pela extensão.
- A opção de apagar dados remove todo o histórico local. (Tenha certeza antes de excluir)

## Requisitos

- VS Code `^1.100.0`

## Contribuições

Contribuições são bem-vindas.

1. Faça um fork do repositório.
2. Crie uma branch para sua alteração.
3. Faça commit com uma mensagem clara.
4. Abra um Pull Request descrevendo a mudança.

## Repositório

- Código-fonte e issues: <https://github.com/Gustavo-2514/foccusdev-extension>

## Changelog

As mudanças desta extensão estão documentadas em `CHANGELOG.md`.
