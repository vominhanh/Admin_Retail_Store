import { ETerminal } from "@/enums/terminal.enum";

export const print = (text: string, color: ETerminal): void => {
  console.log(`${color}%s${ETerminal.Reset}`, text);
}
