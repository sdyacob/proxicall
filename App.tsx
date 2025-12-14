import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Navigation, 
  Map as MapIcon, 
  Users, 
  Settings, 
  Power,
  Bell,
  X,
  Phone,
  Plus,
  Save
} from 'lucide-react';
import { 
  Coordinates, 
  Contact, 
  NearbyContact, 
  Alert 
} from './types';
import { 
  INITIAL_CONTACTS, 
  MOCK_USER_START_LOCATION, 
  RADAR_RADIUS_KM 
} from './constants';
import { calculateDistanceKm } from './services/locationService';
import { generateIceBreaker, suggestMeetingPoint } from './services/geminiService';
import Radar from './components/Radar';
import ContactCard from './components/ContactCard';

// Simulate moving contacts random walk
const moveContacts = (contacts: Contact[]): Contact[] => {
  return contacts.map(c => {
    // Only move registered users
    if (!c.isRegistered) return c;
    
    // Add small random noise to lat/long to simulate walking/driving
    // Approx 0.0001 deg is ~11 meters
    const latMove = (Math.random() - 0.5) * 0.0005; 
    const lonMove = (Math.random() - 0.5) * 0.0005;

    return {
      ...c,
      location: {
        latitude: c.location.latitude + latMove,
        longitude: c.location.longitude + lonMove
      }
    };
  });
};

