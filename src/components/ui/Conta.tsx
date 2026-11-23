import { useState, type FormEvent, type ReactNode } from 'react'
import { validarEmail, validarPassword } from '../../data/errosConta'
import { haQuanto } from '../../data/haQuanto'
import { useConta, type Resposta } from '../../store/conta'
import { IconeGoogle } from './Icones'
import { Janela, Secao } from './Janela'

/**
 * Métodos de entrada ativos, além do email. Para ligar um deles: ativá-lo no Supabase (Authentication >
 * Providers; o Google precisa de credenciais no Google Cloud, o telefone de um fornecedor de SMS) e mudar aqui.
 */
const METODOS = { google: false, telefone: false }

type Separador = 'entrar' | 'criar'
type Metodo = 'email' | 'telefone'
type Mensagem = { tipo: 'erro' | 'aviso'; texto: string } | null

const campo =
  'block w-full rounded-xl border border-borda bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none'
const botaoPrincipal =
  'min-h-11 w-full rounded-xl bg-sky-400 px-4 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50'
const botaoSecundario =
  'min-h-11 w-full rounded-xl border border-borda px-4 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white disabled:opacity-50'

function Rotulo({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{texto}</span>
      {children}
    </label>
  )
}

function Aviso({ mensagem }: { mensagem: Mensagem }) {
  if (!mensagem) return null
  const cor =
    mensagem.tipo === 'erro'
      ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
      : 'border-sky-400/40 bg-sky-400/10 text-sky-200'
  return (
    <p
      role={mensagem.tipo === 'erro' ? 'alert' : 'status'}
      className={`rounded-xl border px-3 py-2 text-xs leading-relaxed ${cor}`}
    >
      {mensagem.texto}
    </p>
  )
}

/** A janela da conta: entrar ou criar conta (email, Google, telefone) e, com sessão, a gestão da conta. */
export function Conta() {
  const aberta = useConta((s) => s.janelaAberta)
  const fechar = useConta((s) => s.fechar)
  const fase = useConta((s) => s.fase)
  const recuperacao = useConta((s) => s.recuperacao)

  return (
    <Janela aberta={aberta} fechar={fechar} titulo="A minha conta">
      {recuperacao ? (
        <NovaPassword />
      ) : fase === 'com-sessao' ? (
        <Painel />
      ) : fase === 'sem-sessao' ? (
        <Entrada />
      ) : fase === 'indisponivel' ? (
        <NaoConfigurada />
      ) : (
        <p>A verificar a sessão…</p>
      )}
    </Janela>
  )
}

/** Só se vê em desenvolvimento: falta ligar o projeto Supabase. */
function NaoConfigurada() {
  return (
    <div className="space-y-3 text-xs leading-relaxed text-slate-300">
      <p className="text-sm font-semibold text-white">A conta ainda não está ligada</p>
      <p>
        Falta ligar um projeto Supabase para guardar contas e sincronizar os dados. Em versões publicadas, este botão
        fica escondido enquanto isso não estiver feito.
      </p>
      <ol className="list-decimal space-y-1 pl-4 text-slate-400">
        <li>Crie o projeto em supabase.com e corra o ficheiro supabase/schema.sql no SQL Editor.</li>
        <li>Copie .env.example para .env.local e preencha o URL e a chave pública.</li>
        <li>Reinicie o npm run dev.</li>
      </ol>
      <p className="text-slate-500">Os passos completos estão em “Conta e sincronização”, no README.</p>
    </div>
  )
}

