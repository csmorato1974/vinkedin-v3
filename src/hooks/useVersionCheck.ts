import { useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

const VERSION_STORAGE_KEY = 'app_version';
const CHECK_INTERVAL = 30000; // 30 seconds

interface VersionInfo {
  version: string;
  buildDate: string;
}

const handleUpdate = (newVersion: string) => {
  localStorage.setItem(VERSION_STORAGE_KEY, newVersion);
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

export const useVersionCheck = () => {
  const checkForUpdates = useCallback(async () => {
    try {
      // Add timestamp to bypass cache
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) return;
      
      const serverVersion: VersionInfo = await response.json();
      const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
      
      if (!storedVersion) {
        // First time - store current version
        localStorage.setItem(VERSION_STORAGE_KEY, serverVersion.version);
        return;
      }
      
      if (storedVersion !== serverVersion.version) {
        // New version available - show toast
        toast({
          title: "Nueva versión disponible",
          description: `Versión ${serverVersion.version} lista. Pulsa F5 o haz clic en Actualizar.`,
          duration: Infinity,
        });
        
        // Store a flag so we can show an update button
        window.dispatchEvent(new CustomEvent('app-update-available', { 
          detail: { version: serverVersion.version } 
        }));
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, []);

  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkForUpdates, 5000);
    
    // Periodic checks
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);
    
    // Also check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);
};

export { handleUpdate };
