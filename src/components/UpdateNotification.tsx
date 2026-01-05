import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const handleUpdate = () => {
  // Unregister service workers before reload
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }
  // Clear caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
  // Hard reload
  window.location.reload();
};

export const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    const handleUpdateEvent = (event: CustomEvent<{ version: string }>) => {
      setUpdateAvailable(true);
      setNewVersion(event.detail.version);
    };

    window.addEventListener('app-update-available', handleUpdateEvent as EventListener);
    
    return () => {
      window.removeEventListener('app-update-available', handleUpdateEvent as EventListener);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">
          Nueva versión {newVersion} disponible
        </span>
        <Button 
          size="sm" 
          variant="secondary"
          onClick={handleUpdate}
          className="ml-2"
        >
          Actualizar
        </Button>
      </div>
    </div>
  );
};
