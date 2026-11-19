import { BotaoVoltar } from '../components/BotaoVoltar'

export default function NaoEncontrado() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-white">Página não encontrada</h1>
      <p className="text-slate-300">O órgão ou a página que você procura não existe.</p>
      <BotaoVoltar />
    </main>
  )
}
