export type ScreenType = 
  | 'overview' 
  | 'applications' 
  | 'case' 
  | 'compliance' 
  | 'evc' 
  | 'documents' 
  | 'alerts' 
  | 'audit' 
  | 'rules';

export type RoleType = 
  | 'Scrutiny Officer'
  | 'Institution User'
  | 'Committee Coordinator'
  | 'Regional Officer'
  | 'Competent Authority'
  | 'System Operator';

export const ALL_ROLES: RoleType[] = [
  'Scrutiny Officer',
  'Institution User',
  'Committee Coordinator',
  'Regional Officer',
  'Competent Authority',
  'System Operator',
];

export interface NavCounts {
  applications: number;
  alerts: number;
  evc: number;
  compliance: number;
  documents: number;
}
