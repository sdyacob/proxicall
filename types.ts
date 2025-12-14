export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  avatarUrl: string;
  location: Coordinates;
  isRegistered: boolean; // Is a user of this app
  lastSeen: Date;
}

export interface NearbyContact extends Contact {
  distanceKm: number;
}

export interface UserSettings {
  isTracking: boolean;
  shareLocation: boolean;
  alertRadiusKm: number;
}

export interface Alert {
  id: string;
  contactId: string;
  message: string;
  timestamp: Date;
  read: boolean;
}
