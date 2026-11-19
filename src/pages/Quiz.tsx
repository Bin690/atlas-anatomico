import { BotaoVoltar } from '../components/BotaoVoltar'
import { QuizPanel } from '../components/QuizPanel'

export default function Quiz() {
  return (
    <main className="relative h-full">
      <header className="absolute inset-x-0 top-0 flex items-center gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <BotaoVoltar texto="Voltar ao atlas" />
        <h1 className="text-lg font-bold text-white">Quiz</h1>
      </header>
      <div className="absolute inset-x-2 bottom-2 max-h-[62vh] pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-4 sm:max-h-none sm:w-[380px]">
        <div className="flex max-h-full flex-col justify-end sm:justify-start">
          <QuizPanel />
        </div>
      </div>
    </main>
  )
}
