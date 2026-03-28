export interface AvatarDefinition {
  id: string;
  name: string;
  filename: string;
  unlockXP: number;
  description: string;
  type: 'rive' | 'fbx';
  animations?: Record<string, string>; // Például: { walk: 'Taunt_Walk.fbx', idle: 'Taunt_Idle.fbx' }
}

// Ide tölthetitek fel a Rive vagy FBX fájlokat, és adhattok hozzá újakat a jövőben!
// Mostantól csak 3D-s avatáraink lesznek!
export const AVATARS: AvatarDefinition[] = [
  { 
    id: "lany_3d", 
    name: "Lány Karakter (3D)", 
    filename: "lány/Taunt.fbx", 
    unlockXP: 0, 
    description: "Egy interaktív 3D-s lány karakter, aki elkísér a tanulásban!",
    type: 'fbx',
    animations: {
      idle: "lány/Taunt.fbx",
      walk: "lány/Martelo 2.fbx",
      feed: "lány/Petting Animal.fbx",
      happy: "lány/Sitting Clap.fbx",
      sad: "lány/Sad Walk.fbx",
      rejected: "lány/Rejected.fbx",
      argue: "lány/Standing Arguing.fbx",
      strong: "lány/Strong Gesture.fbx",
      dance_hiphop: "lány/Hip Hop Dancing.fbx",
      dance_break: "lány/Breakdance Uprock Var 2.fbx",
      dance_chicken: "lány/Chicken Dance.fbx",
      dance_twerk: "lány/Dancing Twerk.fbx",
      dance_maraschino: "lány/Dancing Maraschino Step.fbx",
      sitting: "lány/Female Sitting Pose.fbx",
      standing: "lány/Female Standing Pose.fbx",
      climbing: "lány/Climbing.fbx"
    }
  }
];