const App: React.FC = () => {
  // App State
  const [activeTab, setActiveTab] = useState<'radar' | 'list' | 'settings'>('radar');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [nearbyContacts, setNearbyContacts] = useState<NearbyContact[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Add Contact State
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Modal / AI State
  const [selectedContact, setSelectedContact] = useState<NearbyContact | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Simulation Interval Ref
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // --- Location Tracking & Simulation ---

  // Toggle Tracking
  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      setUserLocation(null);
      if (simulationRef.current) clearInterval(simulationRef.current);
    } else {
      // Start tracking (Simulated for web demo)
      setIsTracking(true);
      
      // Request permission (Mocking the browser API call structure)
      if ('geolocation' in navigator) {
         navigator.geolocation.getCurrentPosition(
           (position) => {
             // Use real position if available, or fallback to mock NYC for demo consistency if user denies/fails
             setUserLocation({
               latitude: position.coords.latitude,
               longitude: position.coords.longitude
             });
           },
           (error) => {
             console.warn("Geolocation denied or failed, using Mock Location for Demo", error);
             setUserLocation(MOCK_USER_START_LOCATION);
           }
         );
      } else {
         setUserLocation(MOCK_USER_START_LOCATION);
      }
    }
  };

  // Simulation Loop
  useEffect(() => {
    if (!isTracking || !userLocation) return;

    const interval = setInterval(() => {
      // 1. Move mock contacts
      setAllContacts(prev => {
        const moved = moveContacts(prev);
        
        // 2. Check Distances
        const nearby: NearbyContact[] = [];
        moved.forEach(contact => {
          if (!contact.isRegistered) return;
          
          const dist = calculateDistanceKm(userLocation, contact.location);
          if (dist <= RADAR_RADIUS_KM) {
            nearby.push({ ...contact, distanceKm: dist });
          }
        });

        // 3. Update Nearby State
        setNearbyContacts(nearby);

        // 4. Generate Alert if new nearby contact found (simplified logic: check if not already alerted recently)
        // For this demo, we'll just show the latest nearby count in badge
        
        return moved;
      });
      
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isTracking, userLocation]);


  // --- Actions ---

  const handleCall = (phone: string) => {
    // In a real mobile app, this would trigger Linking.openURL(`tel:${phone}`)
    // On web, we simulate
    const confirmed = window.confirm(`Call ${phone}?`);
    if (confirmed) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newContact: Contact = {
      id: Date.now().toString(),
      name: newContactName,
      phoneNumber: newContactPhone,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newContactName)}&background=random`,
      // Place them randomly near the user/start location so they might appear on radar
      location: {
        latitude: MOCK_USER_START_LOCATION.latitude + (Math.random() - 0.5) * 0.04,
        longitude: MOCK_USER_START_LOCATION.longitude + (Math.random() - 0.5) * 0.04
      },
      isRegistered: true, // Assume they use the app for this demo
      lastSeen: new Date()
    };

    setAllContacts(prev => [...prev, newContact]);
    setNewContactName('');
    setNewContactPhone('');
    setIsAddingContact(false);
  };

  const handleAIHelp = async (contact: NearbyContact) => {
    setSelectedContact(contact);
    setIsAiLoading(true);
    setAiResponse('');
    
    // Call Gemini Service
    const suggestions = await generateIceBreaker(contact, "I'm walking around the city, free for an hour.");
    setAiResponse(suggestions);
    setIsAiLoading(false);
  };
  
  const handleAIMeetup = async () => {
    if(!selectedContact || !userLocation) return;
    setIsAiLoading(true);
    const locStr = `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`;
    const suggestions = await suggestMeetingPoint(selectedContact, locStr);
    setAiResponse(suggestions);
    setIsAiLoading(false);
  };

  const closeModal = () => {
    setSelectedContact(null);
    setAiResponse('');
  };

  // --- Render Helpers ---

  const renderRadarView = () => (
    <div className="flex flex-col h-full p-4 relative">
       {/* Status Header */}
       <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
              Proximity Scan
            </h2>
            <p className="text-sm text-slate-400">
              {isTracking 
                ? `${nearbyContacts.length} contacts nearby` 
                : 'Tracking paused'}
            </p>
          </div>
          <button 
            onClick={toggleTracking}
            className={`p-4 rounded-full shadow-lg transition-all duration-300 ${isTracking ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-red-500/20' : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/30'}`}
          >
            <Power className="w-6 h-6" />
          </button>
       </div>

       {/* Radar Visualization */}
       <div className="flex-grow flex items-center justify-center relative">
          <Radar 
            userLocation={userLocation} 
            contacts={nearbyContacts} 
            onContactClick={handleAIHelp}
          />
          
          {!isTracking && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10 rounded-3xl">
               <div className="text-center p-6">
                 <Power className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                 <p className="text-slate-300">Tap the power button to start scanning your surroundings.</p>
               </div>
             </div>
          )}
       </div>

       {/* Quick List (Bottom Sheet style) */}
       {isTracking && nearbyContacts.length > 0 && (
         <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Nearest Friends</h3>
            {nearbyContacts.slice(0, 2).map(c => (
              <ContactCard 
                key={c.id} 
                contact={c} 
                onCall={handleCall}
                onAIHelp={handleAIHelp}
              />
            ))}
         </div>
       )}
    </div>
  );

  const renderContactList = () => (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-100">Your Network</h2>
        <button 
          onClick={() => setIsAddingContact(!isAddingContact)}
          className={`p-2 rounded-lg transition-colors ${isAddingContact ? 'bg-red-500/20 text-red-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
        >
          {isAddingContact ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>

      {/* Add Contact Form */}
      {isAddingContact && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 animate-in slide-in-from-top-4 fade-in">
           <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Add New Contact</h3>
           <div className="space-y-3">
             <input
                type="text"
                placeholder="Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-3 focus:outline-none focus:border-green-500 transition-colors"
             />
             <input
                type="tel"
                placeholder="Phone Number"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-3 focus:outline-none focus:border-green-500 transition-colors"
             />
             <button 
                onClick={handleAddContact}
                disabled={!newContactName || !newContactPhone}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
             >
               <Save className="w-4 h-4" />
               <span>Save Contact</span>
             </button>
           </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {allContacts.length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No contacts yet. Add someone to start!</p>
          </div>
        )}
        {allContacts.map(contact => {
          const isNearby = nearbyContacts.find(n => n.id === contact.id);
          return (
            <div key={contact.id} className={`p-4 rounded-xl border flex items-center justify-between ${isNearby ? 'bg-slate-800 border-green-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
              <div className="flex items-center space-x-3">
                <img src={contact.avatarUrl} alt={contact.name} className="w-10 h-10 rounded-full grayscale opacity-80" />
                <div>
                  <p className="text-slate-200 font-medium">{contact.name}</p>
                  <p className="text-xs text-slate-500">{contact.phoneNumber}</p>
                </div>
              </div>
              {isNearby ? (
                <span className="text-xs font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                  {isNearby.distanceKm} km
                </span>
              ) : (
                <span className="text-xs text-slate-600">Offline/Far</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden flex flex-col">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'radar' && renderRadarView()}
        {activeTab === 'list' && renderContactList()}
        {activeTab === 'settings' && (
          <div className="p-8 text-center text-slate-500 mt-20">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-300">Settings</h3>
            <p className="mt-2">Privacy, Notification, and Account settings would go here.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-16 bg-slate-800 border-t border-slate-700 flex items-center justify-around px-2 z-50">
        <button 
          onClick={() => setActiveTab('radar')}
          className={`p-2 rounded-xl transition-all ${activeTab === 'radar' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Navigation className="w-6 h-6" />
        </button>
        <button 
           onClick={() => setActiveTab('list')}
           className={`p-2 rounded-xl transition-all ${activeTab === 'list' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-6 h-6" />
        </button>
        <button 
           onClick={() => setActiveTab('settings')}
           className={`p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Settings className="w-6 h-6" />
        </button>
      </nav>

      {/* Detail / AI Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-slate-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <img src={selectedContact.avatarUrl} className="w-10 h-10 rounded-full border border-green-500" />
                  <div>
                    <h3 className="font-bold text-lg">{selectedContact.name}</h3>
                    <p className="text-xs text-green-400">{selectedContact.distanceKm} km away</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-slate-700 rounded-full">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                   <button 
                    onClick={() => handleCall(selectedContact.phoneNumber)}
                    className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
                   >
                     <Phone className="w-4 h-4" />
                     <span>Call</span>
                   </button>
                   <button 
                    className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors"
                    onClick={() => { /* Real app would open SMS intent */ alert("Opens SMS app"); }}
                   >
                     <Bell className="w-4 h-4" />
                     <span>Alert</span>
                   </button>
                </div>

                {/* AI Assistant Section */}
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                   <div className="flex items-center space-x-2 mb-3">
                     <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-md flex items-center justify-center">
                       <span className="text-xs font-bold text-white">AI</span>
                     </div>
                     <h4 className="font-semibold text-slate-200">Smart Assist</h4>
                   </div>

                   <div className="space-y-2 mb-4">
                     {isAiLoading ? (
                       <div className="space-y-2 animate-pulse">
                         <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                         <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                       </div>
                     ) : (
                       <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                         {aiResponse || "Use AI to draft an icebreaker message or find a meeting spot halfway between you."}
                       </div>
                     )}
                   </div>
                   
                   <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleAIHelp(selectedContact)}
                        disabled={isAiLoading}
                        className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-2 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                      >
                        Draft Message
                      </button>
                      <button 
                        onClick={handleAIMeetup}
                        disabled={isAiLoading}
                        className="text-xs bg-pink-500/20 text-pink-300 px-3 py-2 rounded-lg border border-pink-500/30 hover:bg-pink-500/30 transition-colors"
                      >
                        Suggest Meetup
                      </button>
                   </div>
                </div>

              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;