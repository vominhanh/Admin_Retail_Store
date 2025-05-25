import { ERoleAction, IRole } from "@/interfaces/role.interface";
import { RoleModel } from "@/models";

export const isExistRolesWithActionAndCollectionName = async (
  role: IRole
): Promise<boolean> => {
  const existRoleWithActionAndCollectionName: IRole[] = await RoleModel.find({
    collection_name: role.collection_name, 
    action: role.action, 
  });

  if ( existRoleWithActionAndCollectionName.length > 0 ) 
    return true;

  return false;
}

export const isRoleActionValid = (role: IRole): boolean => 
  Object.values(ERoleAction).includes(role.action as ERoleAction);
