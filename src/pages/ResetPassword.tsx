import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/logo.png';
import heroVideo from '@/assets/hero.mp4';

const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase establece una sesión de recovery al abrir el enlace del email.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasRecoverySession(true);
      } else if (session) {
        setHasRecoverySession(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(!!data.session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    const r = passwordSchema.safeParse(password);
    if (!r.success) newErrors.password = r.error.errors[0].message;
    if (password !== confirm) newErrors.confirm = 'Las contraseñas no coinciden';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Contraseña actualizada. ¡Bienvenido de vuelta!');
        navigate('/', { replace: true });
      }
    } catch {
      toast.error('Algo salió mal. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-white md:text-3xl">Nueva contraseña</h1>
            <p className="mt-2 text-sm text-white/70">
              Elige una contraseña segura para tu cuenta
            </p>
          </div>

          {hasRecoverySession === false ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-white/80">
                Enlace inválido o expirado. Solicita uno nuevo desde el inicio de sesión.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full bg-gradient-brand text-white hover:opacity-90"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-white/90">Nueva contraseña</Label>
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
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirm" className="text-white/90">Confirmar contraseña</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
                  <Input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm}</p>}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || hasRecoverySession === null}
                className="w-full bg-gradient-brand text-white hover:opacity-90"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Actualizar contraseña'}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
