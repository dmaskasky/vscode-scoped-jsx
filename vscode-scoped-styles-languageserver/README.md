# vscode-scoped-styles-languageserver

[Main GitHub Repo](https://github.com/dmaskasky/vscode-scoped-styles/).

Language server for [scoped-styles](https://github.com/vercel/scoped-styles).

## Features

- `CSS` code completion

  ![css-completion](https://raw.githubusercontent.com/dmaskasky/vscode-scoped-styles/master/.github/images/completion.gif)

- Hovers

  ![hover](https://raw.githubusercontent.com/dmaskasky/vscode-scoped-styles/master/.github/images/hover.gif)

- Color picker

  ![color-picker](https://raw.githubusercontent.com/dmaskasky/vscode-scoped-styles/master/.github/images/color-picker.gif)

- Quick fixes

  ![quick-fixes](https://raw.githubusercontent.com/dmaskasky/vscode-scoped-styles/master/.github/images/quick-fixes.gif)

- Multiple `<style scoped/>` tags in file

  ![multiple-scoped-styles](https://raw.githubusercontent.com/dmaskasky/vscode-scoped-styles/master/.github/images/multiple-scoped-styles.png)

- External styles `scoped-styles/css`

  ![external-styles](https://raw.githubusercontent.com/dmaskasky/vscode-scoped-styles/master/.github/images/external-styles.png)

## How it works

It converts template literals to language which can be detected by language server.

Consider this component:

```jsx
const Button = (props) => (
  <button>
    {props.children}
    <style scoped>{`
      button {
        display: inline-block;
        font-size: 2em;
      }
    `}</style>
    <style scoped>{`
      button {
        padding: ${'large' in props ? '50' : '20'}px;
        position: relative;
        background: ${props.theme.background};
      }
    `}</style>
  </button>
)
```

All the surrounding JSX will be removed, leaving just the CSS:

```css
button {
  display: inline-block;
  font-size: 2em;
}

button {
  position: relative;
}
```

The reason for this is to preserve line numbers for the language server in order
to correctly propose completions, underline problems and highlight symbols.

## Caveats

- Template literal expressions are replaced with whitespace.
