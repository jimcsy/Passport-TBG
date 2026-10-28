/** Canonical TBG department/position dictionary shared by the form and server validation. */
export const TBG_ORG = {
  "Audit Department": ["Internal Audit Manager", "Junior Risk Analyst", "Senior Audit Compliance Officer"],
  "Central Bakery": ["Quality Assurance Auditor"],
  "Central Kitchen": ["Quality Assurance Auditor", "Quality Assurance Officer"],
  "Data Privacy Department": ["Assistant to the DPO", "Vice President for DPO"],
  "Data Science Department": ["Data Analyst", "Marketing Analyst", "Marketing Data Analyst", "Operations Analyst", "Director for Data Science"],
  "ERP Department": ["Junior ERP Analyst", "Master Data Analyst", "Master Data Manager", "Master Data Supervisor", "Senior ERP Analyst", "Senior Masterdata Supervisor"],
  "Facilities & Engineering Department": [
    "Admin Assistant", "Aircon Technician", "Aircon Technician Helper", "Aircon Technician Team Leader",
    "Asst Mechanical Engr", "Director for Engineering and Facilities", "Driver/Safety Officer", "Engineering Manager",
    "Materials Management Personnel", "Project Manager", "Project Manager/Architect", "Project Manager/Engineer",
    "Quantity Surveyor Engineer", "Safety Officer", "Technical Admin Assistant"
  ],
  "Finance Department": [
    "Accounting Assistant", "Accounting Manager", "Accounts Payable Analyst", "Accounts Payable Manager", "Accounts Payable Supervisor",
    "AP Analyst", "AP Liaison Officer", "AP-Accounting Assistant", "AP-Accounts Payable Associate", "AP-Document Control Associate",
    "Chief Financial Officer", "Corporate Planning Manager", "CP-Corp Plan Analyst", "CTRL Controllership Analyst", "CTRL-Financial Reporting Analyst",
    "CTRL-General Accountant", "Director for Controllership", "Director for Internal Audit and Tax Compliance", "Disbursement Analyst",
    "Document Controller", "Financial Reporting Analyst", "Financial Reporting Manager", "Functional Analyst", "General Accountant",
    "GL- Accounting Assistant", "GL-GA Team Leader", "GL-General Accountant", "Group Controller", "Marketing Manager", "REV Accounting Assistant",
    "REV Revenue Analyst", "REV Revenue Officer", "REV-Accounting Manager", "REV-Revenue Associate", "Sales Audit Analyst", "Sales Audit Manager",
    "Senior Data Engineer (Manager)", "Shared Services Head", "TA-Compliance Officer", "TA-Document Control Associate", "TA Document Control Officer",
    "TA-Document and Tax Associate", "TA-Tax Compliance Associate", "Tax Compliance Manager", "TREAS Collection Associate", "TREAS Disbursement Supervisor",
    "TREAS Treasury Officer", "TREAS-Accounting Assistant", "TREAS-Accounts Payable Associate"
  ],
  "Franchising Department": ["Business Development Manager", "Business Development Officer", "VP for Business Development & Franchising"],
  "Human Resources Department": [
    "Admin Nurse", "Chief People and Culture Officer", "Cleaning Crew", "Compensation & Benefits Asst", "Compensation & Benefits Officer",
    "Compensation & Benefits Specialist", "Front Desk Receptionist", "Human Resources Manager", "Human Resources Officer", "Human Resources Specialist",
    "Payroll Manager", "Payroll Officer", "Payroll Specialist", "Recruitment Officer", "Recruitment Specialist", "Recruitment Specialist/EE"
  ],
  "ICT Department": [
    "Application Developer", "Applications & Integration Manager", "Business Applications and Integration Supervisor", "Functional Analyst",
    "Information Security Administrator", "IT Asset Management Administrator", "Operations Support", "Senior Network Administrator",
    "Support & Help Desk Manager", "Systems and Security Administrator", "Technical IT Manager", "Technical Support", "Technical Support Engineer",
    "TL-Technical Support Engineer"
  ],
  "Legal Department": ["Compliance Admin Assistant", "Compliance Associate", "Compliance Officer", "Legal Admin Officer", "Legal Director", "Regulatory & Compliance Manager"],
  "Marketing Department": [
    "Art Director", "Brand Marketing Manager", "Chief Marketing Officer", "Delivery Manager", "Delivery Officer", "Digital Marketing Manager",
    "Graphic Artist", "Graphic Designer", "Group Marketing Head", "Group Marketing Head-OIC", "Marketing Brand Manager", "Marketing Director",
    "Marketing Manager", "Marketing Officer", "Marketing Services Manager", "Multimedia Artist"
  ],
  "Office of the COO": ["Executive Assistant"],
  "Office of the President": ["Executive Assistant", "President"],
  "Operations Department": ["Quality Assurance Manager"],
  "Purchasing Department": [
    "Assistant Vice President for Supply Chain", "Director-Purchasing", "Project Site Coordinator", "Purchasing Assistant",
    "Purchasing Manager - Food", "Purchasing Manager Food Team", "Purchasing Manager-Non-Food", "Purchasing Officer",
    "Purchasing Officer-Sourcing Team", "Senior Purchasing Officer Food Team", "Sourcing Manager"
  ],
  "Training Department": ["Director for Training", "Learning and Development Manager", "Training Manager", "Training Officer", "Vice President for Training"]
} as const;

export type TbgDepartment = keyof typeof TBG_ORG;
export const TBG_DEPARTMENTS = Object.keys(TBG_ORG) as TbgDepartment[];
export function isTbgDepartment(value: string): value is TbgDepartment {
  return Object.prototype.hasOwnProperty.call(TBG_ORG, value);
}
export function positionsForDepartment(department: string): readonly string[] {
  return isTbgDepartment(department) ? TBG_ORG[department] : [];
}
