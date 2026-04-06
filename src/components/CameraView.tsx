import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, MapPin, Loader2, Video } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppContext } from '../lib/AppContext';
import { savePhoto } from '../lib/db';
import { generateUniqueCode } from '../lib/utils';

export default function CameraView() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { settings } = useAppContext();
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("Buscando ubicación...");
  const [taking, setTaking] = useState(false);
  const [flash, setFlash] = useState(false);
  
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number>();
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  // Fetch location continuously
  useEffect(() => {
    if (!navigator.geolocation) {
      setAddress("Geolocalización no soportada");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });

        try {
          const gmapsKey = import.meta.env.VITE_GMAPS_API_KEY;
          if (gmapsKey) {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${gmapsKey}&language=es`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
              const comps = data.results[0].address_components;
              const getComp = (types: string[]) => comps.find((c: any) => types.some((t: string) => c.types.includes(t)))?.long_name;
              
              const street = getComp(['route']) || '';
              const num = getComp(['street_number']) || '';
              const addressPart = street ? `${street} ${num}`.trim() : '';
              const neighborhood = getComp(['neighborhood', 'sublocality_level_1', 'sublocality']);
              const locality = getComp(['locality', 'administrative_area_level_2', 'administrative_area_level_3']);
              const admin = getComp(['administrative_area_level_1']);
              const country = getComp(['country']);
              
              const parts = [];
              if (addressPart) parts.push(`Dirección: ${addressPart}`);
              else parts.push(`Dirección: ${data.results[0].formatted_address.split(',')[0]}`);
              
              if (neighborhood) parts.push(`Barrio ${neighborhood}`);
              if (locality) parts.push(`Localidad ${locality}`);
              if (admin) parts.push(admin);
              if (country) parts.push(country);
              
              const uniqueParts = [...new Set(parts)];
              setAddress(uniqueParts.join(', '));
              return;
            }
          }
          
          // Fallback 1: Nominatim (OpenStreetMap) for street-level address
          try {
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              headers: { 'Accept-Language': 'es' }
            });
            if (nomRes.ok) {
              const nomData = await nomRes.json();
              if (nomData && nomData.address) {
                const road = nomData.address.road || nomData.address.pedestrian || '';
                const houseNumber = nomData.address.house_number || '';
                const addressPart = road ? `${road} ${houseNumber}`.trim() : '';
                const neighborhood = nomData.address.neighbourhood || nomData.address.suburb || '';
                const locality = nomData.address.city || nomData.address.town || nomData.address.village || nomData.address.county || '';
                
                const parts = [];
                if (addressPart) parts.push(`Dirección: ${addressPart}`);
                if (neighborhood) parts.push(`Barrio ${neighborhood}`);
                if (locality) parts.push(`Localidad ${locality}`);
                if (nomData.address.state) parts.push(nomData.address.state);
                
                const uniqueParts = [...new Set(parts)];
                if (uniqueParts.length > 0) {
                  setAddress(uniqueParts.join(', '));
                  return;
                }
              }
            }
          } catch (nomErr) {
            console.warn("Nominatim fallback failed", nomErr);
          }
          
          // Fallback 2: BigDataCloud (City level)
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          
          if (data) {
            const parts = [];
            if (data.locality) parts.push(`Localidad ${data.locality}`);
            if (data.city) parts.push(data.city);
            if (data.principalSubdivision) parts.push(data.principalSubdivision);
            if (data.countryName) parts.push(data.countryName);
            
            const uniqueParts = [...new Set(parts)];
            setAddress(uniqueParts.join(', ') || `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          } else {
            setAddress(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (e) {
          console.error("Error fetching address", e);
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (error) => {
        console.error(error);
        setAddress("Error obteniendo GPS");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Load static map image
  useEffect(() => {
    const gmapsKey = import.meta.env.VITE_GMAPS_API_KEY;
    if (location && gmapsKey) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { mapImageRef.current = img; };
      img.src = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=16&size=300x300&markers=color:red%7C${location.lat},${location.lng}&key=${gmapsKey}`;
    } else {
      mapImageRef.current = null;
    }
  }, [location]);

  const drawWatermark = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, uniqueCode: string) => {
    const now = new Date();
    const timeStr = format(now, 'HH:mm:ss');
    const dateStr = format(now, "dd MMM yyyy", { locale: es });

    // Draw Map (Bottom Left)
    const mapSize = 200;
    const mapX = 20;
    const mapY = height - mapSize - 20;

    if (mapImageRef.current) {
      ctx.drawImage(mapImageRef.current, mapX, mapY, mapSize, mapSize);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    } else {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
      ctx.fillStyle = 'black';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Mapa no disp.', mapX + mapSize/2, mapY + mapSize/2 - 10);
      ctx.fillText('(Falta API Key)', mapX + mapSize/2, mapY + mapSize/2 + 10);
    }

    // Draw Text (Right Aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    let currentY = height - 20; // Start from bottom
    
    // 1. ID
    ctx.font = '16px Arial';
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`ID: ${uniqueCode} - Foto 100% Real`, width - 20, currentY);
    currentY -= 25;
    
    // 2. Coordenadas
    ctx.font = '18px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Coordenadas: ${location?.lat.toFixed(6)}, ${location?.lng.toFixed(6)}`, width - 20, currentY);
    currentY -= 25;
    
    // 3. Address (Bottom-up wrap)
    ctx.font = '20px Arial';
    const maxChars = 50;
    const addressLines = [];
    let remaining = address;
    while (remaining.length > 0) {
        if (remaining.length <= maxChars) {
            addressLines.push(remaining);
            break;
        }
        let splitIndex = remaining.lastIndexOf(' ', maxChars);
        if (splitIndex === -1) splitIndex = maxChars;
        addressLines.push(remaining.substring(0, splitIndex));
        remaining = remaining.substring(splitIndex + 1).trim();
    }
    // Draw lines in reverse order (bottom-up)
    for (let i = addressLines.length - 1; i >= 0; i--) {
        ctx.fillText(addressLines[i], width - 20, currentY);
        currentY -= 25;
    }
    
    // 4. User & Zone
    ctx.font = '22px Arial';
    ctx.fillText(`Usuario: ${settings.user || 'N/A'} | Zona: ${settings.zone || 'N/A'}`, width - 20, currentY);
    currentY -= 30;
    
    // 5. Date & Time
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${dateStr} ${timeStr}`, width - 20, currentY);
    
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }, [address, location, settings]);

  const capturePhoto = useCallback(async () => {
    const video = webcamRef.current?.video;
    if (!video || !location) return;
    
    setTaking(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 100);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const uniqueCode = generateUniqueCode();
      drawWatermark(ctx, canvas.width, canvas.height, uniqueCode);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      await savePhoto({
        id: uniqueCode,
        type: 'photo',
        dataUrl,
        timestamp: Date.now(),
        user: settings.user,
        zone: settings.zone,
        latitude: location.lat,
        longitude: location.lng,
        address: address,
        synced: false
      });
    }

    setTaking(false);
  }, [webcamRef, location, address, settings, drawWatermark]);

  const startRecording = useCallback(() => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;
    if (!video || !canvas || !location) return;

    setIsRecording(true);
    isRecordingRef.current = true;
    chunksRef.current = [];
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const uniqueCode = generateUniqueCode();

    const loop = () => {
      if (!isRecordingRef.current) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawWatermark(ctx, canvas.width, canvas.height, uniqueCode);
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      await savePhoto({
        id: uniqueCode,
        type: 'video',
        blob,
        timestamp: Date.now(),
        user: settings.user,
        zone: settings.zone,
        latitude: location.lat,
        longitude: location.lng,
        address,
        synced: false
      });
    };
    
    recorder.start();
    mediaRecorderRef.current = recorder;
  }, [webcamRef, location, address, settings, drawWatermark]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment"
  };

  return (
    <div className="relative h-[calc(100vh-64px)] bg-black overflow-hidden">
      {flash && <div className="absolute inset-0 bg-white z-50 opacity-80 transition-opacity duration-100" />}
      
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="w-full h-full object-cover"
      />
      
      {/* Hidden canvas for video recording */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live Overlay Preview */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
        <div className="flex justify-between items-start">
          {isRecording && (
            <div className="bg-red-500/80 text-white px-3 py-1 rounded-full flex items-center animate-pulse backdrop-blur-sm">
              <div className="w-2 h-2 bg-white rounded-full mr-2" />
              REC
            </div>
          )}
          <div className="bg-black/50 p-2 rounded text-right backdrop-blur-sm ml-auto">
            <p className="text-white font-bold">Timemark</p>
            <p className="text-green-400 text-xs">Foto 100% Real</p>
          </div>
        </div>
        
        <div className="flex justify-between items-end w-full pb-32">
          {/* Map Preview */}
          <div className="w-32 h-32 bg-black/50 rounded-lg overflow-hidden border-2 border-white/50 backdrop-blur-sm">
            {mapImageRef.current ? (
              <img src={mapImageRef.current.src} alt="Map" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-xs text-center p-2">
                <MapPin className="h-6 w-6 mb-1" />
                Sin API Key
              </div>
            )}
          </div>

          {/* Text Preview */}
          <div className="text-right text-white drop-shadow-md max-w-[60%]">
            <p className="text-2xl font-bold">{format(new Date(), 'HH:mm:ss')}</p>
            <p className="text-sm mb-1">{format(new Date(), "dd MMM yyyy", { locale: es })}</p>
            <p className="text-xs font-bold text-blue-300">
              U: {settings.user || '-'} | Z: {settings.zone || '-'}
            </p>
            <p className="text-[10px] ml-auto text-gray-200 mt-1 break-words text-right">{address}</p>
            <p className="text-[10px] font-mono text-gray-300 mt-0.5">
              Coordenadas: {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-6 pb-safe">
        <button 
          onClick={() => !isRecording && setMode('photo')} 
          className={`font-bold transition-colors ${mode === 'photo' ? 'text-yellow-400' : 'text-white/70'}`}
          disabled={isRecording}
        >
          FOTO
        </button>
        <button 
          onClick={() => !isRecording && setMode('video')} 
          className={`font-bold transition-colors ${mode === 'video' ? 'text-yellow-400' : 'text-white/70'}`}
          disabled={isRecording}
        >
          VIDEO
        </button>
      </div>

      {/* Capture Button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center pb-safe">
        <button
          onClick={mode === 'photo' ? capturePhoto : (isRecording ? stopRecording : startRecording)}
          disabled={taking || !location}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 ${
            taking || !location ? 'bg-gray-400/50' : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          {taking ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : mode === 'video' && isRecording ? (
            <div className="w-8 h-8 bg-red-500 rounded-sm" />
          ) : (
            <div className={`w-16 h-16 rounded-full ${mode === 'video' ? 'bg-red-500' : 'bg-white'}`} />
          )}
        </button>
      </div>
      
      {!location && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-4 py-2 rounded-lg flex items-center backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Obteniendo GPS...
        </div>
      )}
    </div>
  );
}
