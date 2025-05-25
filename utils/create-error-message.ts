import { IAPIStatus } from "@/app/api/enums/api-status.enum";

export const createErrorMessage = (
  message: string = ``, 
  details: string = ``, 
  path: string = ``, 
  suggestion: string = ``, 
) => ({
  status: IAPIStatus.ERROR,
  error: {
    message: message,
    details: details,
    timestamp: new Date(),
    path: path,
    suggestion: suggestion
  }
});
