export type MemberPosition = '초원지기' | '목자' | '목원';
export type MemberGender = '남' | '여';

export interface Member {
  id: string;
  name: string;
  phone: string | null;
  gender: MemberGender | null;
  age_group: string | null;
  birth_date: string | null;
  position: MemberPosition;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberFormInput {
  name: string;
  phone: string;
  gender: MemberGender | '';
  age_group: string;
  birth_date: string;
  position: MemberPosition;
  parent_id: string | null;
}