function Entrada() {
  const acoes = useConta()
  const [separador, setSeparador] = useState<Separador>('entrar')
  const [metodo, setMetodo] = useState<Metodo>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)
  const [aceito, setAceito] = useState(false)
  const [recuperar, setRecuperar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  const criar = separador === 'criar'
  /** Executa uma ação da conta, mostrando o resultado. */
  const correr = async (acao: () => Promise<Resposta>, aoSucesso?: () => void) => {
    setOcupado(true)
    setMensagem(null)
    const r = await acao()
    setOcupado(false)
    if (!r.ok) setMensagem({ tipo: 'erro', texto: r.erro })
    else {
      if (r.aviso) setMensagem({ tipo: 'aviso', texto: r.aviso })
      aoSucesso?.()
    }
  }
  const pedirConsentimento = () => {
    if (criar && !aceito) {
      setMensagem({ tipo: 'erro', texto: 'Para criar a conta, aceite que os seus dados sejam guardados nela.' })
      return false
    }
    return true
  }
  const trocarSeparador = (s: Separador) => {
    setSeparador(s)
    setMensagem(null)
    setRecuperar(false)
  }

  const enviarEmail = (e: FormEvent) => {
    e.preventDefault()
    let erro = validarEmail(email)
    if (!erro && !recuperar && criar) erro = validarPassword(password)
    if (erro) return setMensagem({ tipo: 'erro', texto: erro })
    if (recuperar) return void correr(() => acoes.recuperarPassword(email))
    if (!password) return setMensagem({ tipo: 'erro', texto: 'Escreva a palavra-passe.' })
    if (!pedirConsentimento()) return
    void correr(() => (criar ? acoes.criarContaComEmail(email, password) : acoes.entrarComEmail(email, password)))
  }

  const enviarTelefone = (e: FormEvent) => {
    e.preventDefault()
    if (!codigoEnviado) {
      if (!pedirConsentimento()) return
      return void correr(
        () => acoes.enviarCodigoSms(telefone),
        () => setCodigoEnviado(true),
      )
    }
    void correr(() => acoes.verificarCodigoSms(telefone, codigo))
  }

  return (
    <>
      <p className="text-xs leading-relaxed text-slate-400">
        Com uma conta, os seus favoritos, notas, aulas concluídas e progresso no quiz ficam guardados e acompanham-no em
        qualquer aparelho. É opcional: sem conta, a app funciona como sempre.
      </p>

      <div role="tablist" aria-label="Entrar ou criar conta" className="flex gap-1 rounded-full bg-white/5 p-1">
        {(['entrar', 'criar'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={separador === s}
            onClick={() => trocarSeparador(s)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              separador === s ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {s === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {METODOS.google && (
        <>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              if (!pedirConsentimento()) return
              void correr(acoes.entrarComGoogle)
            }}
            className={`${botaoSecundario} flex items-center justify-center gap-2`}
          >
            <IconeGoogle /> Continuar com o Google
          </button>

          <p className="flex items-center gap-3 text-xs text-slate-500" aria-hidden>
            <span className="h-px flex-1 bg-borda" /> ou <span className="h-px flex-1 bg-borda" />
          </p>
        </>
      )}

      {metodo === 'email' ? (
        <form onSubmit={enviarEmail} className="space-y-3" noValidate>
          <Rotulo texto="Email">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@exemplo.com"
              className={campo}
            />
          </Rotulo>
          {!recuperar && (
            <Rotulo texto={criar ? 'Palavra-passe (mínimo 8 caracteres)' : 'Palavra-passe'}>
              <input
                type="password"
                autoComplete={criar ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={campo}
              />
            </Rotulo>
          )}
          {criar && !recuperar && <Consentimento aceito={aceito} mudar={setAceito} />}
          <Aviso mensagem={mensagem} />
          <button type="submit" disabled={ocupado} className={botaoPrincipal}>
            {ocupado ? 'Um momento…' : recuperar ? 'Enviar ligação de recuperação' : criar ? 'Criar conta' : 'Entrar'}
          </button>
          {!criar && (
            <button
              type="button"
              onClick={() => {
                setRecuperar(!recuperar)
                setMensagem(null)
              }}
              className="block w-full text-center text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200"
            >
              {recuperar ? 'Voltar a entrar' : 'Esqueci a palavra-passe'}
            </button>
          )}
        </form>
      ) : (
        <form onSubmit={enviarTelefone} className="space-y-3" noValidate>
          <Rotulo texto="Número de telefone (com o indicativo)">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              disabled={codigoEnviado}
              placeholder="+244 923 000 000"
              className={campo}
            />
          </Rotulo>
          {codigoEnviado && (
            <Rotulo texto="Código recebido por SMS">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="123456"
                className={campo}
              />
            </Rotulo>
          )}
          {criar && !codigoEnviado && <Consentimento aceito={aceito} mudar={setAceito} />}
          <Aviso mensagem={mensagem} />
          <button type="submit" disabled={ocupado} className={botaoPrincipal}>
            {ocupado ? 'Um momento…' : codigoEnviado ? 'Confirmar código' : 'Enviar código por SMS'}
          </button>
          {codigoEnviado && (
            <button
              type="button"
              onClick={() => {
                setCodigoEnviado(false)
                setCodigo('')
                setMensagem(null)
              }}
              className="block w-full text-center text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200"
            >
              Usar outro número
            </button>
          )}
        </form>
      )}

      {METODOS.telefone && (
        <button
          type="button"
          onClick={() => {
            setMetodo(metodo === 'email' ? 'telefone' : 'email')
            setMensagem(null)
            setRecuperar(false)
          }}
          className="block w-full text-center text-xs text-sky-300 underline underline-offset-2"
        >
          {metodo === 'email' ? 'Entrar com o número de telefone' : 'Entrar com email e palavra-passe'}
        </button>
      )}
    </>
  )
}

function Consentimento({ aceito, mudar }: { aceito: boolean; mudar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-300">
      <input
        type="checkbox"
        checked={aceito}
        onChange={(e) => mudar(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-sky-400"
      />
      <span>
        Aceito que os meus favoritos, notas e progresso sejam guardados na minha conta. Posso apagar a conta e todos os
        dados quando quiser.
      </span>
    </label>
  )
}

function NovaPassword() {
  const definir = useConta((s) => s.definirNovaPassword)
  const fechar = useConta((s) => s.fechar)
  const [password, setPassword] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<Mensagem>(null)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const erro = validarPassword(password)
    if (erro) return setMensagem({ tipo: 'erro', texto: erro })
    setOcupado(true)
    const r = await definir(password)
    setOcupado(false)
    if (r.ok) fechar()
    else setMensagem({ tipo: 'erro', texto: r.erro })
  }
  return (
    <form onSubmit={enviar} className="space-y-3">
      <p className="text-xs text-slate-400">Escolha uma nova palavra-passe para a sua conta.</p>
      <Rotulo texto="Nova palavra-passe (mínimo 8 caracteres)">
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={campo}
        />
      </Rotulo>
      <Aviso mensagem={mensagem} />
      <button type="submit" disabled={ocupado} className={botaoPrincipal}>
        {ocupado ? 'Um momento…' : 'Guardar palavra-passe'}
      </button>
    </form>
  )
}

function Painel() {
  const { utilizador, sync, sincronizarAgora, sair, apagarConta } = useConta()
  const [mensagem, setMensagem] = useState<Mensagem>(null)
  const [pendente, setPendente] = useState(false)
  const [apagar, setApagar] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const estado =
    sync.fase === 'a-sincronizar'
      ? 'A sincronizar…'
      : sync.fase === 'erro'
        ? 'Não foi possível sincronizar. Tente de novo quando houver ligação.'
        : sync.quando
          ? `Sincronizado ${haQuanto(sync.quando)}`
          : 'Ainda não sincronizado'

  const terminarSessao = async (forcar = false) => {
    setOcupado(true)
    const r = await sair({ forcar })
    setOcupado(false)
    if (!r.ok && r.pendente) setPendente(true)
  }
  const apagarTudo = async () => {
    setOcupado(true)
    const r = await apagarConta()
    setOcupado(false)
    if (!r.ok) setMensagem({ tipo: 'erro', texto: r.erro })
  }

  return (
    <>
      <Secao titulo="Conta">
        <p className="text-slate-100">{utilizador?.email ?? utilizador?.telefone ?? 'Sessão iniciada'}</p>
        <p className={`text-xs ${sync.fase === 'erro' ? 'text-amber-300' : 'text-emerald-300'}`} aria-live="polite">
          {estado}
        </p>
      </Secao>

      <div className="space-y-2">
        <button
          type="button"
          disabled={ocupado || sync.fase === 'a-sincronizar'}
          onClick={() => void sincronizarAgora()}
          className={botaoSecundario}
        >
          Sincronizar agora
        </button>
        <button type="button" disabled={ocupado} onClick={() => void terminarSessao()} className={botaoSecundario}>
          Sair
        </button>
      </div>
      {pendente && (
        <div className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
          <p>
            Há alterações que ainda não foram guardadas na conta (talvez sem ligação). Se sair agora, perde-as neste
            aparelho.
          </p>
          <button
            type="button"
            onClick={() => void terminarSessao(true)}
            className="rounded-full bg-amber-400 px-3 py-1.5 font-semibold text-slate-950"
          >
            Sair mesmo assim
          </button>
        </div>
      )}

      <Secao titulo="Os meus dados">
        <p className="text-xs leading-relaxed text-slate-400">
          Guardamos só os seus favoritos, notas, aulas concluídas e progresso no quiz. Pode apagar a conta e tudo o que
          está guardado nela a qualquer momento; os dados deste aparelho mantêm-se.
        </p>
        {apagar ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-slate-200">Apagar a conta? Não é possível desfazer.</span>
            <button
              type="button"
              onClick={() => setApagar(false)}
              className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void apagarTudo()}
              className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
            >
              Apagar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setApagar(true)}
            className="rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
          >
            Apagar a minha conta
          </button>
        )}
        <Aviso mensagem={mensagem} />
      </Secao>
    </>
  )
}
