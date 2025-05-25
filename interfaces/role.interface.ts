export enum ERoleAction {
  CREATE = `C`, 
  READ = `R`, 
  UPDATE = `U`, 
  DELETE = `D`, 
}

export interface IRole {
  _id: string
  created_at: Date
  updated_at: Date

  collection_name: string
  action: string
}
