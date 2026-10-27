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

export const ROLE_PERMITTED_SCREENS: Record<RoleType, ScreenType[]> = {
  'Institution User': ['overview', 'applications', 'case', 'documents', 'compliance'],
  'Scrutiny Officer': ['overview', 'applications', 'case', 'evc', 'rules', 'compliance', 'alerts', 'audit', 'documents'],
  'Regional Officer': ['overview', 'applications', 'case', 'compliance', 'alerts', 'audit'],
  'Committee Coordinator': ['overview', 'applications', 'case', 'evc'],
  'Competent Authority': ['overview', 'applications', 'case', 'compliance', 'alerts', 'audit'],
  'System Operator': ['overview', 'rules', 'audit', 'alerts'],
};

export const ROLE_DEFAULT_SCREEN: Record<RoleType, ScreenType> = {
  'Institution User': 'applications',
  'Scrutiny Officer': 'overview',
  'Regional Officer': 'overview',
  'Committee Coordinator': 'evc',
  'Competent Authority': 'overview',
  'System Operator': 'overview',
};

export interface NavCounts {
  applications: number;
  alerts: number;
  evc: number;
  compliance: number;
  documents: number;
}
