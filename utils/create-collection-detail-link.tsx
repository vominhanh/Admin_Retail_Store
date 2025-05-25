import { ReactElement } from "react";
import { nameToHyphenAndLowercase } from "./name-to-hyphen-and-lowercase";
import { ECollectionNames } from "@/enums";
import { IconContainer } from "@/components";
import { createMoreInfoTooltip } from "./create-tooltip";
import { externalLinkIcon } from "@/public";

export const createCollectionDetailLink = (
  collectionName: ECollectionNames,
  id: string
): ReactElement => {

  let targetUrl = '';

  // Kiểm tra nếu collectionName không tồn tại
  if (!collectionName) {
    targetUrl = '/home';
  } else {
    targetUrl = `/home/${nameToHyphenAndLowercase(collectionName)}/${id}`;

    if (collectionName === ECollectionNames.PRODUCT_DETAIL) {
      targetUrl = `/home/product/${id}`;
    }
  }

  return (
    <a
      href={targetUrl}
    >
      <IconContainer
        tooltip={createMoreInfoTooltip(collectionName)}
        iconLink={externalLinkIcon}
      >
      </IconContainer>
    </a>
  );
}