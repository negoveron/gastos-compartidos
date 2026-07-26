export interface Group {
  id: number;
  nombre: string;
  ownerId: number;
  isOwner?: boolean;
}

export interface GroupMember {
  userId: number;
  email: string;
  nombre?: string;
  isOwner: boolean;
}