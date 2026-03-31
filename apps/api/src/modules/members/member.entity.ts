export interface Member {
  id: string;
  familyId: string;
  name: string;
  generation?: number;
  alias?: string;
  isLiving: boolean;
  createdAt: string;
}
