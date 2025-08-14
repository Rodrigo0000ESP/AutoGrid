export interface Job {
  id: number;
  user_id: number;
  position: string;
  company: string;
  location: string | null;
  salary: string | null;
  job_type: 'Full-Time' | 'Part-Time' | 'Contract' | 'Freelance' | 'Internship' | 'Temporary' | 'Other' | null;
  status: 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Accepted' | 'Withdrawn';
  link: string | null;
  description: string | null;
  notes: string | null;
  date_added: string;
  date_modified: string;
}
