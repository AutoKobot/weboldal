export interface AvatarDefinition {
  id: string;
  name: string;
  filename: string;
  unlockXP: number;
  description: string;
}

// Ide tölthetitek fel a Rive fájlokat, és adhattok hozzá újakat a jövőben!
export const AVATARS: AvatarDefinition[] = [
  { 
    id: "alap_robot", 
    name: "Kezdő Robot", 
    filename: "robot.riv", 
    unlockXP: 500, 
    description: "Egy fém barát, ami mindig veled tanul." 
  },
  { 
    id: "kis_sarkany", 
    name: "Tűzsárkány", 
    filename: "dragon.riv", 
    unlockXP: 1000, 
    description: "Heves és forrófejű jószág haladóknak." 
  },
  { 
    id: "tudas_bagoly", 
    name: "Bölcs Bagoly", 
    filename: "owl.riv", 
    unlockXP: 2500, 
    description: "Kíváncsi madárka, szereti a tudományt." 
  },
  { 
    id: "kiber_kutyus", 
    name: "Kiber Kutyus", 
    filename: "dog.riv", 
    unlockXP: 5000, 
    description: "Hűséges jószág, igazi veterán diákoknak." 
  }
];
