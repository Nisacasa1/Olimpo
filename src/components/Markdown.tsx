import type { ReactNode } from 'react'

/** Markdown mínimo para los frameworks: párrafos, **negrita**, *cursiva*, citas, listas y tablas. */
function enLinea(t: string): ReactNode[] {
  const partes = t.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return partes.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <b key={i} className="font-semibold text-text">{p.slice(2, -2)}</b>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <i key={i}>{p.slice(1, -1)}</i>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="rounded bg-surface-2 px-1 text-xs">{p.slice(1, -1)}</code>
    return p.replace(/🔴|🎯|✅|⚠️|🚨/g, '').replace(/\s{2,}/g, ' ')
  })
}

export function Markdown({ texto }: { texto: string }) {
  const bloques = texto.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted">
      {bloques.map((b, i) => {
        const lineas = b.split('\n').filter((l) => l.trim() && !l.trim().startsWith('/*'))
        if (!lineas.length) return null
        if (lineas.every((l) => l.trim().startsWith('|'))) {
          const filas = lineas.filter((l) => !/^\|\s*-/.test(l.trim())).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
          const [cab, ...cuerpo] = filas
          return (
            <div key={i} className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {cab.map((c, j) => (
                      <th key={j} className="border-b border-line bg-surface-2/60 px-3 py-2 text-left font-semibold text-text">
                        {enLinea(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cuerpo.map((f, k) => (
                    <tr key={k}>
                      {f.map((c, j) => (
                        <td key={j} className="border-b border-line px-3 py-2 align-top">
                          {enLinea(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (lineas.every((l) => l.trim().startsWith('>')))
          return (
            <blockquote key={i} className="border-l-2 border-violet/60 pl-3 text-text/90 italic">
              {enLinea(lineas.map((l) => l.replace(/^\s*>\s?/, '')).join(' '))}
            </blockquote>
          )
        if (lineas.every((l) => /^\s*(\d+\.|-)\s/.test(l)))
          return (
            <ol key={i} className="space-y-1">
              {lineas.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-faint">{/^\s*\d+\./.test(l) ? l.match(/\d+/)![0] + '.' : '·'}</span>
                  <span>{enLinea(l.replace(/^\s*(\d+\.|-)\s/, ''))}</span>
                </li>
              ))}
            </ol>
          )
        return <p key={i}>{enLinea(lineas.join(' '))}</p>
      })}
    </div>
  )
}
