import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { Carregando } from './components/Carregando'
import { TelaPro } from './components/ui/Pro'
import { useCatalogo } from './data'
import { useAtlasStore } from './store/useAtlasStore'

// O motor 3D fica num chunk separado: a interface aparece antes do Three.js terminar de baixar.
const Viewer3D = lazy(() => import('./components/Viewer3D'))
const Explorador = lazy(() => import('./pages/Explorador'))
const Quiz = lazy(() => import('./pages/Quiz'))
const AulaView = lazy(() => import('./pages/AulaView'))
const NaoEncontrado = lazy(() => import('./pages/NaoEncontrado'))

/** Liga as camadas padrão na primeira carga do catálogo. */
function CamadasIniciais() {
  const { sistemas } = useCatalogo()
  const definirCamadas = useAtlasStore((s) => s.definirCamadas)
  useEffect(() => {
    if (useAtlasStore.getState().camadas.size === 0)
      definirCamadas(sistemas.filter((s) => s.visivelPorPadrao).map((s) => s.id))
  }, [sistemas, definirCamadas])
  return null
}

/**
 * O canvas 3D vive aqui, fora das rotas, e nunca é desmontado.
 * As páginas são camadas de interface por cima dele.
 */
function Layout() {
  return (
    <div className="relative h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#0c2340_0%,#020617_70%)]">
      <Suspense fallback={<Carregando texto="Preparando o atlas…" />}>
        <CamadasIniciais />
        <div className="absolute inset-0 touch-none">
          <Viewer3D />
        </div>
        {/* Camada de interface: deixa os toques passarem para o 3D, exceto em links e botões */}
        <div className="pointer-events-none relative z-20 h-full [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto">
          <Outlet />
          <TelaPro />
        </div>
      </Suspense>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Explorador /> },
      { path: '/quiz', element: <Quiz /> },
      { path: '/aula/:id', element: <AulaView /> },
      { path: '*', element: <NaoEncontrado /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
