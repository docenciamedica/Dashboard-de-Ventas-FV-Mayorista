import React, { useState } from 'react';
import { KeyRound, ShieldAlert, LogIn, Sparkles } from 'lucide-react';
import { authenticateUser, StoredUser, UserSession } from '../services/authService';

export interface AuthScreenProps {
  onLoginSuccess: (user: UserSession) => void;
  registeredUsers: StoredUser[];
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, registeredUsers }) => {
  const [inputCode, setInputCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleNumClick = (num: string) => {
    setErrorMsg(null);
    if (inputCode.length < 12) {
      setInputCode(prev => prev + num);
    }
  };

  const handleClear = () => {
    setInputCode('');
    setErrorMsg(null);
  };

  const handleSubmit = (codeToSubmit?: string) => {
    const code = codeToSubmit || inputCode;
    if (!code) {
      setErrorMsg('Por favor ingrese su código de acceso.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const authResult = authenticateUser(code, registeredUsers);
      setIsLoading(false);

      if (authResult.success && authResult.user) {
        onLoginSuccess(authResult.user);
      } else {
        setErrorMsg(authResult.error || 'Código incorrecto. Intente nuevamente.');
        setInputCode('');
      }
    }, 400);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-900/10 via-[#2E86C1]/5 to-transparent blur-3xl rounded-full" />
      <div className="absolute -left-48 bottom-12 w-96 h-96 bg-indigo-900/10 blur-3xl rounded-full" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Container */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-[#2E86C1] to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/10 mb-4 ring-4 ring-slate-900">
            <KeyRound className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase sm:text-4xl text-center">
            FV MEGAMAYORISTA
          </h1>
          <p className="text-xs font-black text-[#2E86C1] uppercase tracking-[0.25em] mt-1">
            Portal De Identidad Comercial
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-200">Acceso Seguro</h2>
            <p className="text-[#94A3B8] text-xs mt-1">
              Ingrese el Código de Administración o su PIN asignado de 4 dígitos
            </p>
          </div>

          {/* Interactive Screener Input */}
          <div className="relative mb-6">
            <input
              type="password"
              value={inputCode}
              onChange={(e) => {
                setErrorMsg(null);
                setInputCode(e.target.value);
              }}
              onKeyDown={handleKeyPress}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full tracking-[0.3em] font-black text-center text-white text-2xl bg-slate-950/60 border border-slate-800 rounded-2xl py-4 focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:border-transparent transition-all placeholder:text-slate-800"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl mb-6 text-xs font-bold leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Touch PinPad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                disabled={isLoading}
                className="py-3 text-lg font-black bg-slate-800/50 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl active:scale-95 transition-all text-center focus:outline-none min-h-[44px]"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="py-3 text-xs font-black bg-slate-950/50 hover:bg-slate-900 text-slate-400 rounded-xl active:scale-95 transition-all focus:outline-none min-h-[44px]"
            >
              LIMPIAR
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              disabled={isLoading}
              className="py-3 text-lg font-black bg-slate-800/50 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl active:scale-95 transition-all text-center focus:outline-none min-h-[44px]"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading}
              className="py-3 text-xs font-black bg-[#2E86C1] hover:bg-blue-600 text-white rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 focus:outline-none shadow-lg shadow-blue-500/10 min-h-[44px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  ENTRAR
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#2E86C1]/60" />
              FV MEGAMAYORISTA 2026
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AuthScreen;
