import { createContext, useContext, useState, useEffect } from 'react'

const ModuloContext = createContext({})

export function ModuloProvider({ children }) {
  // Inicializa o estado lendo do localStorage para o usuário não ter que escolher toda vez que der F5
  const [moduloAtivo, setModuloAtivo] = useState(() => {
    return localStorage.getItem('@iofv-modulo') || null
  })

  // Sempre que o módulo mudar, salva no localStorage
  useEffect(() => {
    if (moduloAtivo) {
      localStorage.setItem('@iofv-modulo', moduloAtivo)
    } else {
      localStorage.removeItem('@iofv-modulo')
    }
  }, [moduloAtivo])

  const selecionarModulo = (modulo) => {
    setModuloAtivo(modulo)
  }

  const limparModulo = () => {
    setModuloAtivo(null)
  }

  return (
    <ModuloContext.Provider value={{ moduloAtivo, selecionarModulo, limparModulo }}>
      {children}
    </ModuloContext.Provider>
  )
}

export const useModulo = () => useContext(ModuloContext)