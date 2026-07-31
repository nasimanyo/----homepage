'use client'

import { useEffect } from 'react'

export function DifyChatbot() {
  useEffect(() => {
    // 既に追加済みなら二重に追加しない
    if (document.getElementById('aFQNk8g040iuBLZT')) return

    // @ts-expect-error window拡張
    window.difyChatbotConfig = {
      token: 'aFQNk8g040iuBLZT',
      inputs: {},
      systemVariables: {},
      userVariables: {},
    }

    const script = document.createElement('script')
    script.src = 'https://udify.app/embed.min.js'
    script.id = 'aFQNk8g040iuBLZT'
    script.defer = true
    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  return null
}