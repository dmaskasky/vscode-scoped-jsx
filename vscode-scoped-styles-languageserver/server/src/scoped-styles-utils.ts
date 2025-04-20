import * as ts from 'typescript'
import { Stylesheet, TextDocument } from 'vscode-css-languageservice'
import { LanguageModelCache } from './language-model-cache'

export interface ScopedStylesTaggedTemplate {
  start: number
  end: number
}

export interface ScopedStylesTagAttributes {
  firstAttributeName: string | undefined
  secondAttributeName: string | undefined
}

export interface ScopedStyles {
  cssDocument: TextDocument
  stylesheet: Stylesheet
}

const scopedStylesPattern = /((<\s*?style\s*?(global)?\s*?jsx\s*?(global)?\s*?>)|(\s*?css(.*)\s*?`))/g

export function getApproximateScopedStylesOffsets (
  document: TextDocument
): number[] {
  const results = []
  const doc = document.getText()
  while (scopedStylesPattern.exec(doc) != null) {
    results.push(scopedStylesPattern.lastIndex)
  }
  return results
}

// css`button { position: relative; }`
export function isScopedStylesTaggedTemplate (token: ts.Node): boolean {
  return (
    token.parent.kind === ts.SyntaxKind.TaggedTemplateExpression &&
    token.parent.getText().startsWith('css')
  )
}

function walk (node: ts.Node, callback: (node: ts.Node) => void): void {
  if (
    ts.isJSDoc(node) ||
    node.kind === ts.SyntaxKind.MultiLineCommentTrivia ||
    node.kind === ts.SyntaxKind.SingleLineCommentTrivia
  ) {
    return
  }

  if (ts.isToken(node) && node.kind !== ts.SyntaxKind.EndOfFileToken) {
    callback(node)
  } else {
    node.getChildren().forEach(child => walk(child, callback))
  }
}

function getTemplateString (
  node: ts.Node
):
  | ts.TemplateExpression
  | ts.TemplateLiteralTypeNode
  | ts.NoSubstitutionTemplateLiteral
  | undefined {
  if (ts.isTemplateHead(node) || ts.isTemplateLiteral(node)) {
    if (ts.isTemplateHead(node)) {
      return node.parent
    } else {
      return node
    }
  }
  return undefined
}

function isScopedStylesTemplate (node: ts.Node): boolean {
  if (!ts.isJsxExpression(node.parent)) {
    return false
  }

  const grandparent = node.parent.parent

  if (!ts.isJsxElement(grandparent)) {
    return false
  }

  const opener = grandparent.openingElement

  if (opener.tagName.getText() !== 'style') {
    return false
  }

  for (const prop of opener.attributes.properties) {
    if (prop.name != null && prop.name.getText() === 'jsx') {
      return true
    }
  }

  return false
}

function findScopedStylesTaggedTemplate (
  textDocument: TextDocument
): ScopedStylesTaggedTemplate[] {
  const source = ts.createSourceFile(
    'tmp',
    textDocument.getText(),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

  const templates: ScopedStylesTaggedTemplate[] = []
  walk(source, node => {
    const templateNode = getTemplateString(node)
    if (templateNode != null) {
      if (
        isScopedStylesTemplate(templateNode) ||
        isScopedStylesTaggedTemplate(templateNode)
      ) {
        templates.push({
          start: templateNode.getStart() + 1,
          end: templateNode.getEnd() - 1
        })
      }
    }
  })

  return templates
}

const expressionPattern = /(.*\${.*}.*)|(.*(&&|[||]).*)/g
export function replaceAllWithSpacesExceptCss (
  textDocument: TextDocument,
  scopedStylesTaggedTemplates: ScopedStylesTaggedTemplate[],
  stylesheets: LanguageModelCache<Stylesheet>
): { cssDocument: TextDocument, stylesheet: Stylesheet } {
  const text = textDocument.getText()
  let result = ''
  // Code that goes before CSS
  result += text.slice(0, scopedStylesTaggedTemplates[0].start).replace(/./g, ' ')
  for (let i = 0; i < scopedStylesTaggedTemplates.length; i++) {
    /* CSS itself with dirty hacks. Maybe there is better solution.
    We need to find all expressions in CSS and replace each character of expression with space.
    This is neccessary to preserve character count */
    result += text
      .slice(scopedStylesTaggedTemplates[i].start, scopedStylesTaggedTemplates[i].end)
      .replace(expressionPattern, (_str, p1) => {
        return p1.replace(/./g, ' ')
      })
    const hasSeveralCSSParts = i + 1 < scopedStylesTaggedTemplates.length
    if (hasSeveralCSSParts) {
      // Code that is in between that CSS parts
      result += text
        .slice(
          scopedStylesTaggedTemplates[i].end,
          scopedStylesTaggedTemplates[i + 1].start
        )
        .replace(/./g, ' ')
    }
  }
  // Code that goes after CSS
  result += text
    .slice(
      scopedStylesTaggedTemplates[scopedStylesTaggedTemplates.length - 1].end,
      text.length
    )
    .replace(/./g, ' ')
  const cssDocument = TextDocument.create(
    textDocument.uri.toString(),
    'css',
    textDocument.version,
    result
  )
  const stylesheet = stylesheets.get(cssDocument)
  return {
    cssDocument,
    stylesheet
  }
}

export function getScopedStyles (
  document: TextDocument,
  stylesheets: LanguageModelCache<Stylesheet>
): ScopedStyles | undefined {
  try {
    const scopedStylesOffsets = getApproximateScopedStylesOffsets(document)
    if (scopedStylesOffsets.length > 0) {
      const scopedStylesTaggedTemplates = findScopedStylesTaggedTemplate(document)
      if (scopedStylesTaggedTemplates.length > 0) {
        return replaceAllWithSpacesExceptCss(
          document,
          scopedStylesTaggedTemplates,
          stylesheets
        )
      }
    }
    return undefined
  } catch {
    return undefined
  }
}
