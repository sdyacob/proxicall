import { Contact } from './types';

export const MOCK_USER_START_LOCATION = {
  latitude: 40.7128, // NYC ish
  longitude: -74.0060
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Yacob',
    phoneNumber: '9943926886',
    avatarUrl: 'https://ui-avatars.com/api/?name=Yacob&background=random',
    location: { latitude: 40.7145, longitude: -74.0075 }, // Nearby (~0.2km from start)
    isRegistered: true,
    lastSeen: new Date()
  }
];

export const RADAR_RADIUS_KM = 5;