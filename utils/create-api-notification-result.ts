import { EStatusCode } from "@/enums/status-code.enum";
import { reloadPage } from "./reload-page";

export enum ENotificationPlacement {
  TOP_RIGHT = `topRight`, 
  TOP = `top`, 
  TOP_LEFT = `topLeft`, 
  BOTTOM_RIGHT = `bottomRight`, 
  BOTTOM = `bottom`, 
  BOTTOM_LEFT = `bottomLeft`, 
}

export enum EAction {
  NONE = ``, 
  CREATE = `Create`, 
  UPDATE = `Update`, 
  DELETE = `Delete`, 
}

export const createApiNotificationResult = (
  // notificationService: NotificationInstance, 
  status: EStatusCode, 
  // name: string = ``, 
  // action: EAction = EAction.CREATE, 
  // placement: ENotificationPlacement = ENotificationPlacement.TOP_RIGHT, 
  shouldReloadPage: boolean = false, 
): void => {
  switch (status) {
    case EStatusCode.OK:
      // notificationService.success({
      //   message: `${action} ${name} Successfully!`,
      //   placement: placement, 
      // });

      if (shouldReloadPage)
        reloadPage();

      break;

    case EStatusCode.CREATED:
      // notificationService.success({
      //   message: `${EAction.CREATE} ${name} Successfully!`,
      //   placement: placement, 
      // });

      if (shouldReloadPage)
        reloadPage();

      break;

    case EStatusCode.UNPROCESSABLE_ENTITY:
      // notificationService.error({
      //   message: `${action} ${name} Failed! Unprocessable Entity.`,
      //   placement: placement, 
      // });
      break;

    case EStatusCode.INTERNAL_SERVER_ERROR:
      // notificationService.error({
      //   message: `${action} ${name} Failed! Internal Server Error.`,
      //   placement: placement,
      // });
      break;

    default:
      // notificationService.error({
      //   message: `${action} ${name} Failed! Unknown Error.`,
      //   placement: placement,
      // });
  }
}
