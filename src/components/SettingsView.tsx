import React, { useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { Save, User, MapPin, Key, Cloud, Mail, Folder } from 'lucide-react';

export default function SettingsView() {
  const { settings, updateSettings } = useAppContext();
  const [user, setUser] = useState(settings.user);
  const [zone, setZone] = useState(settings.zone);
  const [backupEmail, setBackupEmail] = useState(settings.backupEmail || '');
  const [driveFolderId, setDriveFolderId] = useState(settings.driveFolderId || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings({ user, zone, backupEmail, driveFolderId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGoogleConnect = async () => {
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Por favor, permite las ventanas emergentes (popups) para conectar tu cuenta.');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Error al iniciar la conexión con Google.');
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        updateSettings({ googleConnected: true });
        // In a real app, you might save tokens to localStorage or context here
        // localStorage.setItem('google_tokens', JSON.stringify(event.data.tokens));
        alert(`¡Conectado exitosamente como ${event.data.user?.email || 'usuario'}!`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [updateSettings]);

  return (
    <div className="p-6 max-w-md mx-auto pb-24">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Configuración</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Usuario (Operador)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej. Juan Pérez"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zona Asignada
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej. Zona Norte - Sector A"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Configuración de Respaldo</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo de Backup (Opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={backupEmail}
                  onChange={(e) => setBackupEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="backup@empresa.com"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Correo independiente para copias de seguridad.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID de Carpeta Drive (Opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Folder className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1A2b3C4d5E6f7G8h9I0j..."
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">ID de la carpeta compartida de Google Drive donde se subirán las fotos.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Save className="h-5 w-5 mr-2" />
          {saved ? 'Guardado' : 'Guardar Configuración'}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Servicios de Google</h3>
        <p className="text-sm text-gray-600 mb-4">
          Conecta tu cuenta de Google para permitir que la aplicación sincronice las fotos y videos capturados directamente a tu Google Drive.
        </p>
        <button
          onClick={handleGoogleConnect}
          className={`w-full flex justify-center items-center py-3 px-4 border rounded-lg shadow-sm transition-colors ${
            settings.googleConnected 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Cloud className={`h-5 w-5 mr-2 ${settings.googleConnected ? 'text-green-500' : 'text-gray-400'}`} />
          {settings.googleConnected ? 'Conectado a Google Drive' : 'Conectar con Google'}
        </button>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
        <p className="font-semibold mb-1">Nota sobre el almacenamiento:</p>
        <p>Las fotos y videos se guardarán localmente en el dispositivo. No hay auto-borrado. La sincronización subirá los archivos a Google Drive respetando la estructura de carpetas por Usuario y Zona.</p>
      </div>
    </div>
  );
}
