import { BotaoVoltar } from '../components/BotaoVoltar'
import { QuizPanel } from '../components/QuizPanel'

export default function Quiz() {
  return (
    <main className="relative h-full">
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <BotaoVoltar texto="Voltar ao atlas" />
        <h1 className="text-lg font-bold text-white">Quiz</h1>
      </header>
      {/* Altura máxima explícita (dvh: sem as barras do navegador no telemóvel), para o painel ter
          rolagem própria e o botão de começar ficar sempre à vista */}
      <div className="absolute inset-x-2 bottom-2 pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-4 sm:w-[380px]">
        <div className="flex max-h-[62dvh] flex-col justify-end sm:max-h-[calc(100dvh-6rem)] sm:justify-start">
          <QuizPanel />
        </div>
      </div>
    </main>
  )
}
