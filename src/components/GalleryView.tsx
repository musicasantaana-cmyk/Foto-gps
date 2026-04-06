import React, { useEffect, useState } from 'react';
import { getPhotos, PhotoRecord } from '../lib/db';
import { syncPhotosToDrive } from '../lib/drive';
import { CloudUpload, CheckCircle, Clock, AlertCircle, Download, Video } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function MediaItem({ record }: { record: PhotoRecord }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    if (record.type === 'video' && record.blob) {
      const objUrl = URL.createObjectURL(record.blob);
      setUrl(objUrl);
      return () => URL.revokeObjectURL(objUrl);
    } else if (record.dataUrl) {
      setUrl(record.dataUrl);
    }
  }, [record]);

  if (!url) return <div className="w-full h-full bg-gray-200 animate-pulse" />;

  return record.type === 'video' ? (
    <video src={url} controls className="w-full h-full object-cover" />
  ) : (
    <img src={url} alt={`Registro ${record.id}`} className="w-full h-full object-cover" />
  );
}

export default function GalleryView() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadPhotos = async () => {
    const data = await getPhotos();
    // Sort by newest first
    setPhotos(data.sort((a, b) => b.timestamp - a.timestamp));
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleSync = async () => {
    const unsynced = photos.filter(p => !p.synced);
    if (unsynced.length === 0) return;

    setSyncing(true);
    setProgress(0);
    
    try {
      await syncPhotosToDrive(unsynced, (p) => setProgress(p));
      await loadPhotos();
    } catch (error) {
      console.error("Error syncing:", error);
      alert("Error al sincronizar. Revisa tu conexión.");
    } finally {
      setSyncing(false);
      setProgress(0);
    }
  };

  const handleDownload = (photo: PhotoRecord) => {
    const a = document.createElement('a');
    if (photo.type === 'video' && photo.blob) {
      a.href = URL.createObjectURL(photo.blob);
      a.download = `Logistica_${photo.user}_${photo.zone}_${format(photo.timestamp, 'yyyyMMdd_HHmmss')}.webm`;
    } else if (photo.dataUrl) {
      a.href = photo.dataUrl;
      a.download = `Logistica_${photo.user}_${photo.zone}_${format(photo.timestamp, 'yyyyMMdd_HHmmss')}.jpg`;
    }
    a.click();
  };

  const unsyncedCount = photos.filter(p => !p.synced).length;

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registros</h2>
        
        <button
          onClick={handleSync}
          disabled={syncing || unsyncedCount === 0}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            unsyncedCount > 0 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CloudUpload className="h-4 w-4 mr-2" />
          {syncing ? `Sincronizando ${progress}%` : `Sincronizar (${unsyncedCount})`}
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
          <AlertCircle className="h-12 w-12 mb-3 text-gray-300" />
          <p>No hay fotos ni videos guardados localmente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                <MediaItem record={photo} />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button 
                    onClick={() => handleDownload(photo)}
                    className="bg-white/90 text-gray-800 p-1.5 rounded-full shadow-sm hover:bg-white transition-colors"
                    title="Descargar archivo"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {photo.synced ? (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center shadow-sm">
                      <CheckCircle className="h-3 w-3 mr-1" /> Subido
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center shadow-sm">
                      <Clock className="h-3 w-3 mr-1" /> Pendiente
                    </span>
                  )}
                </div>
                {photo.type === 'video' && (
                  <div className="absolute top-2 left-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm">
                    <Video className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="p-3 text-sm">
                <p className="font-semibold text-gray-800 truncate">{photo.address}</p>
                <div className="flex justify-between mt-1 text-gray-500 text-xs">
                  <span>{format(photo.timestamp, "dd MMM yyyy, HH:mm", { locale: es })}</span>
                  <span className="font-mono">{photo.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
