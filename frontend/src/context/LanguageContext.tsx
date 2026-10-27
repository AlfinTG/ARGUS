import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  // Access bar
  govTitle: string;
  textSize: string;
  
  // Header
  brandTitle: string;
  brandSubtitle: string;
  modeDemo: string;
  simDate: string;
  role: string;
  liveApi: string;
  signedIn: string;
  signOut: string;
  
  // Banner
  bannerTitle: string;
  bannerText: string;
  
  // Navigation & Sections
  home: string;
  navOperations: string;
  navConfig: string;
  navOverview: string;
  navApplications: string;
  navCompliance: string;
  navEvc: string;
  navDocuments: string;
  navAlerts: string;
  navAudit: string;
  navRules: string;
  
  // Sidebar Footer
  helpdeskTitle: string;
  helpdeskPhone: string;
  helpdeskHours: string;
  
  // Screen Titles & Breadcrumbs
  overviewTitle: string;
  overviewDesc: string;
  applicationsTitle: string;
  applicationsDesc: string;
  caseTitle: string;
  caseDesc: string;
  complianceTitle: string;
  complianceDesc: string;
  evcTitle: string;
  evcDesc: string;
  documentsTitle: string;
  documentsDesc: string;
  alertsTitle: string;
  alertsDesc: string;
  auditTitle: string;
  auditDesc: string;
  rulesTitle: string;
  rulesDesc: string;
  
  // Overview Screen
  resetDemoBtn: string;
  runCycleBtn: string;
  kpiOpenApps: string;
  kpiOpenAppsSub: string;
  kpiOverdue: string;
  kpiOverdueSub: string;
  kpiDueSoon: string;
  kpiDueSoonSub: string;
  kpiEvc: string;
  kpiEvcSub: string;
  actionRequiredTitle: string;
  actionRequiredSubtitle: string;
  viewAllApps: string;
  colApplication: string;
  colInstitution: string;
  colCurrentStage: string;
  colOwner: string;
  colDeadline: string;
  colAction: string;
  btnViewCase: string;
  streamTitle: string;
  streamSubtitle: string;
  
  // Footer
  footerCopyright: string;
  footerAccessibility: string;
  footerPrivacy: string;
  footerTerms: string;
  footerContact: string;
  footerHelp: string;
}

