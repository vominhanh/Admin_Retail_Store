export const getSameDayOfYear = (date: Date, yearsToAdd: number): Date => {
  const retDate = new Date(+date);
  retDate.setFullYear(retDate.getFullYear() + yearsToAdd);
  
  const diff = date.getDay() - retDate.getDay();
  retDate.setDate(retDate.getDate() + diff);
  return retDate;
}
