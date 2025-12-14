import React from 'react';
import { Phone, MapPin, Sparkles } from 'lucide-react';
import { NearbyContact } from '../types';

interface ContactCardProps {
  contact: NearbyContact;
  onCall: (phone: string) => void;
  onAIHelp: (contact: NearbyContact) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onCall, onAIHelp }) => {
  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between animate-fade-in">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img 
            src={contact.avatarUrl} 
            alt={contact.name} 
            className="w-12 h-12 rounded-full border-2 border-slate-600 object-cover"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">{contact.name}</h3>
          <div className="flex items-center text-xs text-green-400">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{contact.distanceKm} km away</span>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
         <button 
          onClick={() => onAIHelp(contact)}
          className="p-2 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30 transition-colors"
          title="AI Suggestions"
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onCall(contact.phoneNumber)}
          className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20"
          title="Call Now"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ContactCard;