const translations: Record<Language, Translations> = {
  en: {
    govTitle: 'भारत सरकार | Government of India',
    textSize: 'Text size',
    brandTitle: 'ARGUS',
    brandSubtitle: 'Approval & Compliance Intelligence Platform',
    modeDemo: 'Mode: Demo (synthetic data)',
    simDate: 'Sim date',
    role: 'Role',
    liveApi: 'Live API',
    signedIn: 'Signed in',
    signOut: 'Sign out',
    
    bannerTitle: 'Prototype simulation – not an official AICTE system.',
    bannerText: 'All records are synthetic; no real emails or SMS are sent.',
    
    home: 'Home',
    navOperations: 'Operations',
    navConfig: 'Configuration',
    navOverview: 'Overview',
    navApplications: 'Applications',
    navCompliance: 'Compliance',
    navEvc: 'EVC desk',
    navDocuments: 'Documents',
    navAlerts: 'Alerts',
    navAudit: 'Audit trail',
    navRules: 'Automation rules',
    
    helpdeskTitle: 'AICTE Helpdesk',
    helpdeskPhone: 'Toll-Free: 1800-11-2525',
    helpdeskHours: 'Mon-Fri 09:00 - 17:30 IST',
    
    overviewTitle: 'Approval operations',
    overviewDesc: 'Pending approval stages, statutory deadlines, EVC queues and escalations.',
    applicationsTitle: 'Case management',
    applicationsDesc: 'All active applications sorted by statutory priority.',
    caseTitle: 'Case progression & scrutiny',
    caseDesc: 'Full lifecycle dossier and scrutiny worksheet.',
    complianceTitle: 'Institutional obligations & undertakings',
    complianceDesc: 'Statutory compliance obligations due for verification.',
    evcTitle: 'Expert Visit Committee operations',
    evcDesc: 'Scheduling and reporting for on-site committee visits.',
    documentsTitle: 'Institutional document register',
    documentsDesc: 'Authenticated uploaded documents with validity tracking.',
    alertsTitle: 'Escalation & alert management',
    alertsDesc: 'Regulatory alerts triggered by the automation engine.',
    auditTitle: 'Immutable regulatory event stream',
    auditDesc: 'Non-repudiable chronological log of all system actions.',
    rulesTitle: 'Workflow policy & threshold configuration',
    rulesDesc: 'Configure thresholds and automation rule parameters.',
    
    resetDemoBtn: 'Reset demo',
    runCycleBtn: 'Run automation cycle',
    kpiOpenApps: 'Open applications',
    kpiOpenAppsSub: 'Across configured routes',
    kpiOverdue: 'Overdue items',
    kpiOverdueSub: 'Cases, compliance, documents',
    kpiDueSoon: 'Due / expiry watch',
    kpiDueSoonSub: 'Within active statutory window',
    kpiEvc: 'Open EVC tasks',
    kpiEvcSub: 'Scheduling or report review',
    actionRequiredTitle: 'Action required today',
    actionRequiredSubtitle: 'Sorted by statutory deadline, overdue first.',
    viewAllApps: 'View all applications',
    colApplication: 'Application',
    colInstitution: 'Institution',
    colCurrentStage: 'Current stage',
    colOwner: 'Owner',
    colDeadline: 'Deadline',
    colAction: 'Action',
    btnViewCase: 'View Case',
    streamTitle: 'Automation & audit stream',
    streamSubtitle: 'Real-time rule triggers & events',
    
    footerCopyright: '© Government of India. Content owned and maintained by All India Council for Technical Education (AICTE).',
    footerAccessibility: 'Accessibility',
    footerPrivacy: 'Privacy policy',
    footerTerms: 'Terms',
    footerContact: 'Contact',
    footerHelp: 'Help',
  },
  hi: {
    govTitle: 'भारत सरकार | All India Council for Technical Education',
    textSize: 'टेक्स्ट आकार',
    brandTitle: 'ARGUS',
    brandSubtitle: 'अनुमोदन एवं अनुपालन आसूचना मंच',
    modeDemo: 'मोड: डेमो (कृत्रिम डेटा)',
    simDate: 'सिम तिथि',
    role: 'भूमिका',
    liveApi: 'लाइव एपीआई',
    signedIn: 'साइन इन',
    signOut: 'साइन आउट',
    
    bannerTitle: 'प्रोटोटाइप सिमुलेशन – यह आधिकारिक AICTE प्रणाली नहीं है।',
    bannerText: 'सभी रिकॉर्ड कृत्रिम हैं; कोई वास्तविक ईमेल या एसएमएस नहीं भेजा जाता है।',
    
    home: 'मुख्य पृष्ठ',
    navOperations: 'संचालन',
    navConfig: 'कॉन्फ़िगरेशन',
    navOverview: 'अवलोकन',
    navApplications: 'आवेदन',
    navCompliance: 'अनुपालन',
    navEvc: 'ई.वी.सी. डेस्क',
    navDocuments: 'दस्तावेज़',
    navAlerts: 'अलर्ट',
    navAudit: 'ऑडिट ट्रेल',
    navRules: 'स्वचालन नियम',
    
    helpdeskTitle: 'एआईसीटीई सहायता केंद्र',
    helpdeskPhone: 'टोल-फ्री: 1800-11-2525',
    helpdeskHours: 'सोम-शुक्र 09:00 - 17:30 भारतीय मानक समय',
    
    overviewTitle: 'अनुमोदन संचालन',
    overviewDesc: 'लंबित अनुमोदन चरण, सांविधिक समय-सीमा, ई.वी.सी. कतारें एवं एस्केलेशन।',
    applicationsTitle: 'केस प्रबंधन',
    applicationsDesc: 'सांविधिक प्राथमिकता के अनुसार क्रमबद्ध सभी सक्रिय आवेदन।',
    caseTitle: 'केस प्रगति एवं संवीक्षा',
    caseDesc: 'पूर्ण जीवनचक्र डोजियर एवं संवीक्षा कार्यपत्रक।',
    complianceTitle: 'संस्थागत दायित्व एवं वचनबद्धता',
    complianceDesc: 'सत्यापन हेतु लंबित सांविधिक अनुपालन दायित्व।',
    evcTitle: 'विशेषज्ञ निरीक्षण समिति (EVC) संचालन',
    evcDesc: 'ऑन-साइट समिति निरीक्षणों का निर्धारण एवं रिपोर्टिंग।',
    documentsTitle: 'संस्थागत दस्तावेज़ रजिस्टर',
    documentsDesc: 'वैधता ट्रैकिंग के साथ प्रमाणित अपलोड किए गए दस्तावेज़।',
    alertsTitle: 'एस्केलेशन एवं अलर्ट प्रबंधन',
    alertsDesc: 'स्वचालन इंजन द्वारा ट्रिगर की गई विनियामक चेतावनियां।',
    auditTitle: 'अपरिवर्तनीय नियामक घटना स्ट्रीम',
    auditDesc: 'सभी सिस्टम कार्रवाइयों का गैर-अस्वीकार्य कालानुक्रमिक लॉग।',
    rulesTitle: 'कार्यप्रवाह नीति एवं सीमा विन्यास',
    rulesDesc: 'सीमाएं और स्वचालन नियम पैरामीटर कॉन्फ़िगर करें।',
    
    resetDemoBtn: 'डेमो रीसेट करें',
    runCycleBtn: 'स्वचालन चक्र चलाएं',
    kpiOpenApps: 'सक्रिय आवेदन',
    kpiOpenAppsSub: 'कॉन्फ़िगर किए गए मार्गों पर',
    kpiOverdue: 'विलंबित मदें',
    kpiOverdueSub: 'केस, अनुपालन, दस्तावेज़',
    kpiDueSoon: 'नियत / समाप्ति निगरानी',
    kpiDueSoonSub: 'सक्रिय सांविधिक विंडो के भीतर',
    kpiEvc: 'लंबित ई.वी.सी. कार्य',
    kpiEvcSub: 'निर्धारण या रिपोर्ट समीक्षा',
    actionRequiredTitle: 'आज आवश्यक कार्रवाई',
    actionRequiredSubtitle: 'सांविधिक समय-सीमा के अनुसार क्रमबद्ध, विलंबित पहले।',
    viewAllApps: 'सभी आवेदन देखें',
    colApplication: 'आवेदन',
    colInstitution: 'संस्थान',
    colCurrentStage: 'वर्तमान चरण',
    colOwner: 'प्रभारी',
    colDeadline: 'समय-सीमा',
    colAction: 'कार्रवाई',
    btnViewCase: 'केस देखें',
    streamTitle: 'स्वचालन एवं ऑडिट स्ट्रीम',
    streamSubtitle: 'वास्तविक समय नियम ट्रिगर और घटनाएं',
    
    footerCopyright: '© भारत सरकार। सामग्री का स्वामित्व और रखरखाव अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE) द्वारा।',
    footerAccessibility: 'सुलभता',
    footerPrivacy: 'गोपनीयता नीति',
    footerTerms: 'नियम व शर्तें',
    footerContact: 'संपर्क',
    footerHelp: 'सहायता',
  },
};

const LANG_STORAGE_KEY = 'argus_app_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'hi') return saved;
    } catch {
      // fallback
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: keyof Translations): string => {
      return translations[language][key] || translations.en[key] || String(key);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
