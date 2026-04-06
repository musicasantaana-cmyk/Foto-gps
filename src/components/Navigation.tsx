import React from 'react';
import { Camera, Image as ImageIcon, Settings } from 'lucide-react';

interface NavigationProps {
  currentView: 'camera' | 'gallery' | 'settings';
  onChangeView: (view: 'camera' | 'gallery' | 'settings') => void;
}

export default function Navigation({ currentView, onChangeView }: NavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={() => onChangeView('gallery')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'gallery' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ImageIcon className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Registros</span>
        </button>
        
        <button
          onClick={() => onChangeView('camera')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'camera' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Camera className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Cámara</span>
        </button>
        
        <button
          onClick={() => onChangeView('settings')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            currentView === 'settings' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Settings className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Ajustes</span>
        </button>
      </div>
    </div>
  );
}
