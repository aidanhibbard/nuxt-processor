export interface ParsedWorkerOptions {
  concurrency?: number
  limiter?: { max: number, duration: number }
  lockDuration?: number
  stalledInterval?: number
  maxStalledCount?: number
}

export interface ParsedWorkerDefinition {
  name: string
  options: ParsedWorkerOptions
}

function findDefineWorkerCallIndex(source: string): number {
  const match = source.match(/\bdefineWorker(?:<[^>]*>)?\s*\(/)
  return match?.index ?? -1
}

function extractObjectLiteral(source: string, openBraceIndex: number): string | null {
  if (source[openBraceIndex] !== '{') {
    return null
  }

  let depth = 0
  let inString: '"' | '\'' | '`' | null = null
  let escaped = false

  for (let i = openBraceIndex; i < source.length; i++) {
    const char = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === inString) {
        inString = null
      }
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      inString = char
      continue
    }

    if (char === '{') {
      depth++
      continue
    }

    if (char === '}') {
      depth--
      if (depth === 0) {
        return source.slice(openBraceIndex, i + 1)
      }
    }
  }

  return null
}

function parseStringLiteral(value: string): string | null {
  const trimmed = value.trim()
  const match = trimmed.match(/^(['"`])(.*)\1$/)
  if (!match) {
    return null
  }
  return match[2]
}

function parseNumberLiteral(value: string): number | null {
  const trimmed = value.trim().replace(/_/g, '')
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return null
  }
  return Number(trimmed)
}

function extractPropertyObjectLiteral(objectLiteral: string, propertyName: string): string | null {
  const pattern = new RegExp(`\\b${propertyName}:\\s*\\{`)
  const match = pattern.exec(objectLiteral)
  if (!match) {
    return null
  }

  const openBraceIndex = objectLiteral.indexOf('{', match.index)
  return extractObjectLiteral(objectLiteral, openBraceIndex)
}

function parseTopLevelObject(objectLiteral: string): Map<string, string> {
  const inner = objectLiteral.slice(1, -1)
  const entries = new Map<string, string>()
  let depth = 0
  let inString: '"' | '\'' | '`' | null = null
  let escaped = false
  let key = ''
  let value = ''
  let currentKey: string | null = null
  let collectingKey = true

  const flush = () => {
    if (currentKey !== null) {
      entries.set(currentKey, value.trim())
    }
    key = ''
    value = ''
    currentKey = null
    collectingKey = true
  }

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i]

    if (inString) {
      if (collectingKey) {
        key += char
      }
      else {
        value += char
      }

      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === inString) {
        inString = null
      }
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      inString = char
      if (collectingKey) {
        key += char
      }
      else {
        value += char
      }
      continue
    }

    if (depth === 0) {
      if (char === ':') {
        if (collectingKey) {
          currentKey = parseStringLiteral(key) ?? key.trim().replace(/^\[|\]$/g, '')
          collectingKey = false
        }
        continue
      }
      if (char === ',') {
        flush()
        continue
      }
    }

    if (collectingKey) {
      key += char
    }
    else {
      value += char
    }

    if (char === '{' || char === '[' || char === '(') {
      depth++
    }
    else if (char === '}' || char === ']' || char === ')') {
      depth--
    }
  }

  flush()
  return entries
}

function parseOptionsObject(value: string): ParsedWorkerOptions {
  const trimmed = value.trim()
  if (!trimmed.startsWith('{')) {
    return {}
  }

  const entries = parseTopLevelObject(trimmed)
  const options: ParsedWorkerOptions = {}

  const concurrency = entries.get('concurrency')
  if (concurrency !== undefined) {
    const parsed = parseNumberLiteral(concurrency)
    if (parsed !== null) {
      options.concurrency = parsed
    }
  }

  const lockDuration = entries.get('lockDuration')
  if (lockDuration !== undefined) {
    const parsed = parseNumberLiteral(lockDuration)
    if (parsed !== null) {
      options.lockDuration = parsed
    }
  }

  const stalledInterval = entries.get('stalledInterval')
  if (stalledInterval !== undefined) {
    const parsed = parseNumberLiteral(stalledInterval)
    if (parsed !== null) {
      options.stalledInterval = parsed
    }
  }

  const maxStalledCount = entries.get('maxStalledCount')
  if (maxStalledCount !== undefined) {
    const parsed = parseNumberLiteral(maxStalledCount)
    if (parsed !== null) {
      options.maxStalledCount = parsed
    }
  }

  const limiter = entries.get('limiter')
  if (limiter?.trim().startsWith('{')) {
    const limiterEntries = parseTopLevelObject(limiter.trim())
    const max = limiterEntries.get('max')
    const duration = limiterEntries.get('duration')
    const parsedMax = max !== undefined ? parseNumberLiteral(max) : null
    const parsedDuration = duration !== undefined ? parseNumberLiteral(duration) : null
    if (parsedMax !== null && parsedDuration !== null) {
      options.limiter = { max: parsedMax, duration: parsedDuration }
    }
  }

  return options
}

function extractWorkerName(objectLiteral: string): string | null {
  const match = objectLiteral.match(/\bname:\s*(['"`])([^'"`]+)\1/)
  if (!match) {
    return null
  }
  return match[2]
}

export function parseWorkerDefinition(source: string): ParsedWorkerDefinition | null {
  const callIndex = findDefineWorkerCallIndex(source)
  if (callIndex === -1) {
    return null
  }

  const afterCall = source.slice(callIndex)
  const openParenIndex = afterCall.indexOf('(')
  if (openParenIndex === -1) {
    return null
  }

  const argsStart = afterCall.slice(openParenIndex + 1)
  const openBraceIndex = argsStart.indexOf('{')
  if (openBraceIndex === -1) {
    return null
  }

  const objectLiteral = extractObjectLiteral(argsStart, openBraceIndex)
  if (!objectLiteral) {
    return null
  }

  const name = extractWorkerName(objectLiteral)
  if (!name) {
    return null
  }

  const optionsLiteral = extractPropertyObjectLiteral(objectLiteral, 'options')
  const options = optionsLiteral ? parseOptionsObject(optionsLiteral) : {}

  return { name, options }
}
