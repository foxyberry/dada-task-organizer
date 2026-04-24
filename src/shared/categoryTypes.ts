export interface CategoryRecord {
  id: string;
  name: string;
  userId: string;
  familyId?: string | null;
  createdAt: unknown;
}

export interface CreateCategoryRequest {
  name: string;
  familyId?: string | null;
}
