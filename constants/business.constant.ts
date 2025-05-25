import { IBusiness } from "@/interfaces/business.interface";

export const DEFAULT_BUSINESS: IBusiness = {
  _id: '',
  created_at: new Date(),
  updated_at: new Date(),
  name: '',
  address: '',
  email: '',
  phone: '',
  logo: '',
  logo_links: []
};
