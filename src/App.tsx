/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './lib/AppContext';
import CameraView from './components/CameraView';
import GalleryView from './components/GalleryView';
import SettingsView from './components/SettingsView';
import Navigation from './components/Navigation';

function AppContent() {
  const [currentView, setCurrentView] = useState<'camera' | 'gallery' | 'settings'>('camera');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 overflow-y-auto">
        {currentView === 'camera' && <CameraView />}
        {currentView === 'gallery' && <GalleryView />}
        {currentView === 'settings' && <SettingsView />}
      </main>
      <Navigation currentView={currentView} onChangeView={setCurrentView} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

