import type { Register } from 'claude-code'

type Tier = 'simple' | 'medium' | 'complex'

const MODEL: Record<Tier, string> = { simple: 'haiku', medium: 'sonnet', complex: 'opus' }
const EFFORT: Record<Tier, 'low' | 'medium' | 'high'> = { simple: 'low', medium: 'medium', complex: 'high' }

const COMPLEX =
  /\b(refator\w*|refactor\w*|arquitetur\w*|architect\w*|redesign\w*|migra\w*|migrat\w*|otimiz\w*|optimi[sz]\w*|debug\w*|race condition|concorr\w*|segurança|security|audit\w*|design|implement\w*|from scratch|do zero|sistema|system|plan\w*|invest\w*|root cause|causa raiz|performance|algoritm\w*|algorithm\w*)\b/i
const SIMPLE =
  /\b(typo|renome\w*|rename|formata\w*|format|explique|explain|o que (é|faz)|what (is|does)|liste|list|mostre|show|traduz\w*|translate|resum\w*|summari[sz]e|comment\w*|coment\w*|git (status|log|diff)|ls|cat|oi|olá|obrigado|thanks)\b/i

function heuristic(text: string): Tier | undefined {
  const t = text.trim()
  if (!t) return undefined
  const complex = COMPLEX.test(t)
  const simple = SIMPLE.test(t)
  const files = (t.match(/[\w./-]+\.\w{1,5}\b/g) ?? []).length
  if (t.length > 600 || files >= 4 || (complex && t.length > 200)) return 'complex'
  if (complex && !simple) return t.length > 120 ? 'complex' : undefined
  if (t.length < 160 && simple && !complex && files <= 1) return 'simple'
  return undefined
}

export const register: Register = on => {
  const tiers = new Map<string, Tier>()
  let last: Tier = 'medium'

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    if (e.text.trim() === '') {
      tiers.set(e.turnId, last)
      return next(e)
    }
    let tier = heuristic(e.text)
    if (!tier) {
      // ambíguo: o Haiku decide (barato)
      const label = await $.model
        .classify(e.text.slice(0, 1500), ['simple', 'medium', 'complex'], { model: 'haiku' })
        .catch(() => undefined)
      tier = label === 'simple' || label === 'complex' ? label : 'medium'
    }
    tiers.set(e.turnId, tier)
    last = tier
    $.ui.status(`router: ${tier} → ${MODEL[tier]}`)
    return next(e)
  })

  // O turno inteiro (incluindo os passos após tool calls) usa o modelo escolhido.
  on('turn.step', async function* ($, e, next) {
    const tier = e.agentId === undefined ? tiers.get(e.turnId) : undefined
    const input = tier ? { ...e, model: MODEL[tier], effort: EFFORT[tier] } : e
    return yield* next(input)
  })

  on('turn.complete', ($, e, next) => {
    tiers.delete(e.turnId)
    return next(e)
  })
}
