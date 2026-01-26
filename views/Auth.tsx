import React, { useState } from 'react';
import { View } from '../types';
import { supabase } from '../supabase';
import { PageLayout } from '../components/PageLayout';

interface Props {
  mode: View.LOGIN | View.SIGNUP;
  onAuthSuccess: () => void;
  onToggleMode: () => void;
}

const Auth: React.FC<Props> = ({ mode, onAuthSuccess, onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === View.SIGNUP) {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
        return;
      }
      if (!termsAccepted) {
        setError('Você precisa aceitar os termos.');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === View.SIGNUP) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com Google.');
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Vazia' };
    if (pass.length < 6) return { score: 1, label: 'Fraca' };
    if (pass.length < 8) return { score: 2, label: 'Regular' };
    return { score: 4, label: 'Forte' };
  };

  const passwordStrength = getPasswordStrength(password);


  const header = (
    <div className="flex items-center justify-between p-4 pb-2 bg-background-light dark:bg-background-dark">
      {mode === View.SIGNUP ? (
        <button
          onClick={onToggleMode}
          className="flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
      ) : (
        <div className="size-12" />
      )}
      <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-12">MedStudium</h2>
    </div>
  );

  return (
    <PageLayout header={header}>
      <div className="flex flex-col min-h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">

        <div className="flex flex-col flex-1 px-4 pb-8 max-w-[480px] mx-auto w-full">
          <div className="flex flex-col items-center pt-4 pb-6">
            <h1 className="text-[28px] md:text-[32px] font-bold leading-tight text-center">
              {mode === View.LOGIN ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal pt-2 text-center max-w-xs">
              {mode === View.LOGIN
                ? 'Continue sua jornada de estudos.'
                : 'Junte-se à comunidade de futuros especialistas e domine suas provas de residência.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-500 text-sm font-medium border border-red-100 dark:bg-red-900/10 dark:text-red-300 dark:border-red-900/20">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {mode === View.SIGNUP && (
              <label className="flex flex-col w-full">
                <p className="text-sm font-medium leading-normal pb-2">Nome Completo</p>
                <div className="flex w-full items-stretch rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50">
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark focus:outline-0 focus:ring-0 focus:border-primary dark:focus:border-primary h-14 px-[15px] rounded-l-xl border-r-0 text-base font-normal transition-colors"
                    placeholder="Dr. João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={mode === View.SIGNUP}
                  />
                  <div className="flex border border-slate-200 dark:border-slate-700 border-l-0 bg-white dark:bg-surface-dark items-center justify-center pr-[15px] rounded-r-xl">
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500" style={{ fontSize: '24px' }}>person</span>
                  </div>
                </div>
              </label>
            )}

            <label className="flex flex-col w-full">
              <p className="text-sm font-medium leading-normal pb-2">E-mail</p>
              <div className="flex w-full items-stretch rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark focus:outline-0 focus:ring-0 focus:border-primary dark:focus:border-primary h-14 px-[15px] rounded-l-xl border-r-0 text-base font-normal transition-colors"
                  placeholder="medico@hospital.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="flex border border-slate-200 dark:border-slate-700 border-l-0 bg-white dark:bg-surface-dark items-center justify-center pr-[15px] rounded-r-xl">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500" style={{ fontSize: '24px' }}>mail</span>
                </div>
              </div>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-sm font-medium leading-normal pb-2">Senha</p>
              <div className="flex w-full items-stretch rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50">
                <input
                  className="flex w-full min-w-0 flex-1 resize-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark focus:outline-0 focus:ring-0 focus:border-primary dark:focus:border-primary h-14 px-[15px] rounded-l-xl border-r-0 text-base font-normal transition-colors"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex border border-slate-200 dark:border-slate-700 border-l-0 bg-white dark:bg-surface-dark items-center justify-center pr-[15px] rounded-r-xl cursor-pointer hover:text-primary"
                >
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500" style={{ fontSize: '24px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {mode === View.SIGNUP && password && (
                <>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${passwordStrength.score >= i ? (passwordStrength.score < 2 ? 'bg-red-500' : passwordStrength.score < 4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Força: {passwordStrength.label}</p>
                </>
              )}
            </label>

            {mode === View.SIGNUP && (
              <label className="flex flex-col w-full">
                <p className="text-sm font-medium leading-normal pb-2">Confirmar Senha</p>
                <div className="flex w-full items-stretch rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/50">
                  <input
                    className="flex w-full min-w-0 flex-1 resize-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark focus:outline-0 focus:ring-0 focus:border-primary dark:focus:border-primary h-14 px-[15px] rounded-l-xl border-r-0 text-base font-normal transition-colors"
                    placeholder="••••••••"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="flex border border-slate-200 dark:border-slate-700 border-l-0 bg-white dark:bg-surface-dark items-center justify-center pr-[15px] rounded-r-xl cursor-pointer hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500" style={{ fontSize: '24px' }}>
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </label>
            )}

            {mode === View.SIGNUP && (
              <label className="flex items-start gap-3 mt-1 cursor-pointer group">
                <div className="relative flex items-center pt-1">
                  <input
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-surface-dark transition-all checked:border-primary checked:bg-primary hover:border-primary"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pt-1 text-white opacity-0 peer-checked:opacity-100" style={{ fontSize: '16px' }}>check</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm font-normal leading-normal flex-1">
                  Eu concordo com os <a className="text-primary hover:underline font-medium" href="#">Termos e Condições</a> e a <a className="text-primary hover:underline font-medium" href="#">Política de Privacidade</a>.
                </p>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary hover:bg-blue-600 text-white text-base font-bold leading-normal tracking-[0.015em] transition-colors shadow-lg shadow-blue-900/20 mt-2 disabled:opacity-70"
            >
              <span className="truncate">{loading ? 'Carregando...' : (mode === View.LOGIN ? 'Entrar' : 'Criar Conta')}</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-sm">Ou {mode === View.LOGIN ? 'entre' : 'cadastre-se'} com</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-xl h-12 px-5 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-slate-50 dark:hover:bg-[#202b40] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#4285F4"></path>
                <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#34A853"></path>
                <path d="M5.50253 14.3003C5.00236 12.8199 5.00236 11.1799 5.50253 9.69951V6.60861H1.51649C-0.18551 10.0056 -0.18551 13.9945 1.51649 17.3915L5.50253 14.3003Z" fill="#FBBC05"></path>
                <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1001 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.60861L5.50264 9.69951C6.45064 6.86248 9.10947 4.74966 12.2401 4.74966Z" fill="#EA4335"></path>
              </svg>
              <span className="truncate">Continuar com Google</span>
            </button>
          </form>

          <div className="flex justify-center pt-8">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal text-center">
              {mode === View.LOGIN ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button onClick={onToggleMode} type="button" className="text-primary font-bold ml-2 hover:underline">
                {mode === View.LOGIN ? 'Cadastre-se' : 'Entrar'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Auth;
