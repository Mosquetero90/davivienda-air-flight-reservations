import { Injectable, signal } from '@angular/core';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  documentType: 'CC' | 'CE' | 'PASSPORT';
  documentNumber: string;
  phone: string;
}

const PRESET_USERS: UserProfile[] = [
  {
    id: 'user_carlos_m',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@davivienda.com',
    documentType: 'CC',
    documentNumber: '1020482910',
    phone: '3108924411',
  },
  {
    id: 'user_ana_rodriguez',
    name: 'Ana Rodríguez',
    email: 'ana.rodriguez@davivienda.com',
    documentType: 'CC',
    documentNumber: '1032891024',
    phone: '3157788990',
  },
  {
    id: 'user_felipe_gomez',
    name: 'Felipe Gómez',
    email: 'felipe.gomez@davivienda.com',
    documentType: 'CC',
    documentNumber: '1018992011',
    phone: '3204455667',
  },
];

@Injectable({
  providedIn: 'root',
})
export class UserSessionService {
  private readonly STORAGE_KEY = 'dv_user_profile';

  public readonly currentUser = signal<UserProfile>(this.loadInitialUser());
  public readonly availableUsers = signal<UserProfile[]>(PRESET_USERS);

  private loadInitialUser(): UserProfile {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    // Asignar primer usuario por defecto
    return PRESET_USERS[0];
  }

  public switchUser(user: UserProfile) {
    this.currentUser.set(user);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignorar error de storage
    }
  }

  public setCustomUser(name: string) {
    const id = `user_${name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 1000)}`;
    const customUser: UserProfile = {
      id,
      name,
      email: `${id}@davivienda.com`,
      documentType: 'CC',
      documentNumber: `${Math.floor(1000000000 + Math.random() * 900000000)}`,
      phone: '3001234567',
    };
    this.switchUser(customUser);
  }
}
