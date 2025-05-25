import { ROOT } from "@/constants/root.constant";
import { ECollectionNames } from "@/enums";
import { ERoleAction } from "@/interfaces/role.interface";

export const login = async (
  username: string, password: string
): Promise<Response> => 
  await fetch(`${ROOT}/auth/login`, {
    method: `POST`,
    body: JSON.stringify({
      username: username, password: password, 
    }),
  });

export const logout = async (): Promise<Response> => 
  await fetch(`${ROOT}/auth/logout`);

export const me = async (): Promise<Response> => await fetch(`${ROOT}/auth/me`);

export const auth = async (
  action: ERoleAction, 
  collectionName: ECollectionNames, 
): Promise<Response> => await fetch(`${ROOT}/auth`, {
  method: `POST`, 
  body: JSON.stringify({
    action, 
    collectionName, 
  }), 
});
