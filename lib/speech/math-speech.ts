export type MathSpeechDetail = 'brief' | 'detailed'

function simplifyWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function latexToSpeech(latex: string, detail: MathSpeechDetail) {
  let spoken = latex

  spoken = spoken.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1) over ($2)')
  spoken = spoken.replace(/\\sqrt\s*\{([^{}]+)\}/g, 'square root of ($1)')
  spoken = spoken.replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, 'sum from $1 to $2 of')
  spoken = spoken.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, 'integral from $1 to $2 of')
  spoken = spoken.replace(/\\int/g, 'integral of')
  spoken = spoken.replace(/\\mathbb\{E\}/g, 'expected value')
  spoken = spoken.replace(/\\mathbb\{P\}/g, 'probability')
  spoken = spoken.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
  spoken = spoken.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']')
  spoken = spoken.replace(/\\cdot/g, ' times ')
  spoken = spoken.replace(/\\times/g, ' times ')
  spoken = spoken.replace(/\\leq/g, ' less than or equal to ')
  spoken = spoken.replace(/\\geq/g, ' greater than or equal to ')
  spoken = spoken.replace(/\\neq/g, ' not equal to ')
  spoken = spoken.replace(/\\infty/g, ' infinity ')
  spoken = spoken.replace(/\\to/g, ' tends to ')
  spoken = spoken.replace(/\\mid/g, ' given ')

  spoken = spoken.replace(/([A-Za-z0-9]+)_\{([^{}]+)\}/g, '$1 sub $2')
  spoken = spoken.replace(/([A-Za-z0-9]+)_([A-Za-z0-9])/g, '$1 sub $2')
  spoken = spoken.replace(/([A-Za-z0-9]+)\^\{([^{}]+)\}/g, '$1 to the power of $2')
  spoken = spoken.replace(/([A-Za-z0-9]+)\^([A-Za-z0-9])/g, '$1 to the power of $2')

  spoken = spoken.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_m, body: string) => {
    const rows = body.split(/\\\\/).map((row: string) => row.split('&').map((item) => simplifyWhitespace(item)).join(', ')).join('; ')
    return `matrix with rows: ${rows}`
  })

  spoken = spoken.replace(/[{}]/g, ' ')
  spoken = spoken.replace(/\\[a-zA-Z]+/g, ' ')

  if (detail === 'detailed') {
    spoken = spoken.replace(/=/g, ' equals ')
    spoken = spoken.replace(/\+/g, ' plus ')
    spoken = spoken.replace(/-/g, ' minus ')
    spoken = spoken.replace(/\//g, ' divided by ')
  }

  return simplifyWhitespace(spoken)
}

export function normalizeMathForSpeech(text: string, detail: MathSpeechDetail = 'brief') {
  if (!text) return ''

  let output = text

  output = output.replace(/\$\$([\s\S]+?)\$\$/g, (_match, body: string) => ` ${latexToSpeech(body, detail)} `)
  output = output.replace(/\\\[([\s\S]+?)\\\]/g, (_match, body: string) => ` ${latexToSpeech(body, detail)} `)
  output = output.replace(/\$([^$]+)\$/g, (_match, body: string) => ` ${latexToSpeech(body, detail)} `)
  output = output.replace(/\\\(([^)]+)\\\)/g, (_match, body: string) => ` ${latexToSpeech(body, detail)} `)

  return simplifyWhitespace(output)
}
