import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import logo from '@/assets/logo.png';
import heroVideo from '@/assets/hero.mp4';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');
const nameSchema = z.string().min(2, 'El nombre debe tener al menos 2 caracteres');

type Mode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const validate = () => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    if (!isForgot) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    if (mode === 'signup') {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Te enviamos un email con instrucciones para restablecer tu contraseña.');
          switchMode('login');
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Credenciales inválidas. Verifica tu email y contraseña.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('¡Bienvenido de vuelta!');
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email ya está registrado. ¿Quieres iniciar sesión?');
            switchMode('login');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('¡Cuenta creada! Ya puedes comenzar.');
        }
      }
    } catch (error) {
      toast.error('Algo salió mal. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = isForgot
    ? 'Recuperar contraseña'
    : isLogin
    ? 'Bienvenido de vuelta'
    : 'Únete a VinkedIn';
  const subtitle = isForgot
    ? 'Te enviaremos un enlace para restablecerla'
    : isLogin
    ? 'Inicia sesión para continuar'
    : 'Crea tu cuenta y conecta con profesionales';

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <video
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        onEnded={(e) => e.currentTarget.pause()}
      >
        <source src={heroVideo} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute left-4 top-4 flex items-center gap-2 md:left-8 md:top-8"
        >
          <img src={logo} alt="VinkedIn" className="h-12 w-12 md:h-14 md:w-14" />
          <span className="text-2xl font-bold text-white md:text-3xl">VinkedIn</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8"
        >
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-white/70">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="name" className="text-white/90">
                    Nombre completo
                  </Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                      placeholder="Tu nombre"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-white/90">
                Email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            {!isForgot && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/90">
                    Contraseña
                  </Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/20 bg-white/10 pl-10 pr-10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-brand text-white hover:opacity-90"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isForgot ? (
                'Enviar enlace de recuperación'
              ) : isLogin ? (
                'Iniciar sesión'
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            {isForgot ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode(isLogin ? 'signup' : 'login')}
                className="text-sm text-white/70 hover:text-white"
              >
                {isLogin ? (
                  <>
                    ¿No tienes cuenta?{' '}
                    <span className="font-semibold text-primary">Regístrate</span>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{' '}
                    <span className="font-semibold text-primary">Inicia sesión</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
