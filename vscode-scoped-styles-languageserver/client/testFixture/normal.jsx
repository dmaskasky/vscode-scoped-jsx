import css from 'scoped-styles/css'

export const Button = props => (
  <button>
    {props.children}
    {/* Support SCSS syntax */}
    <style scoped>{`
      button {
        color: #333;

        &:hover {
          color: #000;
        }
      }
    `}</style>
    <style scoped>
      {`
        button {
          color: rgb(155, 84, 84);
          display: inline-block;
          font-size: 2em;
          position: ;
        }
      `}
    </style>
    <style scoped global>{`
      button {
        padding: ${'large' in props ? '50' : '20'}px;
        position: relative;
        background: ${props.theme.background};
      }
    `}</style>
  </button>
)

// Scoped styles
export const button = css`
  button {
    color: hotpink;
  }
`

// Global styles
export const body = css.global`
  body {
    margin: 0;
  }
`

// Resolved styles
export const link = css.resolve`
  a {
    color: green;
  }
`
